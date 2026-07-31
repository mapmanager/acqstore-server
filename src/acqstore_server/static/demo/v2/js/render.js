// Single-channel and composite plane bitmap rendering.
import {clamp} from './util.js';
import {sampleLutRgb} from './lut.js';

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

export {renderPlaneBitmap, renderCompositeBitmap};
