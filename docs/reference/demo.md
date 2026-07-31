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

The demo intentionally exercises the open → display → replace-session baseline:

1. `POST /api/v2/pick-and-open` (**Open File** in the UI)
2. `GET /api/v2/sessions/{sessionId}`
3. fetch each source `channels[].dataUrl`
4. fetch each optional `reference.channels[].dataUrl`
5. decode raw little-endian float32 data
6. validate `byteLength` and `plane.shape`
7. transpose immediately before canvas display
8. optional reference `scanPath` / `lineRoi` overlay (display-only)
9. display-only contrast (LUT + intensity range) on stored float planes
10. interactive per-image navigation (wheel/pinch zoom; square images: drag a square region to zoom; non-square: H/V axis-zoom drag; Shift+pan; double-click home; unequal planes stretch-fill the wrap)
11. optional per-group **Composite** (source and reference independently): channel 0 green + channel 1 magenta from each channel’s range
12. optional per-pane **Axes** ticks in physical units from `plane.axes` (adaptive major/minor; Y is 0 at bottom after display transpose)
13. `DELETE /api/v2/sessions/{sessionId}` automatically when opening a new file (the UI no longer has a Delete session button)

Clients should still call `GET /api/v2/health` and `GET /api/v2/capabilities` when building their own apps (formats, binary encoding, session TTL). The maintained demo no longer surfaces those responses in the page chrome.

The maintained demo UI does not expose `POST /api/v2/open`. That path remains part of the HTTP API for other clients (see the [API reference](api.md) and [Build a client](../llm/build-a-client.md)).

The server uses AcqStore and `AcqImage` to open the acquisition. The demo displays source channels, optional reference channels, the AcqStore header, live session metadata (collapsed), and the full open response (collapsed).

## Orientation

The API returns the original row-major two-dimensional plane. The server never transposes it.

Immediately before canvas rendering, the demo calls `transposePlane()` for both source and reference planes. This is a demo display decision and does not alter the HTTP contract.

## Display-only controls

Contrast (per-channel LUT + min/max range), per-pane **Composite** (fixed green/magenta for ch0/ch1), and the reference scan-path overlay affect display only. They do not change the underlying image data or HTTP responses.

## Compatibility

Keep this demo synchronized with the API reference, JavaScript guide, and OpenAPI contract tests.
