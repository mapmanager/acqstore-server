// Single-channel and composite plane bitmap rendering.
import {clamp} from './util.js';
import {LUT_TABLES} from './lut.js';

function renderPlaneBitmap(values, shape, display) {
  const rows = shape[0], cols = shape[1];
  const min = display.min, max = display.max;
  const span = Math.max(1e-12, max - min);
  const lut = LUT_TABLES[display.lut] || LUT_TABLES.gray;
  const image = new ImageData(cols, rows);
  for (let i = 0; i < values.length; i++) {
    const normalized = Number.isFinite(values[i]) ? clamp((values[i] - min) / span, 0, 1) : 0;
    const lutOffset = Math.round(normalized * 255) * 3;
    const offset = i * 4;
    image.data[offset] = lut[lutOffset];
    image.data[offset + 1] = lut[lutOffset + 1];
    image.data[offset + 2] = lut[lutOffset + 2];
    image.data[offset + 3] = 255;
  }
  const offscreen = document.createElement('canvas');
  offscreen.width = cols;
  offscreen.height = rows;
  offscreen.getContext('2d').putImageData(image, 0, 0);
  return offscreen;
}
/**
 * Fixed v1 composite: channel 0 → green (G), channel 1 → magenta (R+B).
 * Uses each view's display min/max only; ignores per-channel LUT.
 * Source and reference composites are independent callers of this helper.
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
    const ta = Number.isFinite(viewA.values[i]) ? clamp((viewA.values[i] - aMin) / aSpan, 0, 1) : 0;
    const tb = Number.isFinite(viewB.values[i]) ? clamp((viewB.values[i] - bMin) / bSpan, 0, 1) : 0;
    const green = Math.round(ta * 255);
    const magenta = Math.round(tb * 255);
    const offset = i * 4;
    image.data[offset] = Math.min(255, magenta);
    image.data[offset + 1] = Math.min(255, green);
    image.data[offset + 2] = Math.min(255, magenta);
    image.data[offset + 3] = 255;
  }
  const offscreen = document.createElement('canvas');
  offscreen.width = cols;
  offscreen.height = rows;
  offscreen.getContext('2d').putImageData(image, 0, 0);
  return offscreen;
}

export {renderPlaneBitmap, renderCompositeBitmap};
