# API v2 JavaScript demo

The maintained browser demo is the reference thin client for API v2:

```text
http://127.0.0.1:8767/demo/v2/
```

Its source is:

```text
src/acqstore_server/static/demo/v2/index.html
```

It requires a running AcqStore Server, either the packaged desktop application or a server started from source.

## Lifecycle exercised by the demo

The demo intentionally exercises the complete baseline client lifecycle:

1. `GET /api/v2/health`
2. `GET /api/v2/capabilities`
3. `POST /api/v2/pick-and-open` (**Open File** in the UI)
4. `GET /api/v2/sessions/{sessionId}`
5. fetch each source `channels[].dataUrl`
6. fetch each optional `reference.channels[].dataUrl`
7. decode raw little-endian float32 data
8. validate `byteLength` and `plane.shape`
9. transpose immediately before canvas display
10. optional reference `scanPath` / `lineRoi` overlay (display-only)
11. display-only contrast (LUT + intensity range) on stored float planes
12. interactive per-image navigation (wheel/pinch zoom, H/V axis-zoom drag, Shift+pan, double-click home; unequal planes stretch-fill the wrap)
13. optional per-group **Composite** (source and reference independently): ch0 green + ch1 magenta from each channel’s range
14. `DELETE /api/v2/sessions/{sessionId}` (explicit **Delete session**, or automatically when opening a new file)

The maintained demo UI does not expose `POST /api/v2/open`. That path remains part of the HTTP API for other clients.

The server uses AcqStore and `AcqImage` to open the acquisition. The demo displays source channels, optional reference channels, the AcqStore header, live session metadata (collapsed), and the full open response (collapsed).

## Orientation

The API returns the original row-major two-dimensional plane. The server never transposes it.

Immediately before canvas rendering, the demo calls `transposePlane()` for both source and reference planes. This is a demo display decision and does not alter the HTTP contract.

## Display-only controls

Contrast (per-channel LUT + min/max range), per-pane **Composite** (fixed green/magenta for ch0/ch1), and the reference scan-path overlay affect display only. They do not change the underlying image data or HTTP responses.

## Compatibility

The v2 demo is independent of the frozen v1 demo at `/demo/`. It contains no application-specific channel roles and is not tied to an external calcium client.

Keep this demo synchronized with the API reference, JavaScript guide, and OpenAPI contract tests.
