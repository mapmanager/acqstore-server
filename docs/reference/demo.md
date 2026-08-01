# API v2 JavaScript demo

The maintained browser demo is the reference thin client for API v2. While AcqStore Server is running, open:

```text
http://127.0.0.1:8767/demo/v2/
```

It requires the packaged desktop application (or an equivalent running server). Use the live page as a **behavior** reference when building another client; you do not need application source code.

## Lifecycle exercised by the demo

The demo intentionally exercises the open → display → replace-session baseline:

1. `POST /api/v2/pick-and-open` (**Open File** in the UI)
2. `GET /api/v2/sessions/{sessionId}`
3. fetch each source `channels[].dataUrl`
4. fetch each optional `reference.channels[].dataUrl`
5. decode raw little-endian float32 data
6. validate `byteLength` and `plane.shape`
7. transpose immediately before canvas display
8. optional reference `scanPath` / `lineRoi` overlay (display-only; `scanPath` is `{x,y}` arrays, `lineRoi` is `[x0,y0,x1,y1]` in reference pixel space — see [API contract](api.md#lineroi-and-scanpath-examples))
9. display-only contrast (LUT + intensity range) on stored float planes
10. interactive per-image navigation (wheel/pinch zoom; square images: drag a square region to zoom; non-square: H/V axis-zoom drag; Shift+pan; double-click home; unequal planes stretch-fill the wrap)
11. optional per-group **Composite** (source and reference independently): each channel’s LUT + range, additive RGB clamp
12. optional per-pane **Axes** ticks in physical units from `plane.axes` (adaptive major/minor; Y is 0 at bottom after display transpose)
13. `DELETE /api/v2/sessions/{sessionId}` automatically when opening a new file (the UI no longer has a Delete session button)

Clients should still call `GET /api/v2/health` and `GET /api/v2/capabilities` when building their own apps (formats, binary encoding, session TTL). The maintained demo no longer surfaces those responses in the page chrome.

The maintained demo UI does not expose `POST /api/v2/open`. That path remains part of the HTTP API for other clients (see the [API reference](api.md) and [Build a client](../llm/build-a-client.md)).

The server uses AcqStore and `AcqImage` to open the acquisition. The demo displays source channels, optional reference channels, the AcqStore header, live session metadata (collapsed), and the full open response (collapsed).

## Orientation

The API returns the original row-major two-dimensional plane. The server never transposes it.

Immediately before canvas rendering, the demo calls `transposePlane()` for both source and reference planes. This is a demo display decision and does not alter the HTTP contract.

## Display-only controls

Contrast (per-channel LUT + min/max range), per-pane **Composite** (LUT-colorize each channel then add RGB), and the reference scan-path overlay affect display only. They do not change the underlying image data or HTTP responses.

## Compatibility

Keep this demo synchronized with the API reference, JavaScript guide, and OpenAPI contract tests.
