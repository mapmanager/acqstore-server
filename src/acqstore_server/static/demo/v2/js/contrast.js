// Histogram, LUT labels, and contrast controller UI.
import {clamp} from './util.js';
import {sampledFiniteValues, percentile, autoRange} from './plane.js';
import {redrawGroupDisplay} from './layout.js';

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
const LUT_OPTION_LABELS = {
  gray:'Gray', yellow:'Yellow', cyan:'Cyan', magenta:'Magenta', red:'Red', green:'Green',
  fire:'Fire', hot:'Hot', viridis:'Viridis', magma:'Magma', inferno:'Inferno', cividis:'Cividis',
};
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
  function mountPanelRows(panel, group) {
    panel.replaceChildren();
    const groupViews = [...views.values()]
      .filter(view => view.group === group)
      .sort((a, b) => a.channelIndex - b.channelIndex);
    if (groupViews.length === 0) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    const rows = document.createElement('div');
    rows.className = 'contrast-rows';
    for (const view of groupViews) {
      const row = document.createElement('div');
      row.className = 'contrast-row';
      row.dataset.viewId = view.id;
      const channelLabel = document.createElement('span');
      channelLabel.className = 'contrast-channel-label';
      channelLabel.textContent = view.label;
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
      row.append(channelLabel, lutSelect, rangeButton);
      rows.appendChild(row);
    }
    panel.appendChild(rows);
  }
  function mountContrastPanels() {
    mountPanelRows(elements.sourcePanel, 'source');
    mountPanelRows(elements.referencePanel, 'reference');
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
    if (event.target.closest?.('.contrast-row button')) return;
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
        view.display = {lut:'gray', min, max};
        views.set(view.id, view);
      }
      mountContrastPanels();
    },
    reset() {
      closePopover();
      views.clear();
      selectedId = null;
      elements.sourcePanel.replaceChildren();
      elements.referencePanel.replaceChildren();
      elements.sourcePanel.hidden = true;
      elements.referencePanel.hidden = true;
    },
    redrawGroup(group) {
      redrawGroupDisplay(group, {resetView:false});
    },
  };
}

export {LUT_OPTION_LABELS, createContrastController};
