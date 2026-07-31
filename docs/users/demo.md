# Built-in demo

The app ships a small HTML/JavaScript demo. With the app running, open it from the status window (**Open demo**) or go to:

```text
http://127.0.0.1:8767/demo/v2/
```

![AcqStore Server demo page](../assets/demo-app-html.png)

The demo opens an acquisition and shows source and optional reference images, with display-only tools for contrast, composite color, and navigation.

## Open a file

1. Click **Open File** (native file dialog on the machine running the app).
2. Wait for the status line (for example `Loaded …: 2 channel(s).`).
3. The page shows **Contrast** controls (when channels are loaded), then a split image area: **Source channels** on top and **Reference channels** below when a reference attachment exists.
4. Opening another file replaces the previous demo session and loads the new one.
5. **Delete session** clears the current session when you are done.

Supported file types come from AcqStore at runtime. Prefer `GET /api/v2/capabilities` over hard-coding extensions (typical examples include `.tif`, `.oir`, `.czi`, `.nd2`, and OME-Zarr variants).

The line under the buttons shows API readiness and allowed formats.

## Contrast

After a file loads, a **Contrast** card appears above the images:

| Control | Purpose |
|---|---|
| **Channel** | Which channel the LUT and range apply to (every source and reference channel is listed). |
| **Color LUT** | False-color map when viewing individual channels (ignored while **Composite** is on). |
| **Range…** | Opens a popover with a log-scaled histogram, min/max fields, and **Auto**. |

Contrast is **display-only**. Changing LUT or range does not change the underlying image data or HTTP responses.

## Image layout

- **Source channels** and **Reference channels** appear in separate panes.
- When a reference image is present, drag the horizontal divider between the panes to resize them; the images grow and shrink with the panes.
- Unequal-aspect planes (typical kymographs) initially **stretch to fill** the view width and height. Square planes keep an aspect-preserving fit.
- On the reference pane, **Show scan path** (on by default when a path exists) draws the scan-path overlay.

## Composite

When a pane has two channels, a **Composite** checkbox appears in that pane’s heading (one control for source, one for reference):

- **Off** (default): one image per channel. Color LUT applies.
- **On**: that pane shows a single RGB image:
  - Channel 0 → **green**
  - Channel 1 → **magenta**
  - Each channel still uses its own intensity **min/max** from Contrast / Range / Auto.
  - Color LUT is ignored while compositing.
- Composite works for two channels only; it is not implemented for three or more.

## Navigation

You can navigate each image independently:

| Gesture | Action |
|---|---|
| Mouse wheel or pinch | Zoom toward the cursor |
| Drag mostly left/right or up/down | Axis-zoom: select a horizontal or vertical span and zoom that axis |
| **Shift** + drag | Pan |
| Double-click | Reset to the home fit for that image |

## JSON sections

Below the images, three collapsed sections show server payloads:

1. **AcqStore header** — acquisition header from the open response  
2. **Open response** — full open payload  
3. **Session** — live session metadata  

All three start minimized; expand a section to inspect the JSON.

To build your own page, start with [Build a client](../llm/build-a-client.md). More technical notes: [Reference demo](../reference/demo.md).
