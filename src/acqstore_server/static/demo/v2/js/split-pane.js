// Top/bottom drag splitter between source and reference panes.
import {clamp} from './util.js';

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

export {createSplitPane};
