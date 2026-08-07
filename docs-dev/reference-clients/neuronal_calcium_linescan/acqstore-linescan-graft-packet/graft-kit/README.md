# Graft kit — neuronal calcium linescan

Authoritative **additive payload** for Phase B. Policy:
`docs/acqstore-server-additions.md` (in this packet: same relative `docs/` folder).

Reference UI is a **collapsible disclosure card** only (`#acqstoreReferenceCard`).

## Files

| File | Copy policy |
|------|-------------|
| `load-card.html` | Verbatim — frozen Load File card |
| `reference-host.html` | Verbatim — empty `#acqstoreReferenceHost` |
| `reference-view.css` | Verbatim — inline into `<style>` |
| `reference-view.js` | Verbatim — inline into `<script>` before wiring |
| `load-wiring.template.js` | **Adapt** only the analysis setter call sites per Phase A |

## file:// requirement (critical)

Output grafts must open as `file://…html` in a browser.

- **Inline** CSS and JS into the monolith. Do **not** use `<link>` / `<script src>` to kit paths.
- Use `RV.mount(..., { injectCss: false })` when CSS is already inlined.
- AcqStore API calls go to `http://127.0.0.1:8767` (server must be running).

## Load card layout (frozen)

Stable ids: `#acqstoreLoadCard`, `#acqstoreLoadBtn`, `#acqstoreLoadStatus`.

```text
┌─ AcqStore Server ─────────────────────────────┐
│   [ Load File ]    Idle                       │
└───────────────────────────────────────────────┘
```

Placement: sidebar after the client’s primary load card, before calibration.
No base-URL field. Reuse host classes (`card`, `ok`, `mini`).

## Reference viewer (disclosure only)

```text
┌─ ▸ Reference Images · No Reference Images ───┐
└──────────────────────────────────────────────┘

┌─ ▾ Reference Images · 512×512 px | … | Y / X ─┐
│  [Composite?] [Show scan path?] [Axes?]        │
│  canvases + contrast / LUT / Range…             │
└────────────────────────────────────────────────┘
```

## Phase B insert order

1. Inline `reference-view.css` into existing `<style>` (marker-wrapped).
2. Insert `load-card.html` in sidebar (marker-wrapped).
3. Insert `reference-host.html` in main column near image display (marker-wrapped).
4. Append inlined `reference-view.js` near end of main `<script>`.
5. Append adapted `load-wiring.template.js`.
6. Wrap every additive block in `==== ACQSTORE ADDED … BEGIN/END ====` markers.
