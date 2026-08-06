/*!
 * AcqStore Reference View drop-in (graft-kit / owned artifact).
 *
 * Provenance (one-time package for Phase B):
 *   Host adapter + LLM_COPY viewer core extracted from
 *   linescan_analyzer_v1_18_acqstore_v2_e.html DROPIN JS
 *   (itself derived from static/demo/v2/archive/index.monolith.html markers).
 *
 * Graft rules:
 *   - Inline this file into the output monolith <script> (file:// safe).
 *   - Reference UI is a collapsible disclosure card — NOT demo split-pane.
 *   - Do not reinvent viewport / axes / contrast / Save PNG.
 */
(function (global) {
'use strict';

const DEFAULT_API_BASE = 'http://127.0.0.1:8767';
let apiBase = DEFAULT_API_BASE;
let mounted = false;
let contrastController = null;
let collapseBound = false;

const state = {
  currentSessionId: null,
  loadedSourceName: null,
  activeViews: [],
  compositeSlots: { source: null, reference: null },
};

let channelsEl, referencesEl, referenceEmptyEl;
let scanPathControl, showScanPath;
let sourceCompositeControl, sourceComposite;
let referenceCompositeControl, referenceComposite;
let sourceAxesControl, sourceAxes;
let referenceAxesControl, referenceAxes;

function $(id) { return document.getElementById(id); }

function injectCssOnce() {
  if (document.getElementById('acqstore-reference-view-css')) return;
  const link = document.createElement('link');
  link.id = 'acqstore-reference-view-css';
  link.rel = 'stylesheet';
  // Prefer sibling CSS next to this script; fall back to server static path.
  const scripts = document.getElementsByTagName('script');
  let base = '';
  for (let i = scripts.length - 1; i >= 0; i--) {
    const src = scripts[i].src || '';
    if (src.includes('acqstore-reference-view.js')) {
      base = src.replace(/[^/]+$/, '');
      break;
    }
  }
  link.href = (base || (apiBase.replace(/\/$/, '') + '/demo/v2/dropin/')) + 'acqstore-reference-view.css';
  document.head.appendChild(link);
}

function hostHtml() {
  return `
<section class="card collapsible collapsed acqstore-ref-root" id="acqstoreReferenceCard">
  <h2>Reference Images</h2>
  <div class="acqstore-ref-controls section-heading">
    <label id="referenceCompositeControl" class="toggle" hidden>
      <input id="referenceComposite" type="checkbox">
      Composite
    </label>
    <label id="scanPathControl" class="toggle" hidden>
      <input id="showScanPath" type="checkbox" checked>
      Show scan path
    </label>
    <label id="referenceAxesControl" class="toggle" hidden>
      <input id="referenceAxes" type="checkbox">
      Axes
    </label>
  </div>
  <div id="referenceContrast" class="card contrast-panel" hidden></div>
  <div id="references" class="grid acqstore-ref-grid"></div>
  <p id="acqstoreRefEmpty" class="meta" hidden>No reference image loaded.</p>
</section>
<div id="acqstoreRefRangePopover" class="range-popover" hidden role="dialog" aria-label="Reference display range">
  <h2 id="acqstoreRefRangeTitle">Display range</h2>
  <div class="histogram-wrap">
    <canvas id="acqstoreRefRangeHistogram" width="300" height="100"></canvas>
  </div>
  <div class="range-fields">
    <label>Min <input id="acqstoreRefRangeMin" type="number" step="any"></label>
    <label>Max <input id="acqstoreRefRangeMax" type="number" step="any"></label>
    <button id="acqstoreRefRangeAuto" type="button">Auto</button>
  </div>
</div>
<div id="acqstoreRefShims" aria-hidden="true">
  <div id="channels" class="grid"></div>
  <div id="sourceContrast" class="card contrast-panel" hidden></div>
  <label id="sourceCompositeControl" class="toggle" hidden><input id="sourceComposite" type="checkbox"></label>
  <label id="sourceAxesControl" class="toggle" hidden><input id="sourceAxes" type="checkbox"></label>
</div>`;
}

function bindDom() {
  channelsEl = $('channels');
  referencesEl = $('references');
  referenceEmptyEl = $('acqstoreRefEmpty');
  scanPathControl = $('scanPathControl');
  showScanPath = $('showScanPath');
  sourceCompositeControl = $('sourceCompositeControl');
  sourceComposite = $('sourceComposite');
  referenceCompositeControl = $('referenceCompositeControl');
  referenceComposite = $('referenceComposite');
  sourceAxesControl = $('sourceAxesControl');
  sourceAxes = $('sourceAxes');
  referenceAxesControl = $('referenceAxesControl');
  referenceAxes = $('referenceAxes');
}

/* ==== LLM_COPY:REFERENCE_VIEW_JS (from monolith) BEGIN ==== */
// =====================================================================
// AUTHORITATIVE Reference / channel image viewer — COPY VERBATIM into grafts.
// Do not invent a simpler viewport, axes, or Save PNG.
//
// REQUIRED BEHAVIOR (exact product spec):
// 1) N reference.channels => N canvas panels when Composite OFF; N contrast rows.
// 2) Each panel title row = label + Save PNG (createSavePngButton / createCardTitleRow).
// 3) Orientation: (i) transposePlane then (ii) Y-flip in createImageViewport.draw
//    (ctx.scale(scaleX, -scaleY)). Both required.
// 4) Axes ON => drawAxisLabels: numeric tick labels + unit. Use the SAME
//    minMajorPx / minMinorPx for X and Y so square images get matching tick
//    density on bottom and left.
// 5) Interactions: wheel zoom, Shift+drag pan, double-click home, click+drag
//    zoom box / region zoom (createImageViewport).
// 6) Contrast: one row [label][LUT select][Range…] + log histogram popover.
// 7) After first setImage/mount: call resize on next animation frame(s) so the
//    first reference panel is not offset when the split layout settles.
// =====================================================================
// --- session view state ---
function destroyActiveViews() {
  state.activeViews.forEach(view => view.viewport?.destroy());
  state.activeViews = [];
  state.loadedSourceName = null;
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
// --- plane / orientation / axes ---
/*
 * Display orientation invariants (keep in sync):
 * 1) API plane is row-major [dim0, dim1]; server never transposes.
 * 2) Client transposePlane() before canvas: display width ← dim0, height ← dim1.
 * 3) Axis mapping: X ← dim0, Y ← dim1 (see displayAxesFromPlane).
 * 4) Viewport draw flips Y so physical 0 is at the image bottom (plot-style).
 */
function displayAxesFromPlane(plane) {
  const byDim = {};
  for (const axis of plane.axes || []) byDim[axis.arrayDimension] = axis;
  // transposePlane maps display width ← dim0 and display height ← dim1.
  return {x: byDim[0] || null, y: byDim[1] || null};
}
function axisExtent(axis) {
  const step = Number(axis?.step);
  const size = Number(axis?.size);
  if (!(step > 0) || !(size > 0)) return null;
  return {step, size, max: size * step, unit: String(axis.unit || '').trim()};
}
function chooseAxisStep(span, pixelSpan, minSpacingPx, steps) {
  span = Math.max(1e-12, Math.abs(span) || 0);
  pixelSpan = Math.max(1, pixelSpan || 1);
  const required = minSpacingPx / Math.max(1e-12, pixelSpan / span);
  let step = steps.find(candidate => candidate >= required);
  if (!(step > 0)) step = 10 ** Math.ceil(Math.log10(required));
  while (Math.ceil(span / step) > 500) step *= 2;
  return step;
}
function chooseAxisMinorStep(span, pixelSpan, majorStep, minSpacingPx, steps) {
  const pxPerUnit = Math.max(1, pixelSpan) / Math.max(1e-12, Math.abs(span));
  let best = null;
  for (const candidate of steps) {
    if (candidate >= majorStep - 1e-12) break;
    const ratio = majorStep / candidate;
    const rounded = Math.round(ratio);
    if (candidate * pxPerUnit + 1e-9 < minSpacingPx) continue;
    if (Math.abs(ratio - rounded) > 1e-6 || rounded < 2 || rounded > 10) continue;
    best = candidate;
  }
  return best;
}
function alignedAxisTicks(start, end, step) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || !(step > 0)) return [];
  if (end < start) [start, end] = [end, start];
  const eps = step * 1e-8;
  const ticks = [];
  for (let value = Math.ceil((start - eps) / step) * step; value <= end + eps && ticks.length < 500; value += step) {
    ticks.push(Math.abs(value) < eps ? 0 : value);
  }
  return ticks;
}
function axisTickDecimals(step) {
  if (step >= 1) return 0;
  if (step >= 0.1) return 1;
  if (step >= 0.01) return 2;
  if (step >= 0.001) return 3;
  return 4;
}
function formatAxisTick(value, step, unit='') {
  const decimals = axisTickDecimals(step);
  const normalized = Math.abs(value) < 1e-12 ? 0 : Number(value.toFixed(decimals));
  const compact = String(unit || '').trim().toLowerCase();
  if (['s', 'sec', 'second', 'seconds'].includes(compact)) return `${normalized}s`;
  if (['ms', 'millisecond', 'milliseconds'].includes(compact)) return `${normalized}ms`;
  return String(normalized);
}
function axisUnitLabel(unit) {
  const compact = String(unit || '').trim().toLowerCase();
  if (['s', 'sec', 'second', 'seconds', 'ms', 'millisecond', 'milliseconds'].includes(compact)) return '';
  if (['um', 'µm', 'micrometer', 'micrometers', 'micrometre', 'micrometres'].includes(compact)) return 'µm';
  return String(unit || '').trim();
}
const AXIS_TICK_STEPS = [
  0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5,
  1, 2, 5, 10, 20, 30, 50, 100, 200, 500, 1000,
];
function adaptiveAxisTicks(maxValue, pixelSpan, opts={}) {
  const span = Math.max(1e-12, maxValue);
  const majorStep = chooseAxisStep(span, pixelSpan, opts.minMajorPx ?? 56, AXIS_TICK_STEPS);
  const minorStep = chooseAxisMinorStep(span, pixelSpan, majorStep, opts.minMinorPx ?? 14, AXIS_TICK_STEPS);
  const major = alignedAxisTicks(0, maxValue, majorStep);
  const minor = minorStep
    ? alignedAxisTicks(0, maxValue, minorStep).filter(value => {
      const q = value / majorStep;
      return Math.abs(q - Math.round(q)) > 1e-6;
    })
    : [];
  return {major, minor, majorStep, minorStep};
}
function drawAxisLabels(ctx, state) {
  const axes = state.axes;
  if (!axes?.x && !axes?.y) return;
  const {imageWidth, imageHeight, scaleX, scaleY, offsetX, offsetY} = state;
  // Image rectangle in screen space; frame + labels/ticks stay in gutters (no lines through pixels).
  const left = offsetX;
  const top = offsetY;
  const right = offsetX + imageWidth * scaleX;
  const bottom = offsetY + imageHeight * scaleY;
  const widthPx = Math.max(1, right - left);
  const heightPx = Math.max(1, bottom - top);
  const xMeta = axisExtent(axes.x);
  const yMeta = axisExtent(axes.y);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = '10px system-ui,sans-serif';
  ctx.lineWidth = 1;

  // Frame is part of Axes chrome (gated by the same checkbox as this draw path).
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
  ctx.strokeRect(left + 0.5, top + 0.5, Math.max(0, widthPx - 1), Math.max(0, heightPx - 1));

  if (xMeta) {
    // Same spacing policy as Y so square plots get matching tick density.
    const ticks = adaptiveAxisTicks(xMeta.max, widthPx, {minMajorPx: 48, minMinorPx: 14});
    const xAt = value => left + (value / xMeta.step) * scaleX;
    // Outside stubs only — no vertical grid through the image.
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.34)';
    for (const value of ticks.minor) {
      const x = xAt(value);
      if (x < left - 0.5 || x > right + 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(x, bottom);
      ctx.lineTo(x, bottom + 4);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.55)';
    for (const value of ticks.major) {
      const x = xAt(value);
      if (x < left - 0.5 || x > right + 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(x, bottom);
      ctx.lineTo(x, bottom + 6);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(203, 213, 225, 0.84)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const value of ticks.major) {
      const x = xAt(value);
      if (x < left - 0.5 || x > right + 0.5) continue;
      const label = formatAxisTick(value, ticks.majorStep, xMeta.unit);
      const labelX = clamp(x, left + 2, right - 2);
      ctx.fillText(label, labelX, bottom + 7);
    }
    const unit = axisUnitLabel(xMeta.unit);
    if (unit) {
      ctx.textAlign = 'right';
      ctx.fillText(unit, right, bottom + 7);
    }
  }

  if (yMeta) {
    const ticks = adaptiveAxisTicks(yMeta.max, heightPx, {minMajorPx: 48, minMinorPx: 14});
    // Plot-style Y after display transpose: 0 at the image bottom, max at the top.
    const yAt = value => bottom - (value / yMeta.step) * scaleY;
    // Outside stubs only — no horizontal grid through the image.
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.34)';
    for (const value of ticks.minor) {
      const y = yAt(value);
      if (y < top - 0.5 || y > bottom + 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(left - 4, y);
      ctx.lineTo(left, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.55)';
    for (const value of ticks.major) {
      const y = yAt(value);
      if (y < top - 0.5 || y > bottom + 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(left - 6, y);
      ctx.lineTo(left, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(203, 213, 225, 0.84)';
    const unit = axisUnitLabel(yMeta.unit);
    if (unit) {
      // Unit sits in the left gutter, above the tick column (outside pixels).
      ctx.textBaseline = 'top';
      ctx.textAlign = 'right';
      ctx.fillText(unit, left - 8, top + 2);
    }
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (const value of ticks.major) {
      const y = yAt(value);
      if (y < top - 0.5 || y > bottom + 0.5) continue;
      ctx.fillText(formatAxisTick(value, ticks.majorStep, yMeta.unit), left - 8, y);
    }
  }
  ctx.restore();
}
// --- layout mount ---
function destroyGroupViewports(group) {
  groupViews(group).forEach(view => {
    view.viewport?.destroy();
    view.viewport = null;
    view.canvas = null;
  });
  state.compositeSlots[group]?.viewport?.destroy();
  state.compositeSlots[group] = null;
}

// --- save png (on-screen canvas) ---
function sourceFileLabel(source) {
  const raw = source?.name || source?.path || source?.uri || 'acquisition';
  const s = String(raw);
  const slash = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
  return (slash >= 0 ? s.slice(slash + 1) : s) || 'acquisition';
}
function suggestedPngName(opts) {
  const stem = state.loadedSourceName || 'acquisition';
  const isRef = opts.group === 'reference';
  if (opts.composite) return isRef ? `${stem}_ref.composite.png` : `${stem}.composite.png`;
  const index = Number.isInteger(opts.channelIndex) ? opts.channelIndex : 0;
  return isRef ? `${stem}_ref.ch${index}.png` : `${stem}.ch${index}.png`;
}
async function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encode failed'))), 'image/png');
  });
}
async function savePngBlob(blob, suggestedName) {
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{description: 'PNG image', accept: {'image/png': ['.png']}}],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = suggestedName;
  anchor.click();
  URL.revokeObjectURL(url);
}
async function saveDisplayCanvasPng(canvas, opts) {
  if (!canvas) throw new Error('No canvas to save');
  opts.viewport?.redraw?.();
  const suggestedName = suggestedPngName(opts);
  const blob = await canvasToPngBlob(canvas);
  await savePngBlob(blob, suggestedName);
}
function createSavePngButton({canvas, getViewport, group, channelIndex, composite=false}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'save-png-btn';
  button.textContent = 'Save PNG';
  button.title = 'Save the image as currently shown';
  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      button.disabled = true;
      await saveDisplayCanvasPng(canvas, {
        group,
        channelIndex,
        composite,
        viewport: getViewport?.(),
      });
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      button.disabled = false;
    }
  });
  return button;
}
function createCardTitleRow(titleText, saveButton) {
  const row = document.createElement('div');
  row.className = 'card-title-row';
  const title = document.createElement('h2');
  title.textContent = titleText;
  row.append(title, saveButton);
  return row;
}

function createChannelCardHeader(titleText, controlsEl, saveButton) {
  const row = document.createElement('div');
  row.className = 'card-title-row acqstore-ref-card-header';
  const title = document.createElement('h2');
  title.textContent = titleText;
  row.append(title, controlsEl, saveButton);
  return row;
}

function mountGroupLayout(group) {
  const container = group === 'source' ? channelsEl : referencesEl;
  const views = groupViews(group);
  destroyGroupViewports(group);
  container.replaceChildren();
  if (views.length === 0) return;
  // Hide legacy external contrast strip; controls live in card headers.
  if (group === 'source') {
    if (contrastController?.hideExternalPanels) contrastController.hideExternalPanels();
  } else if (contrastController?.hideExternalPanels) {
    contrastController.hideExternalPanels();
  }

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
    const titleText = group === 'source' ? 'Source composite' : 'Composite';
    const controls = document.createElement('div');
    controls.className = 'acqstore-ref-inline-controls';
    if (contrastController?.attachControls) {
      contrastController.attachControls(controls, first, {showLabel: true, compactLabel: true});
      contrastController.attachControls(controls, second, {showLabel: true, compactLabel: true});
    }
    card.append(createChannelCardHeader(titleText, controls, saveBtn), wrap);
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
    const controls = document.createElement('div');
    controls.className = 'acqstore-ref-inline-controls';
    if (contrastController?.attachControls) {
      contrastController.attachControls(controls, view, {showLabel: false});
    }
    card.append(createChannelCardHeader(view.label, controls, saveBtn), wrap);
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

// --- plane decode / transpose / stats ---
async function fetchPlane(resource, plane) {
  const dataUrl = String(resource.dataUrl || '');
  const absoluteUrl = /^https?:\/\//i.test(dataUrl)
    ? dataUrl
    : (apiBase.replace(/\/$/, '') + (dataUrl.startsWith('/') ? dataUrl : '/' + dataUrl));
  const response = await fetch(absoluteUrl, {cache:'no-store'});
  if (!response.ok) throw new Error(`binary fetch failed: ${response.status}`);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength !== resource.byteLength) {
    throw new Error(`byteLength mismatch: expected ${resource.byteLength}, got ${buffer.byteLength}`);
  }
  const values = new Float32Array(buffer);
  const expected = plane.shape[0] * plane.shape[1];
  if (values.length !== expected) {
    throw new Error(`sample count mismatch: expected ${expected}, got ${values.length}`);
  }
  return values;
}
function transposePlane(values, shape) {
  const rows = shape[0], cols = shape[1];
  const transposed = new Float32Array(values.length);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      transposed[col * rows + row] = values[row * cols + col];
    }
  }
  return {values: transposed, shape: [cols, rows]};
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function sampledFiniteValues(values, maxSamples=120000) {
  const samples = [];
  const step = Math.max(1, Math.floor(values.length / maxSamples));
  for (let index = 0; index < values.length; index += step) {
    if (Number.isFinite(values[index])) samples.push(values[index]);
  }
  return samples;
}
function percentile(sorted, percent) {
  if (sorted.length === 0) return NaN;
  return sorted[clamp(Math.round(percent / 100 * (sorted.length - 1)), 0, sorted.length - 1)];
}
function autoRange(values) {
  const sorted = sampledFiniteValues(values).sort((a, b) => a - b);
  let min = percentile(sorted, 1);
  let max = percentile(sorted, 99.5);
  if (!(max > min)) {
    const center = Number.isFinite(min) ? min : 0;
    const delta = Math.max(1e-9, Math.abs(center) * 0.01 || 1);
    min = center - delta;
    max = center + delta;
  }
  return [min, max];
}
// --- lut / render ---
function rgbStops(t, stops) {
  t = clamp(t, 0, 1);
  for (let index = 0; index < stops.length - 1; index++) {
    const left = stops[index], right = stops[index + 1];
    if (t >= left[0] && t <= right[0]) {
      const fraction = (t - left[0]) / Math.max(1e-12, right[0] - left[0]);
      return [0, 1, 2].map(channel =>
        Math.round(left[1][channel] + (right[1][channel] - left[1][channel]) * fraction)
      );
    }
  }
  return stops[stops.length - 1][1];
}
const LUT_COLOR_STOPS = {
  hot: [[0,[0,0,0]],[0.33,[220,0,0]],[0.67,[255,220,0]],[1,[255,255,255]]],
  viridis: [[0,[68,1,84]],[0.25,[59,82,139]],[0.5,[33,145,140]],[0.75,[94,201,98]],[1,[253,231,37]]],
  magma: [[0,[0,0,4]],[0.25,[74,16,112]],[0.5,[181,54,122]],[0.75,[251,136,97]],[1,[252,253,191]]],
  inferno: [[0,[0,0,4]],[0.25,[87,15,109]],[0.5,[187,55,84]],[0.75,[249,142,8]],[1,[252,255,164]]],
  cividis: [[0,[0,32,76]],[0.25,[70,82,103]],[0.5,[118,118,107]],[0.75,[166,161,113]],[1,[255,233,69]]],
  red: [[0,[0,0,0]],[0.35,[110,0,0]],[0.75,[255,45,25]],[1,[255,235,230]]],
  yellow: [[0,[0,0,0]],[0.35,[105,80,0]],[0.75,[255,210,0]],[1,[255,255,220]]],
  green: [[0,[0,0,0]],[0.35,[0,90,42]],[0.75,[0,220,85]],[1,[235,255,235]]],
  cyan: [[0,[0,0,0]],[0.35,[0,77,102]],[0.75,[0,200,255]],[1,[230,255,255]]],
  magenta: [[0,[0,0,0]],[0.35,[95,0,105]],[0.75,[255,0,220]],[1,[255,230,255]]],
};
function lutColor(t, lut) {
  if (lut === 'fire') {
    return [
      clamp(Math.round(255 * 3 * t), 0, 255),
      clamp(Math.round(255 * (3 * t - 1)), 0, 255),
      clamp(Math.round(255 * (3 * t - 2)), 0, 255),
    ];
  }
  if (LUT_COLOR_STOPS[lut]) return rgbStops(t, LUT_COLOR_STOPS[lut]);
  const gray = Math.round(clamp(t, 0, 1) * 255);
  return [gray, gray, gray];
}
function buildLutTables() {
  const names = ['gray', 'yellow', 'cyan', 'magenta', 'red', 'green', 'fire', 'hot', 'viridis', 'magma', 'inferno', 'cividis'];
  return Object.fromEntries(names.map(name => {
    const table = new Uint8ClampedArray(256 * 3);
    for (let index = 0; index < 256; index++) {
      const color = lutColor(index / 255, name);
      const offset = index * 3;
      table[offset] = color[0];
      table[offset + 1] = color[1];
      table[offset + 2] = color[2];
    }
    return [name, table];
  }));
}
const LUT_TABLES = buildLutTables();
const LUT_OPTION_LABELS = {
  gray:'Gray', yellow:'Yellow', cyan:'Cyan', magenta:'Magenta', red:'Red', green:'Green',
  fire:'Fire', hot:'Hot', viridis:'Viridis', magma:'Magma', inferno:'Inferno', cividis:'Cividis',
};
function sampleLutRgb(lutName, t) {
  const lut = LUT_TABLES[lutName] || LUT_TABLES.gray;
  const lutOffset = Math.round(clamp(t, 0, 1) * 255) * 3;
  return [lut[lutOffset], lut[lutOffset + 1], lut[lutOffset + 2]];
}
function defaultLutForChannelIndex(channelIndex) {
  if (channelIndex === 0) return 'green';
  if (channelIndex === 1) return 'magenta';
  return 'gray';
}
function lutDisplayLabel(lutName) {
  return LUT_OPTION_LABELS[lutName] || lutName || 'Gray';
}
function normalizeIntensity(value, min, span) {
  return Number.isFinite(value) ? clamp((value - min) / span, 0, 1) : 0;
}
function renderPlaneBitmap(values, shape, display) {
  const rows = shape[0], cols = shape[1];
  const min = display.min, max = display.max;
  const span = Math.max(1e-12, max - min);
  const image = new ImageData(cols, rows);
  for (let i = 0; i < values.length; i++) {
    const rgb = sampleLutRgb(display.lut, normalizeIntensity(values[i], min, span));
    const offset = i * 4;
    image.data[offset] = rgb[0];
    image.data[offset + 1] = rgb[1];
    image.data[offset + 2] = rgb[2];
    image.data[offset + 3] = 255;
  }
  const offscreen = document.createElement('canvas');
  offscreen.width = cols;
  offscreen.height = rows;
  offscreen.getContext('2d').putImageData(image, 0, 0);
  return offscreen;
}
/**
 * Composite: colorize each channel with its display LUT, then add RGB (clamp 255).
 * Uses each view's display min/max and display.lut (reference Overlay-style merge).
 */
function renderCompositeBitmap(viewA, viewB) {
  const rows = viewA.displayShape[0];
  const cols = viewA.displayShape[1];
  const aMin = viewA.display.min;
  const aMax = viewA.display.max;
  const bMin = viewB.display.min;
  const bMax = viewB.display.max;
  const aSpan = Math.max(1e-12, aMax - aMin);
  const bSpan = Math.max(1e-12, bMax - bMin);
  const image = new ImageData(cols, rows);
  for (let i = 0; i < viewA.values.length; i++) {
    const ca = sampleLutRgb(viewA.display.lut, normalizeIntensity(viewA.values[i], aMin, aSpan));
    const cb = sampleLutRgb(viewB.display.lut, normalizeIntensity(viewB.values[i], bMin, bSpan));
    const offset = i * 4;
    image.data[offset] = Math.min(255, ca[0] + cb[0]);
    image.data[offset + 1] = Math.min(255, ca[1] + cb[1]);
    image.data[offset + 2] = Math.min(255, ca[2] + cb[2]);
    image.data[offset + 3] = 255;
  }
  const offscreen = document.createElement('canvas');
  offscreen.width = cols;
  offscreen.height = rows;
  offscreen.getContext('2d').putImageData(image, 0, 0);
  return offscreen;
}
// --- scan path ---
function scanPathPoints(scanPath, lineRoi) {
  if (
    scanPath &&
    Array.isArray(scanPath.x) &&
    Array.isArray(scanPath.y) &&
    scanPath.x.length > 0 &&
    scanPath.x.length === scanPath.y.length
  ) {
    return scanPath.x.map((x, index) => [x, scanPath.y[index]]);
  }
  if (Array.isArray(lineRoi) && lineRoi.length === 4) {
    return [[lineRoi[0], lineRoi[1]], [lineRoi[2], lineRoi[3]]];
  }
  return [];
}
function drawScanPathOverlay(ctx, scanPath, lineRoi, viewScale) {
  const points = scanPathPoints(scanPath, lineRoi);
  if (points.length === 0) return;
  // API (x=dim1, y=dim0) → display image coords after transpose: (y, x).
  const toImage = ([x, y]) => [y, x];
  const stroke = Math.max(1, 2 / viewScale);
  const radius = Math.max(1.5, 3 / viewScale);
  ctx.save();
  ctx.strokeStyle = '#fb7185';
  ctx.fillStyle = '#fb7185';
  ctx.lineWidth = stroke;
  ctx.beginPath();
  points.forEach((point, index) => {
    const [x, y] = toImage(point);
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  for (const point of points) {
    const [x, y] = toImage(point);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.restore();
}

// --- viewport ---
// Interactive zoom/pan viewport for channel canvas elements.

/** Reserved screen gutters so axis labels sit outside the pixel rectangle. */
const PLOT_MARGIN = {left: 48, right: 10, top: 6, bottom: 22};

/**
 * Interactive viewport for one channel canvas.
 * Wheel/pinch: isotropic zoom · Shift+drag: pan · Double-click: home.
 * Square images (equal pixel width/height): drag a square region to zoom.
 * Non-square images: drag H/V for axis zoom; stretch-fill home fit.
 * Image is fitted into the inner plot rect; margins stay free for axis HUD.
 */
function createImageViewport(canvas, options={}) {
  const wrap = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const AXIS_LOCK_PX = 8;
  const AXIS_MIN_SPAN_PX = 12;
  let imageCanvas = null;
  let imageWidth = 0;
  let imageHeight = 0;
  let scaleX = 1;
  let scaleY = 1;
  let offsetX = 0;
  let offsetY = 0;
  let home = {scaleX:1, scaleY:1, offsetX:0, offsetY:0};
  let mode = 'none';
  let lastPointer = null;
  let axisStart = null;
  let axisCurrent = null;
  let activeTouches = new Map();
  let pinch = null;
  let destroyed = false;

  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / Math.max(1, rect.width)),
      y: (event.clientY - rect.top) * (canvas.height / Math.max(1, rect.height)),
    };
  }
  function syncCanvasSize() {
    const width = Math.max(1, Math.floor(wrap.clientWidth));
    const height = Math.max(1, Math.floor(wrap.clientHeight));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      return true;
    }
    return false;
  }
  function plotRect() {
    const left = PLOT_MARGIN.left;
    const top = PLOT_MARGIN.top;
    const right = Math.max(left + 1, canvas.width - PLOT_MARGIN.right);
    const bottom = Math.max(top + 1, canvas.height - PLOT_MARGIN.bottom);
    return {
      left,
      top,
      right,
      bottom,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
    };
  }
  function nearEqual(a, b) {
    return Math.abs(a - b) < 1e-6;
  }
  function isSquareImage() {
    return imageWidth > 0 && imageWidth === imageHeight;
  }
  function squareDragRect(start, current) {
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    const side = Math.max(Math.abs(dx), Math.abs(dy), 1);
    const x1 = start.x + (dx < 0 ? -side : side);
    const y1 = start.y + (dy < 0 ? -side : side);
    return {
      x0: Math.min(start.x, x1),
      y0: Math.min(start.y, y1),
      x1: Math.max(start.x, x1),
      y1: Math.max(start.y, y1),
    };
  }
  function isAtHome() {
    return nearEqual(scaleX, home.scaleX)
      && nearEqual(scaleY, home.scaleY)
      && nearEqual(offsetX, home.offsetX)
      && nearEqual(offsetY, home.offsetY);
  }
  function fitHome() {
    syncCanvasSize();
    if (!imageWidth || !imageHeight) return;
    const plot = plotRect();
    if (imageWidth === imageHeight) {
      const fit = Math.min(plot.width / imageWidth, plot.height / imageHeight) * 0.98;
      scaleX = fit;
      scaleY = fit;
      offsetX = plot.left + (plot.width - imageWidth * scaleX) / 2;
      offsetY = plot.top + (plot.height - imageHeight * scaleY) / 2;
    } else {
      // Stretch kymograph / unequal planes to fill the plot area.
      scaleX = plot.width / imageWidth;
      scaleY = plot.height / imageHeight;
      offsetX = plot.left;
      offsetY = plot.top;
    }
    home = {scaleX, scaleY, offsetX, offsetY};
  }
  function drawAxisGuide() {
    if (!axisStart || !axisCurrent) return;
    const plot = plotRect();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = 1;
    if (mode === 'regionZoom') {
      const rect = squareDragRect(axisStart, axisCurrent);
      ctx.fillRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
      ctx.strokeRect(
        rect.x0 + 0.5,
        rect.y0 + 0.5,
        Math.max(1, rect.x1 - rect.x0 - 1),
        Math.max(1, rect.y1 - rect.y0 - 1),
      );
    } else if (mode === 'axisH') {
      const x0 = Math.min(axisStart.x, axisCurrent.x);
      const x1 = Math.max(axisStart.x, axisCurrent.x);
      ctx.fillRect(x0, plot.top, Math.max(1, x1 - x0), plot.height);
      ctx.beginPath();
      ctx.moveTo(x0 + 0.5, plot.top);
      ctx.lineTo(x0 + 0.5, plot.bottom);
      ctx.moveTo(x1 + 0.5, plot.top);
      ctx.lineTo(x1 + 0.5, plot.bottom);
      ctx.stroke();
    } else if (mode === 'axisV') {
      const y0 = Math.min(axisStart.y, axisCurrent.y);
      const y1 = Math.max(axisStart.y, axisCurrent.y);
      ctx.fillRect(plot.left, y0, plot.width, Math.max(1, y1 - y0));
      ctx.beginPath();
      ctx.moveTo(plot.left, y0 + 0.5);
      ctx.lineTo(plot.right, y0 + 0.5);
      ctx.moveTo(plot.left, y1 + 0.5);
      ctx.lineTo(plot.right, y1 + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
  function draw() {
    if (destroyed) return;
    syncCanvasSize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!imageCanvas) return;
    ctx.save();
    // Flip Y so physical axis 0 sits at the image bottom (plot-style after transpose).
    ctx.translate(offsetX, offsetY + imageHeight * scaleY);
    ctx.scale(scaleX, -scaleY);
    ctx.imageSmoothingEnabled = scaleX < 1 || scaleY < 1;
    ctx.drawImage(imageCanvas, 0, 0);
    options.getOverlay?.(ctx, {scaleX, scaleY});
    ctx.restore();
    // Image frame is drawn with Axes chrome in getAxisLabels (not when Axes is off).
    options.getAxisLabels?.(ctx, {imageWidth, imageHeight, scaleX, scaleY, offsetX, offsetY});
    drawAxisGuide();
  }
  function zoomAt(screenX, screenY, factor) {
    const nextX = clamp(scaleX * factor, 0.05, 200);
    const nextY = clamp(scaleY * factor, 0.05, 200);
    if (nearEqual(nextX, scaleX) && nearEqual(nextY, scaleY)) return;
    offsetX = screenX - (screenX - offsetX) * (nextX / scaleX);
    offsetY = screenY - (screenY - offsetY) * (nextY / scaleY);
    scaleX = nextX;
    scaleY = nextY;
    draw();
  }
  function applyAxisZoom(axis, start, end) {
    const plot = plotRect();
    if (axis === 'h') {
      const x0 = Math.min(start.x, end.x);
      const x1 = Math.max(start.x, end.x);
      if (x1 - x0 < AXIS_MIN_SPAN_PX) return;
      const world0 = (x0 - offsetX) / scaleX;
      const world1 = (x1 - offsetX) / scaleX;
      const span = world1 - world0;
      if (!(span > 0)) return;
      const next = clamp(plot.width / span, 0.05, 200);
      offsetX = plot.left - world0 * next;
      scaleX = next;
      return;
    }
    const y0 = Math.min(start.y, end.y);
    const y1 = Math.max(start.y, end.y);
    if (y1 - y0 < AXIS_MIN_SPAN_PX) return;
    const world0 = (y0 - offsetY) / scaleY;
    const world1 = (y1 - offsetY) / scaleY;
    const span = world1 - world0;
    if (!(span > 0)) return;
    const next = clamp(plot.height / span, 0.05, 200);
    offsetY = plot.top - world0 * next;
    scaleY = next;
  }
  function applyRegionZoom(start, end) {
    const plot = plotRect();
    const rect = squareDragRect(start, end);
    if (rect.x1 - rect.x0 < AXIS_MIN_SPAN_PX || rect.y1 - rect.y0 < AXIS_MIN_SPAN_PX) return;
    const worldX0 = (rect.x0 - offsetX) / scaleX;
    const worldY0 = (rect.y0 - offsetY) / scaleY;
    const worldX1 = (rect.x1 - offsetX) / scaleX;
    const worldY1 = (rect.y1 - offsetY) / scaleY;
    const spanX = worldX1 - worldX0;
    const spanY = worldY1 - worldY0;
    if (!(spanX > 0) || !(spanY > 0)) return;
    const next = clamp(Math.min(plot.width / spanX, plot.height / spanY), 0.05, 200);
    const usedW = spanX * next;
    const usedH = spanY * next;
    offsetX = -worldX0 * next + plot.left + (plot.width - usedW) / 2;
    offsetY = -worldY0 * next + plot.top + (plot.height - usedH) / 2;
    scaleX = next;
    scaleY = next;
  }
  function clearAxisMode() {
    axisStart = null;
    axisCurrent = null;
    wrap.classList.remove('axis-zooming', 'axis-zooming-v', 'region-zooming');
  }
  function onWheel(event) {
    event.preventDefault();
    const point = localPoint(event);
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    zoomAt(point.x, point.y, factor);
  }
  function onDblClick(event) {
    event.preventDefault();
    scaleX = home.scaleX;
    scaleY = home.scaleY;
    offsetX = home.offsetX;
    offsetY = home.offsetY;
    clearAxisMode();
    draw();
  }
  function onPointerDown(event) {
    canvas.setPointerCapture?.(event.pointerId);
    activeTouches.set(event.pointerId, {x:event.clientX, y:event.clientY});
    if (activeTouches.size === 2) {
      const points = Array.from(activeTouches.values());
      pinch = {
        distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
        scaleX,
        scaleY,
      };
      mode = 'pinch';
      clearAxisMode();
      return;
    }
    if (event.button !== 0) return;
    if (event.shiftKey) {
      mode = 'pan';
      lastPointer = localPoint(event);
      wrap.classList.add('panning');
      clearAxisMode();
      return;
    }
    mode = 'axisPending';
    axisStart = localPoint(event);
    axisCurrent = axisStart;
  }
  function onPointerMove(event) {
    if (!activeTouches.has(event.pointerId) && mode === 'none') return;
    if (activeTouches.has(event.pointerId)) {
      activeTouches.set(event.pointerId, {x:event.clientX, y:event.clientY});
    }
    if (mode === 'pinch' && activeTouches.size === 2 && pinch?.distance > 0) {
      const points = Array.from(activeTouches.values());
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const rect = canvas.getBoundingClientRect();
      const midX = ((points[0].x + points[1].x) / 2 - rect.left) * (canvas.width / Math.max(1, rect.width));
      const midY = ((points[0].y + points[1].y) / 2 - rect.top) * (canvas.height / Math.max(1, rect.height));
      const factor = distance / pinch.distance;
      const nextX = clamp(pinch.scaleX * factor, 0.05, 200);
      const nextY = clamp(pinch.scaleY * factor, 0.05, 200);
      offsetX = midX - (midX - offsetX) * (nextX / scaleX);
      offsetY = midY - (midY - offsetY) * (nextY / scaleY);
      scaleX = nextX;
      scaleY = nextY;
      draw();
      return;
    }
    if (mode === 'pan' && lastPointer) {
      const point = localPoint(event);
      offsetX += point.x - lastPointer.x;
      offsetY += point.y - lastPointer.y;
      lastPointer = point;
      draw();
      return;
    }
    if (mode === 'axisPending' || mode === 'axisH' || mode === 'axisV' || mode === 'regionZoom') {
      const point = localPoint(event);
      axisCurrent = point;
      if (mode === 'axisPending' && axisStart) {
        const dx = point.x - axisStart.x;
        const dy = point.y - axisStart.y;
        if (Math.hypot(dx, dy) >= AXIS_LOCK_PX) {
          if (isSquareImage()) {
            mode = 'regionZoom';
            wrap.classList.add('region-zooming');
          } else if (Math.abs(dx) >= Math.abs(dy)) {
            mode = 'axisH';
            wrap.classList.add('axis-zooming');
          } else {
            mode = 'axisV';
            wrap.classList.add('axis-zooming-v');
          }
        }
      }
      if (mode === 'axisH' || mode === 'axisV' || mode === 'regionZoom') draw();
    }
  }
  function endPointer(event) {
    activeTouches.delete(event.pointerId);
    if (activeTouches.size < 2) pinch = null;
    if (mode === 'pinch' && activeTouches.size < 2) mode = 'none';
    if (mode === 'pan' && activeTouches.size === 0) {
      mode = 'none';
      lastPointer = null;
      wrap.classList.remove('panning');
    }
    if (mode === 'regionZoom' && axisStart && axisCurrent) {
      applyRegionZoom(axisStart, axisCurrent);
      clearAxisMode();
      mode = 'none';
      draw();
    } else if ((mode === 'axisH' || mode === 'axisV') && axisStart && axisCurrent) {
      applyAxisZoom(mode === 'axisH' ? 'h' : 'v', axisStart, axisCurrent);
      clearAxisMode();
      mode = 'none';
      draw();
    } else if (mode === 'axisPending') {
      clearAxisMode();
      mode = 'none';
    }
    try { canvas.releasePointerCapture?.(event.pointerId); } catch (_err) {}
  }

  canvas.addEventListener('wheel', onWheel, {passive:false});
  canvas.addEventListener('dblclick', onDblClick);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  const resizeObserver = new ResizeObserver(() => {
    if (!syncCanvasSize()) return;
    if (isAtHome()) fitHome();
    draw();
  });
  resizeObserver.observe(wrap);

  return {
    setImage(nextImage, opts={}) {
      imageCanvas = nextImage;
      imageWidth = nextImage?.width || 0;
      imageHeight = nextImage?.height || 0;
      if (opts.resetView !== false) fitHome();
      draw();
    },
    redraw() { draw(); },
    resetView() { fitHome(); draw(); },
    resize() {
      if (!syncCanvasSize()) return;
      if (isAtHome()) fitHome();
      draw();
    },
    destroy() {
      destroyed = true;
      resizeObserver.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDblClick);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endPointer);
      canvas.removeEventListener('pointercancel', endPointer);
    },
  };
}



// --- split pane ---
/**
 * Top/bottom drag splitter between source and reference panes.
 */
function createSplitPane({container, first, second, divider, minFirst=0, minSecond=0, onResize=null}) {
  let dragging = false;

  function setEnabled(enabled) {
    container.classList.toggle('single', !enabled);
    divider.hidden = !enabled;
    if (!enabled) {
      first.style.flex = '';
      first.style.height = '';
      second.style.flex = '';
      second.style.height = '';
    } else if (!first.style.height) {
      first.style.flex = '1 1 0';
      second.style.flex = '1 1 0';
    }
    onResize?.();
  }
  function onPointerMove(event) {
    if (!dragging) return;
    const rect = container.getBoundingClientRect();
    const dividerSize = divider.offsetHeight || 8;
    let topHeight = event.clientY - rect.top;
    topHeight = clamp(topHeight, minFirst, rect.height - minSecond - dividerSize);
    first.style.flex = 'none';
    first.style.height = `${Math.round(topHeight)}px`;
    second.style.flex = '1 1 0';
    second.style.height = '';
    onResize?.();
    event.preventDefault();
  }
  function stopDrag(event) {
    if (!dragging) return;
    dragging = false;
    divider.classList.remove('active');
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
    try { divider.releasePointerCapture?.(event.pointerId); } catch (_err) {}
    onResize?.();
  }

  divider.addEventListener('pointerdown', event => {
    if (divider.hidden) return;
    dragging = true;
    divider.classList.add('active');
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    divider.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  divider.addEventListener('pointermove', onPointerMove);
  divider.addEventListener('pointerup', stopDrag);
  divider.addEventListener('pointercancel', stopDrag);

  return {setEnabled};
}

// --- layout / composite draw ---
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
function histogramForValues(values, binCount=96) {
  const sorted = sampledFiniteValues(values).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  let domainMin = percentile(sorted, 0.1);
  let domainMax = percentile(sorted, 99.9);
  if (!(domainMax > domainMin)) {
    const delta = Math.max(1e-9, Math.abs(domainMin) * 0.01 || 1);
    domainMin -= delta;
    domainMax += delta;
  }
  const bins = new Uint32Array(binCount);
  const span = domainMax - domainMin;
  for (const value of sorted) {
    const index = clamp(Math.floor((value - domainMin) / span * binCount), 0, binCount - 1);
    bins[index]++;
  }
  return {bins, domainMin, domainMax};
}
function createContrastController(elements, redrawView) {
  let views = new Map();
  let selectedId = null;
  let activeRangeButton = null;
  let histogram = null;
  let dragHandle = null;

  function selectedView() {
    return selectedId ? views.get(selectedId) : null;
  }
  function numberText(value) {
    const magnitude = Math.abs(value);
    if ((magnitude !== 0 && magnitude < 0.001) || magnitude >= 100000) {
      return value.toExponential(5);
    }
    return String(Number(value.toPrecision(8)));
  }
  function syncPopoverFields() {
    const view = selectedView();
    if (!view) return;
    elements.min.value = numberText(view.display.min);
    elements.max.value = numberText(view.display.max);
    elements.title.textContent = `${view.label} display range`;
  }
  function closePopover() {
    elements.popover.hidden = true;
    dragHandle = null;
    activeRangeButton = null;
  }
  function positionPopover() {
    if (!activeRangeButton) return;
    const rect = activeRangeButton.getBoundingClientRect();
    const width = elements.popover.offsetWidth || 330;
    const height = elements.popover.offsetHeight || 190;
    const margin = 8;
    const left = clamp(rect.left, margin, Math.max(margin, window.innerWidth - width - margin));
    const below = rect.bottom + 6;
    const top = below + height <= window.innerHeight - margin
      ? below
      : Math.max(margin, rect.top - height - 6);
    elements.popover.style.left = `${Math.round(left)}px`;
    elements.popover.style.top = `${Math.round(top)}px`;
  }
  function drawHistogram() {
    const view = selectedView();
    if (!view) return;
    histogram = view.histogram || (view.histogram = histogramForValues(view.values));
    if (!histogram) return;
    const canvas = elements.histogram;
    const ctx = canvas.getContext('2d');
    const width = canvas.width, height = canvas.height;
    const left = 6, right = width - 6, top = 6, bottom = height - 8;
    const maxCount = Math.max(1, ...histogram.bins);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#64748b';
    histogram.bins.forEach((count, index) => {
      const x0 = left + index / histogram.bins.length * (right - left);
      const x1 = left + (index + 1) / histogram.bins.length * (right - left);
      const frac = Math.log1p(count) / Math.log1p(maxCount);
      const barHeight = frac * (bottom - top);
      ctx.fillRect(x0, bottom - barHeight, Math.max(1, x1 - x0), barHeight);
    });
    const valueToX = value => left + clamp(
      (value - histogram.domainMin) / (histogram.domainMax - histogram.domainMin),
      0,
      1,
    ) * (right - left);
    const drawHandle = (value, fill) => {
      const x = valueToX(value);
      ctx.strokeStyle = fill === '#ffffff' ? '#ffffff' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.fillStyle = fill;
      ctx.strokeStyle = '#e2e8f0';
      ctx.fillRect(x - 4, top, 8, 9);
      ctx.strokeRect(x - 4, top, 8, 9);
    };
    drawHandle(view.display.min, '#020617');
    drawHandle(view.display.max, '#ffffff');
  }
  function openPopoverFor(viewId, rangeButton) {
    selectedId = viewId;
    activeRangeButton = rangeButton;
    if (!selectedView()) return;
    syncPopoverFields();
    elements.popover.hidden = false;
    positionPopover();
    drawHistogram();
  }
  function applyNumericRange() {
    const view = selectedView();
    if (!view) return;
    const min = Number(elements.min.value), max = Number(elements.max.value);
    if (!Number.isFinite(min) || !Number.isFinite(max) || !(max > min)) return;
    view.display.min = min;
    view.display.max = max;
    redrawView(view, {resetView:false});
    drawHistogram();
  }
  function updateDrag(event) {
    const view = selectedView();
    if (!view || !histogram || !dragHandle) return;
    const rect = elements.histogram.getBoundingClientRect();
    const pixelX = (event.clientX - rect.left) * elements.histogram.width / rect.width;
    const fraction = clamp((pixelX - 6) / (elements.histogram.width - 12), 0, 1);
    const value = histogram.domainMin + fraction * (histogram.domainMax - histogram.domainMin);
    const epsilon = Math.max(1e-12, (histogram.domainMax - histogram.domainMin) * 1e-6);
    if (dragHandle === 'min') view.display.min = Math.min(value, view.display.max - epsilon);
    else view.display.max = Math.max(value, view.display.min + epsilon);
    syncPopoverFields();
    redrawView(view, {resetView:false});
    drawHistogram();
    event.preventDefault();
  }
  function buildLutSelect(current) {
    const select = document.createElement('select');
    for (const [value, label] of Object.entries(LUT_OPTION_LABELS)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    }
    select.value = current in LUT_OPTION_LABELS ? current : 'gray';
    return select;
  }
  function hideExternalPanels() {
    if (elements.sourcePanel) {
      elements.sourcePanel.replaceChildren();
      elements.sourcePanel.hidden = true;
    }
    if (elements.referencePanel) {
      elements.referencePanel.replaceChildren();
      elements.referencePanel.hidden = true;
    }
  }
  /** Mount LUT + Range into a card header (per-channel or composite dual groups). */
  function attachControls(parentEl, view, opts={}) {
    if (!parentEl || !view?.display) return;
    const group = document.createElement('div');
    group.className = 'acqstore-ref-ctrl-group';
    group.dataset.viewId = view.id;
    if (opts.showLabel) {
      const channelLabel = document.createElement('span');
      channelLabel.className = 'contrast-channel-label';
      channelLabel.textContent = opts.compactLabel
        ? `Ch${view.channelIndex}`
        : view.label;
      group.appendChild(channelLabel);
    }
    const lutSelect = buildLutSelect(view.display.lut);
    lutSelect.title = 'Color LUT';
    lutSelect.setAttribute('aria-label', `${view.label} color LUT`);
    lutSelect.addEventListener('change', () => {
      view.display.lut = lutSelect.value;
      redrawView(view, {resetView:false});
    });
    const rangeButton = document.createElement('button');
    rangeButton.type = 'button';
    rangeButton.textContent = 'Range…';
    rangeButton.addEventListener('click', () => {
      if (!elements.popover.hidden && selectedId === view.id) closePopover();
      else openPopoverFor(view.id, rangeButton);
    });
    group.append(lutSelect, rangeButton);
    parentEl.appendChild(group);
  }
  function mountContrastPanels() {
    // Controls are mounted into channel/composite card headers by mountGroupLayout.
    hideExternalPanels();
  }

  elements.min.addEventListener('input', applyNumericRange);
  elements.max.addEventListener('input', applyNumericRange);
  elements.auto.addEventListener('click', () => {
    const view = selectedView();
    if (!view) return;
    [view.display.min, view.display.max] = autoRange(view.values);
    syncPopoverFields();
    redrawView(view, {resetView:false});
    drawHistogram();
  });
  elements.histogram.addEventListener('pointerdown', event => {
    const view = selectedView();
    if (!view || !histogram) return;
    const rect = elements.histogram.getBoundingClientRect();
    const pixelX = (event.clientX - rect.left) * elements.histogram.width / rect.width;
    const valueToX = value => 6 + clamp(
      (value - histogram.domainMin) / (histogram.domainMax - histogram.domainMin),
      0,
      1,
    ) * (elements.histogram.width - 12);
    dragHandle = Math.abs(pixelX - valueToX(view.display.min))
      <= Math.abs(pixelX - valueToX(view.display.max)) ? 'min' : 'max';
    elements.histogram.setPointerCapture?.(event.pointerId);
    updateDrag(event);
  });
  elements.histogram.addEventListener('pointermove', event => {
    if (dragHandle) updateDrag(event);
  });
  elements.histogram.addEventListener('pointerup', event => {
    elements.histogram.releasePointerCapture?.(event.pointerId);
    dragHandle = null;
  });
  document.addEventListener('pointerdown', event => {
    if (elements.popover.hidden) return;
    if (elements.popover.contains(event.target)) return;
    if (activeRangeButton && (event.target === activeRangeButton || activeRangeButton.contains(event.target))) return;
    if (
      event.target.closest?.('.contrast-row button')
      || event.target.closest?.('.acqstore-ref-ctrl-group button')
    ) return;
    closePopover();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePopover();
  });
  window.addEventListener('resize', closePopover);

  return {
    setViews(nextViews) {
      closePopover();
      views = new Map();
      for (const view of nextViews) {
        const [min, max] = autoRange(view.values);
        view.display = {lut: defaultLutForChannelIndex(view.channelIndex), min, max};
        views.set(view.id, view);
      }
      mountContrastPanels();
    },
    reset() {
      closePopover();
      views.clear();
      selectedId = null;
      hideExternalPanels();
    },
    redrawGroup(group) {
      redrawGroupDisplay(group, {resetView:false});
    },
    attachControls,
    hideExternalPanels,
  };
}

/* ==== LLM_COPY:REFERENCE_VIEW_JS (from monolith) END ==== */

function resizeAllViewports() {
  state.activeViews.forEach(view => view.viewport?.resize());
  state.compositeSlots.source?.viewport?.resize();
  state.compositeSlots.reference?.viewport?.resize();
}
function reflowReferenceViewports() {
  // Force home fit after host layout settles (fixes ch0 offset after uncollapse/grid).
  resizeAllViewports();
  state.activeViews.forEach(view => {
    if (view.group !== 'reference') return;
    view.viewport?.resetView?.();
  });
  state.compositeSlots.reference?.viewport?.resetView?.();
}
function scheduleReferenceReflow() {
  requestAnimationFrame(() => {
    reflowReferenceViewports();
    requestAnimationFrame(() => {
      reflowReferenceViewports();
      setTimeout(reflowReferenceViewports, 0);
      setTimeout(reflowReferenceViewports, 48);
    });
  });
}
function redrawAxesOnly(group) {
  if (compositeEnabled(group) && state.compositeSlots[group]?.viewport) {
    state.compositeSlots[group].viewport.redraw();
    return;
  }
  groupViews(group).forEach(view => view.viewport?.redraw());
}
function onCompositeChange(group) {
  mountGroupLayout(group);
  redrawGroupDisplay(group, {resetView: true});
  scheduleReferenceReflow();
}

async function renderResources(resources, plane, group, reference=null) {
  const views = [];
  const axes = displayAxesFromPlane(plane);
  for (const resource of resources) {
    const values = await fetchPlane(resource, plane);
    const displayPlane = transposePlane(values, plane.shape);
    views.push({
      id: `${group}:${resource.index}`,
      group,
      channelIndex: resource.index,
      label: `Channel ${resource.index}`,
      axes,
      canvas: null,
      values: displayPlane.values,
      displayShape: displayPlane.shape,
      sourceShape: plane.shape,
      scanPath: reference?.scanPath || null,
      lineRoi: reference?.lineRoi || null,
    });
  }
  return views;
}

function planeToRowMajor(values, shape) {
  const rows = shape[0], cols = shape[1];
  const out = new Array(rows);
  for (let r = 0; r < rows; r++) {
    out[r] = Float32Array.from(values.subarray(r * cols, (r + 1) * cols));
  }
  return out;
}

async function setFromOpenPayload(payload) {
  if (!mounted) throw new Error('AcqStoreReferenceView.mount(...) first');
  destroyActiveViews();
  state.loadedSourceName = sourceFileLabel(payload.source);
  referenceComposite.checked = false;
  referenceAxes.checked = false;
  sourceComposite.checked = false;
  sourceAxes.checked = false;
  referencesEl.replaceChildren();
  channelsEl.replaceChildren();
  const reference = payload.reference;
  const card = $('acqstoreReferenceCard');
  // Expand BEFORE mounting canvases so wraps have non-zero size (ch0 offset footgun).
  if (reference && card) {
    card.classList.remove('collapsed');
    card.hidden = false;
  }
  const views = [];
  if (referenceEmptyEl) referenceEmptyEl.hidden = Boolean(reference);
  if (reference) {
    const hasScanPath = scanPathPoints(reference.scanPath, reference.lineRoi).length > 0;
    scanPathControl.hidden = !hasScanPath;
    showScanPath.disabled = !hasScanPath;
    views.push(...await renderResources(
      reference.channels,
      reference.plane,
      'reference',
      reference,
    ));
  } else {
    scanPathControl.hidden = true;
    showScanPath.disabled = true;
    referenceCompositeControl.hidden = true;
    referenceComposite.checked = false;
    if (card) card.classList.add('collapsed');
  }
  state.activeViews = views;
  updateCompositeControls();
  updateAxesControls();
  contrastController.setViews(views);
  mountGroupLayout('reference');
  redrawGroupDisplay('reference', {resetView: true});
  scheduleReferenceReflow();
  return views.length;
}

function clear() {
  if (!mounted) return;
  destroyActiveViews();
  contrastController?.reset?.();
  referencesEl?.replaceChildren();
  if (referenceEmptyEl) {
    referenceEmptyEl.hidden = false;
    referenceEmptyEl.textContent = 'No reference image loaded.';
  }
  $('acqstoreReferenceCard')?.classList.add('collapsed');
}

function bindCollapse() {
  if (collapseBound) return;
  const card = $('acqstoreReferenceCard');
  const h2 = card?.querySelector(':scope > h2');
  if (!card || !h2) return;
  h2.addEventListener('click', () => {
    card.classList.toggle('collapsed');
    if (!card.classList.contains('collapsed')) scheduleReferenceReflow();
  });
  collapseBound = true;
}

function mount(hostEl, opts={}) {
  if (!hostEl) throw new Error('AcqStoreReferenceView.mount requires a host element');
  apiBase = (opts.apiBase || DEFAULT_API_BASE).replace(/\/$/, '');
  if (opts.injectCss !== false) injectCssOnce();
  hostEl.innerHTML = hostHtml();
  // Move popover + shims to body so position:fixed and hidden shims are safe.
  const pop = $('acqstoreRefRangePopover');
  const shims = $('acqstoreRefShims');
  if (pop && pop.parentElement !== document.body) document.body.appendChild(pop);
  if (shims && shims.parentElement !== document.body) document.body.appendChild(shims);
  bindDom();
  bindCollapse();
  contrastController = createContrastController(
    {
      sourcePanel: $('sourceContrast'),
      referencePanel: $('referenceContrast'),
      popover: $('acqstoreRefRangePopover'),
      title: $('acqstoreRefRangeTitle'),
      histogram: $('acqstoreRefRangeHistogram'),
      min: $('acqstoreRefRangeMin'),
      max: $('acqstoreRefRangeMax'),
      auto: $('acqstoreRefRangeAuto'),
    },
    drawChannelView,
  );
  showScanPath.addEventListener('change', () => contrastController.redrawGroup('reference'));
  sourceComposite.addEventListener('change', () => onCompositeChange('source'));
  referenceComposite.addEventListener('change', () => onCompositeChange('reference'));
  sourceAxes.addEventListener('change', () => redrawAxesOnly('source'));
  referenceAxes.addEventListener('change', () => redrawAxesOnly('reference'));
  mounted = true;
  return api;
}

async function jsonRequest(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    const err = new Error(`${payload.error || response.status}: ${payload.message || response.statusText}`);
    err.payload = payload;
    throw err;
  }
  return payload;
}
async function getJson(url, options={}) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(`${payload.error || response.status}: ${payload.message || response.statusText}`);
  }
  return payload;
}

const api = {
  DEFAULT_API_BASE,
  mount,
  clear,
  setFromOpenPayload,
  fetchPlane,
  transposePlane,
  planeToRowMajor,
  sourceFileLabel,
  displayAxesFromPlane,
  async health() {
    return getJson(apiBase + '/api/v2/health');
  },
  async pickAndOpen() {
    return jsonRequest(apiBase + '/api/v2/pick-and-open', {});
  },
  async deleteSession(sessionId) {
    if (!sessionId) return;
    return getJson(apiBase + '/api/v2/sessions/' + encodeURIComponent(sessionId), {method: 'DELETE'});
  },
  getApiBase() { return apiBase; },
  setApiBase(next) { apiBase = String(next || DEFAULT_API_BASE).replace(/\/$/, ''); },
};

global.AcqStoreReferenceView = api;
})(typeof window !== 'undefined' ? window : globalThis);
