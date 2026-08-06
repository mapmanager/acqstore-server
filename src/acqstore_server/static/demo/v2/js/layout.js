// Session view layout, composite mounting, and channel draw orchestration.
import {state} from './state.js';
import {
  channelsEl,
  referencesEl,
  sourceComposite,
  referenceComposite,
  sourceCompositeControl,
  referenceCompositeControl,
  sourceAxes,
  referenceAxes,
  sourceAxesControl,
  referenceAxesControl,
  showScanPath,
  sourcePlaneMeta,
  referencePlaneMeta,
} from './dom.js';
import {createImageViewport} from './viewport.js';
import {drawScanPathOverlay} from './scan-path.js';
import {drawAxisLabels} from './axes.js';
import {renderPlaneBitmap, renderCompositeBitmap} from './render.js';
import {createSavePngButton} from './save-png.js';

/** Bound from app.js after createContrastController (avoids circular init). */
let contrastUi = null;

function bindContrastUi(api) {
  contrastUi = api;
}

function createCardToolbar(parts) {
  const toolbar = document.createElement('div');
  toolbar.className = 'card-toolbar';
  toolbar.append(...parts);
  return toolbar;
}

function formatStepValue(value) {
  if (!Number.isFinite(value)) return '—';
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude < 1e-6 || magnitude >= 1e6)) {
    return value.toExponential(6);
  }
  // Light trim only — value is the JSON step, never size×step.
  return String(Number(value.toPrecision(8)));
}

/** Compact unit label for the plane-meta row (keeps time units; unlike tick gutters). */
function metaUnitLabel(unit) {
  const compact = String(unit || '').trim().toLowerCase();
  if (['s', 'sec', 'second', 'seconds'].includes(compact)) return 's';
  if (['ms', 'millisecond', 'milliseconds'].includes(compact)) return 'ms';
  if (['um', 'µm', 'micrometer', 'micrometers', 'micrometre', 'micrometres'].includes(compact)) {
    return 'µm';
  }
  return String(unit || '').trim();
}

/**
 * Build section-heading meta: "| <px> | <step0 unit0 × step1 unit1> | <labels>".
 * Reads plane.axes / reference.plane.axes via view.axes (dim0 then dim1). No size×step.
 */
function formatPlaneMetaText(view) {
  const axes = view?.axes || {};
  // displayAxesFromPlane: axes.x ← dim0, axes.y ← dim1 (Open response plane.axes order).
  const dim0 = axes.x;
  const dim1 = axes.y;
  const size0 = Number(dim0?.size);
  const size1 = Number(dim1?.size);
  const pixels = (size0 > 0 && size1 > 0)
    ? `${size0}×${size1} px`
    : '—';

  const step0 = Number(dim0?.step);
  const step1 = Number(dim1?.step);
  const unit0 = metaUnitLabel(dim0?.unit);
  const unit1 = metaUnitLabel(dim1?.unit);
  let physical = '—';
  if (Number.isFinite(step0) || Number.isFinite(step1)) {
    const s0 = Number.isFinite(step0) ? formatStepValue(step0) : '—';
    const s1 = Number.isFinite(step1) ? formatStepValue(step1) : '—';
    if (unit0 && unit1 && unit0 === unit1 && Number.isFinite(step0) && Number.isFinite(step1)) {
      physical = `${s0}×${s1} ${unit0}`;
    } else {
      const p0 = Number.isFinite(step0) ? (unit0 ? `${s0} ${unit0}` : s0) : '—';
      const p1 = Number.isFinite(step1) ? (unit1 ? `${s1} ${unit1}` : s1) : '—';
      physical = `${p0} × ${p1}`;
    }
  }

  const name0 = String(dim0?.name || '').trim();
  const name1 = String(dim1?.name || '').trim();
  const labels = (name0 || name1) ? `${name0 || '—'} / ${name1 || '—'}` : '—';
  return `| ${pixels} | ${physical} | ${labels}`;
}

function updateGroupPlaneMeta(group) {
  const el = group === 'source' ? sourcePlaneMeta : referencePlaneMeta;
  if (!el) return;
  const views = groupViews(group);
  if (views.length === 0) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.textContent = formatPlaneMetaText(views[0]);
  el.hidden = false;
}

function updatePlaneMeta() {
  updateGroupPlaneMeta('source');
  updateGroupPlaneMeta('reference');
}

function destroyActiveViews() {
  state.activeViews.forEach(view => view.viewport?.destroy());
  state.activeViews = [];
  state.loadedSourceName = null;
  for (const group of Object.keys(state.compositeSlots)) {
    state.compositeSlots[group]?.viewport?.destroy();
    state.compositeSlots[group] = null;
  }
  updatePlaneMeta();
}
function groupViews(group) {
  return state.activeViews
    .filter(view => view.group === group)
    .slice()
    .sort((a, b) => a.channelIndex - b.channelIndex);
}
function compositeEnabled(group) {
  return group === 'source' ? sourceComposite.checked : referenceComposite.checked;
}
function compositePair(group) {
  const views = groupViews(group);
  if (views.length < 2) return null;
  const [first, second] = views;
  const [rows, cols] = first.displayShape;
  if (second.displayShape[0] !== rows || second.displayShape[1] !== cols) return null;
  return [first, second];
}
function updateCompositeControls() {
  for (const [group, control, checkbox] of [
    ['source', sourceCompositeControl, sourceComposite],
    ['reference', referenceCompositeControl, referenceComposite],
  ]) {
    const views = groupViews(group);
    const canComposite = views.length >= 2 && Boolean(compositePair(group));
    control.hidden = !canComposite;
    checkbox.disabled = !canComposite;
    if (!canComposite) checkbox.checked = false;
  }
}
function axesEnabled(group) {
  return group === 'source' ? sourceAxes.checked : referenceAxes.checked;
}
function updateAxesControls() {
  const sourceHas = groupViews('source').length > 0;
  const referenceHas = groupViews('reference').length > 0;
  sourceAxesControl.hidden = !sourceHas;
  referenceAxesControl.hidden = !referenceHas;
  if (!sourceHas) sourceAxes.checked = false;
  if (!referenceHas) referenceAxes.checked = false;
}
function destroyGroupViewports(group) {
  groupViews(group).forEach(view => {
    view.viewport?.destroy();
    view.viewport = null;
    view.canvas = null;
  });
  state.compositeSlots[group]?.viewport?.destroy();
  state.compositeSlots[group] = null;
}
function mountGroupLayout(group) {
  const container = group === 'source' ? channelsEl : referencesEl;
  const views = groupViews(group);
  destroyGroupViewports(group);
  container.replaceChildren();
  if (views.length === 0) return;
  if (!contrastUi) throw new Error('Contrast UI not bound');

  if (compositeEnabled(group) && compositePair(group)) {
    const [first, second] = compositePair(group);
    const card = document.createElement('article');
    card.className = 'card';
    const wrap = document.createElement('div');
    wrap.className = 'canvas-wrap';
    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    const slot = {
      canvas,
      viewport: null,
      axes: first.axes,
      scanPath: first.scanPath,
      lineRoi: first.lineRoi,
    };
    const saveBtn = createSavePngButton({
      canvas,
      getViewport: () => slot.viewport,
      group,
      composite: true,
    });
    card.append(
      createCardToolbar([
        contrastUi.createContrastRow(first),
        contrastUi.createContrastRow(second),
        saveBtn,
      ]),
      wrap,
    );
    container.appendChild(card);
    state.compositeSlots[group] = slot;
    return;
  }

  for (const view of views) {
    const card = document.createElement('article');
    card.className = 'card';
    const wrap = document.createElement('div');
    wrap.className = 'canvas-wrap';
    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    view.canvas = canvas;
    const saveBtn = createSavePngButton({
      canvas,
      getViewport: () => view.viewport,
      group: view.group,
      channelIndex: view.channelIndex,
    });
    card.append(
      createCardToolbar([contrastUi.createContrastRow(view), saveBtn]),
      wrap,
    );
    container.appendChild(card);
  }
}
function redrawGroupDisplay(group, opts={}) {
  if (compositeEnabled(group) && compositePair(group)) {
    drawGroupComposite(group, opts);
    return;
  }
  groupViews(group).forEach(view => drawChannelView(view, opts));
}
function ensureImageViewport(target, {canvas, group, getScanPath, getLineRoi, getAxes}) {
  if (target.viewport) return target.viewport;
  target.viewport = createImageViewport(canvas, {
    getOverlay(ctx, viewScale) {
      if (group !== 'reference' || !showScanPath.checked) return;
      const scale = typeof viewScale === 'number'
        ? viewScale
        : Math.min(viewScale?.scaleX || 1, viewScale?.scaleY || 1);
      drawScanPathOverlay(ctx, getScanPath(), getLineRoi(), scale);
    },
    getAxisLabels(ctx, drawState) {
      if (!axesEnabled(group)) return;
      drawAxisLabels(ctx, {...drawState, axes: getAxes()});
    },
  });
  return target.viewport;
}
function drawChannelView(view, opts={}) {
  if (compositeEnabled(view.group) && compositePair(view.group)) {
    drawGroupComposite(view.group, opts);
    return;
  }
  if (!view.canvas) return;
  const bitmap = renderPlaneBitmap(view.values, view.displayShape, view.display);
  ensureImageViewport(view, {
    canvas: view.canvas,
    group: view.group,
    getScanPath: () => view.scanPath,
    getLineRoi: () => view.lineRoi,
    getAxes: () => view.axes,
  });
  view.viewport.setImage(bitmap, {resetView: opts.resetView !== false});
}
function drawGroupComposite(group, opts={}) {
  const pair = compositePair(group);
  const slot = state.compositeSlots[group];
  if (!pair || !slot?.canvas) return;
  const bitmap = renderCompositeBitmap(pair[0], pair[1]);
  ensureImageViewport(slot, {
    canvas: slot.canvas,
    group,
    getScanPath: () => slot.scanPath,
    getLineRoi: () => slot.lineRoi,
    getAxes: () => slot.axes,
  });
  slot.viewport.setImage(bitmap, {resetView: opts.resetView !== false});
}
function redrawAxesOnly(group) {
  if (compositeEnabled(group) && state.compositeSlots[group]?.viewport) {
    state.compositeSlots[group].viewport.redraw();
    return;
  }
  groupViews(group).forEach(view => view.viewport?.redraw());
}
function resizeAllViewports() {
  state.activeViews.forEach(view => view.viewport?.resize());
  state.compositeSlots.source?.viewport?.resize();
  state.compositeSlots.reference?.viewport?.resize();
}
function onCompositeChange(group) {
  mountGroupLayout(group);
  redrawGroupDisplay(group, {resetView:true});
  resizeAllViewports();
}

export {
  bindContrastUi,
  destroyActiveViews,
  groupViews,
  updateCompositeControls,
  updateAxesControls,
  updatePlaneMeta,
  mountGroupLayout,
  redrawGroupDisplay,
  drawChannelView,
  redrawAxesOnly,
  resizeAllViewports,
  onCompositeChange,
};
