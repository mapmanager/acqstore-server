# Graft kit — neuronal calcium linescan

Authoritative **additive payload** for Phase B grafts. Policy and handoff
contract: [`../docs/acqstore-server-additions.md`](../docs/acqstore-server-additions.md).

## What is the “proof adapter”?

Not `archive/index.monolith.html`.

| Term | Path | Role |
|------|------|------|
| Archive monolith | `src/acqstore_server/static/demo/v2/archive/index.monolith.html` | Upstream viewer **behavior** + `LLM_COPY` markers; includes demo **split-pane** (do **not** paste into grafts) |
| Proof adapter | DROPIN blocks inside `../linescan_analyzer_v1_18_acqstore_v2_e.html` | Host-safe packaging: collapsible disclosure card, scoped CSS, `AcqStoreReferenceView` API, `planeToRowMajor` |
| This graft-kit | `graft-kit/*` | Self-contained Phase B copy source (one-time extract from the proof adapter) |

Grafts use **disclosure triangle / collapsible card** only. Never split-pane.

## Files

| File | Copy policy |
|------|-------------|
| `load-card.html` | Verbatim — frozen Load File card |
| `reference-host.html` | Verbatim — empty `#acqstoreReferenceHost` |
| `reference-view.css` | Verbatim — inline into `<style>` |
| `reference-view.js` | Verbatim — inline into `<script>` before wiring |
| `load-wiring.template.js` | **Adapt** only the `setImage` call sites per Phase A |

## file:// requirement (critical)

Output grafts must open as `file://…html` in a browser (same as client originals).

- **Inline** CSS and JS into the monolith. Do **not** use `<link href="graft-kit/…">` or `<script src="graft-kit/…">` in the output (those break or are awkward under `file://`).
- Use `RV.mount(..., { injectCss: false })` when CSS is already inlined.
- AcqStore API calls still go to `http://127.0.0.1:8767` (server must be running). That is network I/O from a `file://` page, not a relative asset load.

## Load card layout (frozen)

Stable ids: `#acqstoreLoadCard`, `#acqstoreLoadBtn`, `#acqstoreLoadStatus`.

```text
┌─ AcqStore Server ─────────────────────────────┐
│                                               │
│   [ Load File ]    Idle                       │
│      (ok btn)      (status #acqstoreLoadStatus)│
│                                               │
└───────────────────────────────────────────────┘
```

Placement: sidebar sibling **after** the client’s primary load card, **before**
pixel-dimension / calibration card. No base-URL field. No large alert block.
Reuse host classes (`card`, `ok`, `mini`) — do not add unscoped card CSS.

## Reference viewer layout (disclosure only)

```text
┌─ ▸ No Reference Images ─┐   collapsed, no reference loaded
└─────────────────────────┘

┌─ ▸ 512×512 px | 0.29×0.29 µm | Y / X ─┐  collapsed title = plane meta
└──────────────────────────────────────┘

┌─ ▾ 512×512 px | 0.29×0.29 µm | Y / X ──────────┐  expanded
│  [Composite?] [Show scan path?] [Axes?]         │
│  ┌─ Channel 0 ──────────────┐ ┌─ Channel 1 ─┐ │
│  │  canvas + contrast/LUT    │ │  …          │ │
│  └──────────────────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────┘
```

Title text comes from archive monolith `formatPlaneMetaText` (disclosure `h2`,
visible when collapsed). Range popover matches monolith: title+Log, LUT-colored
histogram, one Min|Max|Auto row.

## Phase B insert order

1. Inline `reference-view.css` into existing `<style>` (marker-wrapped).
2. Insert `load-card.html` in sidebar (marker-wrapped).
3. Insert `reference-host.html` in main column near image display (marker-wrapped).
4. Append inlined `reference-view.js` near end of main `<script>`.
5. Append adapted `load-wiring.template.js`.
6. Wrap every additive block in `==== ACQSTORE ADDED … BEGIN/END ====` markers.
)
