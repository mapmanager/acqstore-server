// Plane fetch, transpose, sampling, and display-axis mapping.
import {clamp} from './util.js';

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
async function fetchPlane(resource, plane) {
  const response = await fetch(resource.dataUrl, {cache:'no-store'});
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

export {
  displayAxesFromPlane,
  fetchPlane,
  transposePlane,
  sampledFiniteValues,
  percentile,
  autoRange,
};
