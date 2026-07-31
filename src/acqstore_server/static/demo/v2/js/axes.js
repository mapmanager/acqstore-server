// Axis tick selection and axis label drawing on viewports.
import {clamp} from './util.js';

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
function drawAxisLabels(ctx, drawState) {
  const axes = drawState.axes;
  if (!axes?.x && !axes?.y) return;
  const {imageWidth, imageHeight, scaleX, scaleY, offsetX, offsetY} = drawState;
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

  if (xMeta) {
    const ticks = adaptiveAxisTicks(xMeta.max, widthPx, {minMajorPx: 64, minMinorPx: 16});
    const xAt = value => left + (value / xMeta.step) * scaleX;
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.065)';
    for (const value of ticks.minor) {
      const x = xAt(value);
      if (x < left - 0.5 || x > right + 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.16)';
    for (const value of ticks.major) {
      const x = xAt(value);
      if (x < left - 0.5 || x > right + 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(203, 213, 225, 0.84)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (const value of ticks.major) {
      const x = xAt(value);
      if (x < left - 0.5 || x > right + 0.5) continue;
      const label = formatAxisTick(value, ticks.majorStep, xMeta.unit);
      const labelWidth = ctx.measureText(label).width;
      const labelX = clamp(x + 2, left + 1, right - labelWidth - 1);
      ctx.fillText(label, labelX, Math.min(ctx.canvas.height - 4, bottom + 14));
    }
    const unit = axisUnitLabel(xMeta.unit);
    if (unit) {
      ctx.textAlign = 'right';
      ctx.fillText(unit, right, Math.min(ctx.canvas.height - 4, bottom + 14));
    }
  }

  if (yMeta) {
    const ticks = adaptiveAxisTicks(yMeta.max, heightPx, {minMajorPx: 28, minMinorPx: 11});
    // Plot-style Y after display transpose: 0 at the image bottom, max at the top.
    const yAt = value => bottom - (value / yMeta.step) * scaleY;
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.06)';
    for (const value of ticks.major) {
      const y = yAt(value);
      if (y < top - 0.5 || y > bottom + 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.34)';
    for (const value of ticks.minor) {
      const y = yAt(value);
      if (y < top - 0.5 || y > bottom + 0.5) continue;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + 5, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(203, 213, 225, 0.84)';
    const unit = axisUnitLabel(yMeta.unit);
    if (unit) {
      ctx.textBaseline = 'top';
      ctx.textAlign = 'right';
      ctx.fillText(unit, left - 6, top + 2);
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'right';
    for (const value of ticks.major) {
      const y = yAt(value);
      if (y < top + 10 || y > bottom - 8) continue;
      ctx.fillText(formatAxisTick(value, ticks.majorStep, yMeta.unit), left - 6, y - 5);
    }
  }
  ctx.restore();
}

export {adaptiveAxisTicks, drawAxisLabels};
