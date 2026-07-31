# Developer Roadmap v3: High-Performance Canvas Engine & Split Viewport Architecture

This developer roadmap provides a modular production implementation for an interactive HTML5 2D Canvas with Plotly-style navigation (**mouse wheel zoom**, **click-and-drag box zoom**, **double-click view reset**, and **touch pinch-to-zoom**) alongside a NiceGUI-style **drag-resizable split-pane container**.

---

## Technical Overview & Objectives

1. **Interactive Canvas Viewport Architecture**:
   - **Mouse Wheel Zoom**: Cursor-anchored focal point zoom transformation.
   - **Click + Drag Box Zoom**: Selection rectangle ROI zooming with bounding-box-to-viewport translation matrix fitting.
   - **Touch Pinch-to-Zoom & Pan**: Multi-touch pointer tracking for mobile/tablet gesture interaction.
   - **Double-Click View Reset**: Smooth or instantaneous reset to initial centered scale and offset.
   - **Coordinate Mapping API**: Bidirectional mapping between DOM screen coordinates and underlying image/scatter pixels.

2. **Split-Pane Layout Component**:
   - Touch and mouse compatible drag-to-resize divider element.
   - Boundary constraints and dynamic canvas resolution (`canvas.width` / `canvas.height`) synchronization to avoid stretch blurring.

---

## 1. Complete Canvas Engine Implementation

```javascript
/**
 * Advanced Interactive Canvas Viewport Controller
 * Supports: Wheel Zoom, Box Zoom, Multi-Touch Pinch-to-Zoom, Right-Click/Middle-Click Pan,
 * Double-Click View Reset, and Scatter Overlay Rendering.
 */
class CanvasViewportEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {string} imageSrc - Path or URL to the underlying image asset
   * @param {Array<{x: number, y: number, radius?: number, color?: string}>} scatterPoints
   */
  constructor(canvas, imageSrc, scatterPoints = []) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.image = new Image();
    this.image.src = imageSrc;
    this.scatterPoints = scatterPoints;

    // Viewport Matrix State
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    // Default Home Viewport Bounds (for double-click reset)
    this.initialState = { scale: 1, offsetX: 0, offsetY: 0 };

    // Interaction Modes: 'none', 'pan', 'boxZoom', 'touchPinch'
    this.mode = 'none';
    this.activeTool = 'boxZoom'; // Primary click drag action: 'boxZoom' or 'pan'

    // Mouse Tracking State
    this.dragStart = { x: 0, y: 0 };
    this.dragCurrent = { x: 0, y: 0 };

    // Multi-touch Tracking State
    this.activeTouches = new Map();
    this.initialPinchDistance = 0;
    this.initialPinchScale = 1;

    this.image.onload = () => {
      this.resetView();
    };

    this.initEventListeners();
  }

  /**
   * Recalculates canvas dimensions and centers the image in the viewport.
   */
  resetView() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
    }

    if (this.image.naturalWidth > 0 && this.canvas.width > 0) {
      const scaleX = this.canvas.width / this.image.naturalWidth;
      const scaleY = this.canvas.height / this.image.naturalHeight;
      this.scale = Math.min(scaleX, scaleY) * 0.9;

      this.offsetX = (this.canvas.width - this.image.naturalWidth * this.scale) / 2;
      this.offsetY = (this.canvas.height - this.image.naturalHeight * this.scale) / 2;

      // Save baseline state for double-click view reset
      this.initialState = {
        scale: this.scale,
        offsetX: this.offsetX,
        offsetY: this.offsetY
      };
    }
    this.draw();
  }

  /**
   * Binds mouse, touch, pointer, and window resizing listeners.
   */
  initEventListeners() {
    // -------------------------------------------------------------
    // 1. Mouse Wheel Zoom (Cursor-Anchored)
    // -------------------------------------------------------------
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = 1.12;
      const mouseX = e.offsetX;
      const mouseY = e.offsetY;

      const newScale = e.deltaY < 0 ? this.scale * zoomFactor : this.scale / zoomFactor;
      if (newScale < 0.05 || newScale > 200) return;

      // Transform translation offsets to keep world coordinate under cursor static
      this.offsetX = mouseX - (mouseX - this.offsetX) * (newScale / this.scale);
      this.offsetY = mouseY - (mouseY - this.offsetY) * (newScale / this.scale);
      this.scale = newScale;

      this.draw();
    }, { passive: false });

    // -------------------------------------------------------------
    // 2. Double-Click View Reset
    // -------------------------------------------------------------
    this.canvas.addEventListener('dblclick', (e) => {
      e.preventDefault();
      this.resetView();
    });

    // -------------------------------------------------------------
    // 3. Mouse Down Interactions (Box Zoom vs Pan)
    // -------------------------------------------------------------
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      this.dragCurrent = { ...this.dragStart };

      // Right-click (2), Middle-click (1), or explicit Pan Tool setting triggers Pan
      if (e.button === 1 || e.button === 2 || this.activeTool === 'pan') {
        this.mode = 'pan';
      } else if (e.button === 0 && this.activeTool === 'boxZoom') {
        this.mode = 'boxZoom';
      }
    });

    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    // -------------------------------------------------------------
    // 4. Global Mouse Move & Mouse Up Handling
    // -------------------------------------------------------------
    window.addEventListener('mousemove', (e) => {
      if (this.mode === 'none') return;

      const rect = this.canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      if (this.mode === 'pan') {
        const dx = currentX - this.dragCurrent.x;
        const dy = currentY - this.dragCurrent.y;
        this.offsetX += dx;
        this.offsetY += dy;
        this.dragCurrent = { x: currentX, y: currentY };
      } else if (this.mode === 'boxZoom') {
        this.dragCurrent = { x: currentX, y: currentY };
      }

      this.draw();
    });

    window.addEventListener('mouseup', () => {
      if (this.mode === 'boxZoom') {
        this.applyBoxZoom(this.dragStart, this.dragCurrent);
      }
      this.mode = 'none';
      this.draw();
    });

    // -------------------------------------------------------------
    // 5. Touch / Pointer Events (Pinch-to-Zoom & Touch Pan)
    // -------------------------------------------------------------
    this.canvas.addEventListener('pointerdown', (e) => {
      this.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.activeTouches.size === 2) {
        this.mode = 'touchPinch';
        const points = Array.from(this.activeTouches.values());
        this.initialPinchDistance = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y
        );
        this.initialPinchScale = this.scale;
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.activeTouches.has(e.pointerId)) return;
      this.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.mode === 'touchPinch' && this.activeTouches.size === 2) {
        const points = Array.from(this.activeTouches.values());
        const currentDistance = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y
        );

        if (this.initialPinchDistance > 0) {
          const rect = this.canvas.getBoundingClientRect();
          const midpointX = ((points[0].x + points[1].x) / 2) - rect.left;
          const midpointY = ((points[0].y + points[1].y) / 2) - rect.top;

          const newScale = this.initialPinchScale * (currentDistance / this.initialPinchDistance);
          if (newScale >= 0.05 && newScale <= 200) {
            this.offsetX = midpointX - (midpointX - this.offsetX) * (newScale / this.scale);
            this.offsetY = midpointY - (midpointY - this.offsetY) * (newScale / this.scale);
            this.scale = newScale;
          }
        }
        this.draw();
      }
    });

    const handlePointerEnd = (e) => {
      this.activeTouches.delete(e.pointerId);
      if (this.activeTouches.size < 2 && this.mode === 'touchPinch') {
        this.mode = 'none';
      }
    };

    this.canvas.addEventListener('pointerup', handlePointerEnd);
    this.canvas.addEventListener('pointercancel', handlePointerEnd);
  }

  /**
   * Executes box zoom by fitting the bounding selection rectangle into the viewport.
   */
  applyBoxZoom(start, end) {
    const xMin = Math.min(start.x, end.x);
    const xMax = Math.max(start.x, end.x);
    const yMin = Math.min(start.y, end.y);
    const yMax = Math.max(start.y, end.y);

    const boxWidth = xMax - xMin;
    const boxHeight = yMax - yMin;

    // Minimum drag threshold in pixels to prevent micro-clicks from triggering zoom
    if (boxWidth < 12 || boxHeight < 12) return;

    const scaleX = this.canvas.width / boxWidth;
    const scaleY = this.canvas.height / boxHeight;
    const scaleMultiplier = Math.min(scaleX, scaleY);

    const newScale = this.scale * scaleMultiplier;

    // Map screen selection top-left back to world coordinates
    const worldX = (xMin - this.offsetX) / this.scale;
    const worldY = (yMin - this.offsetY) / this.scale;

    this.scale = newScale;
    this.offsetX = -worldX * this.scale;
    this.offsetY = -worldY * this.scale;
  }

  /**
   * Bidirectional Mapping: Maps DOM screen coordinates to underlying image pixel coordinates.
   */
  screenToImageCoords(screenX, screenY) {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale
    };
  }

  /**
   * Core Rendering Loop
   */
  draw() {
    // Clear display buffer
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    // Apply viewport scale and translation matrix
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    // 1. Draw Base 2D Image
    if (this.image.complete && this.image.naturalWidth > 0) {
      this.ctx.drawImage(this.image, 0, 0);
    }

    // 2. Draw Scatter Overlay Points
    this.scatterPoints.forEach(point => {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, point.radius || 4, 0, Math.PI * 2);
      this.ctx.fillStyle = point.color || 'rgba(235, 60, 60, 0.85)';
      this.ctx.fill();
      this.ctx.lineWidth = 1 / this.scale; // Maintain constant 1px stroke scale
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.stroke();
    });

    this.ctx.restore();

    // 3. Render Active Box Zoom Selection Rectangle (in Screen Space)
    if (this.mode === 'boxZoom') {
      const x = Math.min(this.dragStart.x, this.dragCurrent.x);
      const y = Math.min(this.dragStart.y, this.dragCurrent.y);
      const w = Math.abs(this.dragCurrent.x - this.dragStart.x);
      const h = Math.abs(this.dragCurrent.y - this.dragStart.y);

      this.ctx.strokeStyle = '#007acc';
      this.ctx.lineWidth = 2;
      this.ctx.fillStyle = 'rgba(0, 122, 204, 0.18)';
      this.ctx.fillRect(x, y, w, h);
      this.ctx.strokeRect(x, y, w, h);
    }
  }
}
```

---

## 2. Split-Pane Container Component

### HTML Structure

```html
<div class="split-viewport" id="splitViewport">
  <div class="pane pane-left" id="leftPane">
    <canvas id="viewportCanvas"></canvas>
  </div>
  <div class="split-divider" id="splitDivider"></div>
  <div class="pane pane-right" id="rightPane">
    <div class="inspector-panel">
      <h3>Data Inspector</h3>
      <p>Double-click the canvas to reset view. Pinch or scroll wheel to zoom.</p>
    </div>
  </div>
</div>
```

### Resizer Controller Script

```javascript
/**
 * Configures a mouse & touch drag-resizable split pane divider
 */
function initSplitPaneDivider(dividerId, leftPaneId, canvasEngineInstance) {
  const divider = document.getElementById(dividerId);
  const leftPane = document.getElementById(leftPaneId);
  const container = divider.parentElement;

  let isDragging = false;

  const startDrag = () => {
    isDragging = true;
    divider.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onDrag = (clientX) => {
    if (!isDragging) return;

    const rect = container.getBoundingClientRect();
    let newWidth = clientX - rect.left;

    const minWidth = 150;
    const maxWidth = rect.width - 150;

    if (newWidth < minWidth) newWidth = minWidth;
    if (newWidth > maxWidth) newWidth = maxWidth;

    leftPane.style.width = `${newWidth}px`;

    // Rescale canvas drawing buffer and redraw
    if (canvasEngineInstance) {
      canvasEngineInstance.resetView();
    }
  };

  const stopDrag = () => {
    if (isDragging) {
      isDragging = false;
      divider.classList.remove('active');
      document.body.style.cursor = 'default';
      document.body.style.removeProperty('user-select');
    }
  };

  divider.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', (e) => onDrag(e.clientX));
  window.addEventListener('mouseup', stopDrag);

  // Touch Support for Resizer
  divider.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) startDrag();
  });
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) onDrag(e.touches[0].clientX);
  });
  window.addEventListener('touchend', stopDrag);
}
```
