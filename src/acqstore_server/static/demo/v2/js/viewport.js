// Interactive zoom/pan viewport for channel canvas elements.
import {clamp} from './util.js';

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
    // Screen-space rectangle of the drawn image (same as Axes frame).
    const imgLeft = offsetX;
    const imgTop = offsetY;
    const imgRight = offsetX + imageWidth * scaleX;
    const imgBottom = offsetY + imageHeight * scaleY;
    const imgWidth = Math.max(1, imgRight - imgLeft);
    const imgHeight = Math.max(1, imgBottom - imgTop);
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
      ctx.fillRect(x0, imgTop, Math.max(1, x1 - x0), imgHeight);
      ctx.beginPath();
      ctx.moveTo(x0 + 0.5, imgTop);
      ctx.lineTo(x0 + 0.5, imgBottom);
      ctx.moveTo(x1 + 0.5, imgTop);
      ctx.lineTo(x1 + 0.5, imgBottom);
      ctx.stroke();
    } else if (mode === 'axisV') {
      const y0 = Math.min(axisStart.y, axisCurrent.y);
      const y1 = Math.max(axisStart.y, axisCurrent.y);
      ctx.fillRect(imgLeft, y0, imgWidth, Math.max(1, y1 - y0));
      ctx.beginPath();
      ctx.moveTo(imgLeft, y0 + 0.5);
      ctx.lineTo(imgRight, y0 + 0.5);
      ctx.moveTo(imgLeft, y1 + 0.5);
      ctx.lineTo(imgRight, y1 + 0.5);
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

export {createImageViewport, PLOT_MARGIN};
