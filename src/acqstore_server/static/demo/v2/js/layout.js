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
} from './dom.js';
import {createImageViewport} from './viewport.js';
import {drawScanPathOverlay} from './scan-path.js';
import {drawAxisLabels} from './axes.js';
import {renderPlaneBitmap, renderCompositeBitmap} from './render.js';

function destroyActiveViews() {
  state.activeViews.forEach(view => view.viewport?.destroy());
  state.activeViews = [];
  for (const group of Object.keys(state.compositeSlots)) {
    state.compositeSlots[group]?.viewport?.destroy();
    state.compositeSlots[group] = null;
  }
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

  if (compositeEnabled(group) && compositePair(group)) {
    const [first, second] = compositePair(group);
    const card = document.createElement('article');
    card.className = 'card';
    const title = document.createElement('h2');
    title.textContent = group === 'source' ? 'Source composite' : 'Reference composite';
    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent =
      `Channel ${first.channelIndex} (green) · Channel ${second.channelIndex} (magenta)`;
    const wrap = document.createElement('div');
    wrap.className = 'canvas-wrap';
    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    card.append(title, meta, wrap);
    container.appendChild(card);
    state.compositeSlots[group] = {
      canvas,
      viewport: null,
      axes: first.axes,
      scanPath: first.scanPath,
      lineRoi: first.lineRoi,
    };
    return;
  }

  for (const view of views) {
    const card = document.createElement('article');
    card.className = 'card';
    const title = document.createElement('h2');
    title.textContent = view.label;
    const wrap = document.createElement('div');
    wrap.className = 'canvas-wrap';
    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    card.append(title, wrap);
    container.appendChild(card);
    view.canvas = canvas;
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
  destroyActiveViews,
  groupViews,
  updateCompositeControls,
  updateAxesControls,
  mountGroupLayout,
  redrawGroupDisplay,
  drawChannelView,
  redrawAxesOnly,
  resizeAllViewports,
  onCompositeChange,
};
