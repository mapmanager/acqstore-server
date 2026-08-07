# AcqStore Server additions — linescan analyzer v1.18 file-pair analysis

Analysis of the reference **before / after** pair used to graft AcqStore Server
API v2 loading and an owned reference-image viewer into a client-supplied
neuronal calcium linescan analyzer monolith.

**Authority:** this file is the handoff / graft-analysis contract for this
client line. The paste-ready user prompt lives in the graft packet
(`PROMPT.md` / `START_HERE.md`); it is not a substitute for this document.

**Purpose for future work:** when a new client monolith arrives, use this
document to (1) check whether the load→analysis handoff surface still matches,
and (2) produce a new output monolith that is the client HTML plus the same
class of additive AcqStore blocks. The client original is always read-only;
output is always a new file.

**Output must load as `file://`** in a browser (inline all AcqStore CSS/JS; no
`<script src>` / `<link>` to graft-kit paths).

Phase B additive payload: `graft-kit/` in this packet.

---

## How to use (Phase A → Phase B)

### Phase A — Handoff audit (report only; no HTML write yet)

Inspect the client monolith against §0, §4.4, and §7. Report
PASS / PASS WITH WARNINGS / FAIL with the setter mapping.

### Phase B — Graft

Always allowed after Phase A (including after FAIL).

- On **PASS** or **PASS WITH WARNINGS**: proceed normally.
- On **FAIL**: you may still run Phase B, but the LLM must show a **large
  disclaimer** that Phase A failed and the grafted HTML may be incorrect or
  non-functional. Then proceed only if the user confirms.

**Produce:** a **new** standalone HTML file =

1. Exact client monolith bytes, plus
2. Additive inserts from `graft-kit/`:
   - `reference-view.css` (inlined)
   - `load-card.html` (frozen layout)
   - `reference-host.html`
   - `reference-view.js` (inlined; collapsible disclosure card)
   - `load-wiring.template.js` (**adapt** setter call only)

**Hard rules:** marker-wrap all inserts; never overwrite the client original;
never invent a reference viewer; reference UI is a disclosure card only;
output must open via `file://`; deliver Phase B as a **downloadable file**
(not pasted into chat).

---

## 0. Normative graft policy (locked)

These rules are required for future grafts (not merely “how v1.18 happened”):

1. **Channel roles are a client adapter, not API law.** AcqStore guarantees
   source channel **index order** in `payload.channels`. Mapping index →
   analysis role (e.g. v1.18 `ocamp` / `fitc`) lives only in LOAD WIRING and
   must be re-verified against each new client’s first/second-channel
   semantics before copying wiring verbatim.
2. **Hard naming separation.** Client UI text “Vessels / reference channel”
   means an optional second **source** analysis channel. AcqStore JSON
   `reference` means a separate 2D reference frame (+ optional scan path).
   Never feed `payload.reference` into the analysis image setter. Confusing
   the two is a graft failure.
3. **This document is the analysis source of truth** for handoff stability and
   additive structure. Outdated `README_*.md` files in the parent folder are
   not authoritative.
4. **More than two source channels:** if `payload.channels.length > 2` and the
   client only supports dual-channel analysis (as v1.18 does), hand off
   channels `[0]` and `[1]` as usual **and warn in the load status** that
   extras were ignored. Do not fail the whole load unless the new client
   truly cannot accept a dual subset. If a future client supports N>2, adapt
   wiring to pass all supported channels instead of warning-and-truncating.

---

## 1. Process rules (from the file pair)

Required for any future graft:

1. **Do not edit** the client-supplied original. Keep it under `client_originals/`.
2. **Write a new** standalone HTML that contains **all** of the original client
   markup/JS/CSS.
3. AcqStore changes are **additive only**, wrapped in dated markers:
   - `<!-- ==== ACQSTORE ADDED … BEGIN … ==== -->`
   - `/* ==== ACQSTORE ADDED … BEGIN … ==== */`
4. Two separate additive concerns:
   - **Load + handoff** — open via AcqStore Server; pass primary (source) image
     data into the client’s existing load/setter path.
   - **Reference viewer** — if open JSON includes `reference`, display it in an
     AcqStore-owned collapsible GUI (not the client analysis pipeline).

### Additive purity (verified)

| | Original | Grafted |
|--|----------|---------|
| Lines | 5236 | 7363 |
| Chars | 380607 | 456942 |

The original character stream is a **100% subsequence** of the grafted file
(every original byte appears in order). Stripping the five AcqStore marker
blocks leaves the original plus one incidental blank line near the load-card
insertion. No client analysis logic was rewritten in place.

---

## 2. Inventory of additive blocks

Five regions in `linescan_analyzer_v1_18_acqstore_v2_e.html`
(markers dated `2026-08-01 00:50 EDT`):

| # | Marker | Where | What |
|---|--------|-------|------|
| 1 | `DROPIN CSS` | Inside existing `<style>` (~L222–465) | Scoped CSS for `.acqstore-ref-root` reference UI |
| 2 | `LOAD CARD` | Sidebar, after client `#box1` (~L490–498) | “AcqStore Server” card: Load File + status |
| 3 | `REFERENCE HOST` | Main column, after Image Display, before Trace Display (~L676–678) | Empty `#acqstoreReferenceHost` |
| 4 | `DROPIN JS` | End of main `<script>` (~L5495–7254) | `window.AcqStoreReferenceView` (fetch helpers + reference viewer) |
| 5 | `LOAD WIRING` | Immediately after drop-in JS (~L7256–7359) | Mount + button handler: open → handoff → reference → session delete |

Client native paths (file inputs, `loadDualChannelFiles`, demo, reset, analysis)
remain present and functional.

---

## 3. Loader card GUI and API v2 open payload

### 3.1 GUI

Additive card `#acqstoreLoadCard` (sibling after “1. Load Image”, before
“2. Define Pixel Dimensions”):

- Heading: **AcqStore Server**
- Controls: `#acqstoreLoadBtn` (“Load File”) + `#acqstoreLoadStatus` (default
  “Idle”)
- No URL field; wiring mounts with `apiBase: 'http://127.0.0.1:8767'`
- Does not remove or disable the client’s TIFF/file load card

### 3.2 Request sequence (LOAD WIRING)

On startup:

```text
AcqStoreReferenceView.mount(#acqstoreReferenceHost, {
  apiBase: 'http://127.0.0.1:8767',
  injectCss: false   // CSS already inlined in DROPIN CSS
})
```

On **Load File**:

```text
1. GET  /api/v2/health                         (RV.health)
2. POST /api/v2/pick-and-open  body {}         (RV.pickAndOpen)
3. loadPrimary(payload)                        // §4 — analysis handoff
4. RV.setFromOpenPayload(payload)              // §5 — reference GUI
5. DELETE /api/v2/sessions/{sessionId}         (best-effort; after binaries in memory)
```

Cancel from the native picker is handled as `err.payload.error === 'cancelled'`
(HTTP 200 with `ok: false` per API contract), not as a hard failure.

Status on success: source label · N source channels · optional M reference
channels. If N > 2 on a dual-only client, status must also warn that only
ch0/ch1 were handed to analysis (§0.4).

### 3.3 Open JSON used by this graft

Successful open body (both `pick-and-open` and `open`) — fields this file pair
actually consumes:

| Field | Role in graft |
|-------|----------------|
| `sessionId` | Session cleanup after fetch |
| `source` | Display / status label (`sourceFileLabel`) |
| `plane.shape` | `[rows, cols]` for source plane decode |
| `plane.axes` | Optional fill of `#msPerLine` / `#umPerPixel` (+ range twins) |
| `channels[]` | Primary source channels: `index`, `byteLength`, `dataUrl` |
| `reference` | `null` or `{ plane, channels[], lineRoi?, scanPath? }` for §5 only |

Binary planes: `GET` each `dataUrl` as raw little-endian **float32**,
row-major, length-checked against `byteLength` and
`plane.shape[0] * plane.shape[1]`. Server does not transpose.

`header` is present in the API contract but is **not** used by the v1.18 load
wiring.

Illustrative shapes: see `docs/reference/api.md` (“Successful open response”,
“Reference image”).

### 3.4 Naming footgun (hard rule — see §0.2)

In the **client** UI, the optional second **source** file input is labeled
“Vessels / reference channel”. That is still a **source** analysis channel
(`state.channels.fitc`), same shape as Calcium linescan data.

In the **AcqStore** open JSON, `reference` is a separate object: a 2D reference
frame (often square) with its own `plane` / `channels` and optional
`lineRoi` / `scanPath`. It is **not** passed to `setImage` in this file pair
and must never be in future grafts either.

---

## 4. Architecture: primary load → client handoff (critical)

This is the contract future LLMs must re-validate on new client monoliths.

### 4.1 Client native load architecture (unchanged)

Native path in the original:

```text
#ocampFileInput [+ optional #fitcFileInput]
        → loadDualChannelFiles()
        → rasterFileToArray() / parseTiff()
        → row-major raw[y][x]  (Float32Array rows typical)
        → setImage(raw, name, opts?)
```

`setImage` is the single analysis entry point. It:

- Sets `state.raw`, `state.height` / `state.width` from `raw.length` /
  `raw[0].length`
- Sets `state.dualMode` and `state.channels` (`ocamp` / `fitc` names)
- Clears ROIs, events, bleedthrough, caches
- Enables Analyze / exports, opens `#box2` (pixel dimensions), updates UI

Native call shapes:

```text
Single:
  setImage(ocamp, fileName)

Dual:
  setImage(ocamp, label, {
    dualMode: true,
    channels: { ocamp, fitc, ocampName, fitcName }
  })
```

Native dual load also forces `imageViewMode` and an extra `renderImage()` after
`setImage`. AcqStore wiring calls `setImage` only and relies on `setImage`’s
own `updateChannelViewTabs` / `recomputeImages` side effects.

### 4.2 What the graft inserts (LOAD WIRING `loadPrimary`)

v1.18 **adapter** mapping (client-specific; see §0.1): index 0 → `ocamp`
(Calcium / analysis), index 1 → `fitc` (Vessels). Re-map if a new client uses
different setter names or role order.

```text
payload.channels[0]  → fetchPlane → planeToRowMajor → rows0
payload.channels[1]? → fetchPlane → planeToRowMajor → rows1

if one channel:
  setImage(rows0, sourceLabel)

if two or more (dual-channel clients: use index 0 and 1 only):
  setImage(rows0, sourceLabel, {
    dualMode: true,
    channels: {
      ocamp: rows0,
      fitc: rows1,
      ocampName: sourceLabel + ' ch0',
      fitcName: sourceLabel + ' ch1',
    },
  })
  if channels.length > 2: warn in status that extras were ignored  // §0.4
    (v1.18 proof is silent; new grafts must warn)

then applyPlaneAxes(payload.plane)  // fills calibration inputs if DOM ids exist
```

`planeToRowMajor` builds `out[r] = Float32Array` of length `cols` from a flat
Float32Array — the same `raw[y][x]` layout the TIFF decoder feeds `setImage`.

Calibration fill (`applyPlaneAxes`):

- `axes[arrayDimension===0].step` → `#msPerLine` / `#msPerLineRange`
  (seconds → ms when unit is s/sec/…)
- `axes[arrayDimension===1].step` → `#umPerPixel` / `#umPerPixelRange`
  (m/mm/nm → µm as needed)
- Calls `updateCalInfo()` if defined
- Does **not** auto-click “Apply pixel dimensions”; user still applies

Session delete runs only after source + reference binaries have been fetched
into memory; subsequent UI work does not need the HTTP session.

### 4.3 Data-flow diagram

```text
POST /api/v2/pick-and-open
            │
            ▼
     open JSON payload
     ┌──────┴───────┐
     │              │
payload.channels   payload.reference
+ payload.plane    (+ reference.plane, …)
     │              │
     ▼              ▼
fetch + row-major  setFromOpenPayload
     │              (owned reference GUI, §5)
     ▼
 setImage(...)     ← existing client architecture
     │
     ▼
 ROI / F/F₀ / epochs / export (unchanged client code)
```

### 4.4 Handoff stability checklist (for a new client HTML)

Re-check these against the **new** client before copying LOAD WIRING verbatim:

| Check | v1.18 example | Policy |
|-------|---------------|--------|
| Global (or reachable) setter accepting row-major `raw[y][x]` | `setImage(raw, name, opts)` | Required shape; name may differ |
| Dual channel via options on that setter | `opts.dualMode` + `opts.channels.{ocamp,fitc,…}` | Re-verify option shape |
| First / second source channel → client roles | `ocamp` / `fitc` | **Adapter only** (§0.1); re-map per client |
| Setter resets analysis state / enables downstream UI | Yes, inside `setImage` | Required behavior |
| Optional calibration element ids | `#msPerLine`, `#msPerLineRange`, `#umPerPixel`, `#umPerPixelRange` | Fill if present |
| Native file load still works after additive graft | `#box1` left intact | Required |
| `payload.reference` never enters analysis setter | Not passed to `setImage` | **Hard rule** (§0.2) |
| `channels.length > 2` on dual-only clients | Proof silent-ignores | **Warn + use ch0/ch1** (§0.4) |

If the setter name, option shape, channel role names, or array layout differ,
adapt **only** the thin LOAD WIRING call site. Do not rewrite client analysis
code and do not reinvent the reference viewer.

### 4.5 Proof-file gaps vs normative policy

- v1.18 proof **silently** ignores source channels beyond index 1; new grafts
  must **warn** in status (§0.4).
- Role names `ocamp`/`fitc` are client vocabulary in wiring, not AcqStore API
  fields (§0.1).
- No dimension-mismatch check between ch0 and ch1 in the AcqStore path (native
  dual load does check). Relies on server serving matched source planes.

---

## 5. Additive reference image viewer

Fully AcqStore-owned. Orthogonal to §4.

### 5.1 Mount surface

- Empty host `#acqstoreReferenceHost` in the main column (after Image Display).
- Drop-in `mount` injects `#acqstoreReferenceCard`:
  `class="card collapsible collapsed acqstore-ref-root"`, title
  **Reference Images**.
- Disclosure: click the card’s top-level `<h2>` to toggle `.collapsed`. Uses
  the host page’s existing `.card.collapsible` caret CSS (▸/▾); drop-in CSS
  suppresses nested `h2::after` carets inside the reference card.

### 5.2 What `setFromOpenPayload` does

1. Clears prior views.
2. If `payload.reference` absent/null: collapse card; empty state.
3. If present:
   - Expand card **before** creating canvases (avoids zero-height / offset
     layout).
   - Fetch each `reference.channels[i]` with `reference.plane`.
   - Mount N panels (composite optional), per-channel contrast / LUT / range
     histogram, optional scan-path overlay (`scanPath` preferred over
     `lineRoi`), axes toggle, Save PNG, pan/zoom interactions.
4. Returns mounted reference view count (for status text).

Display orientation inside the viewer (not the linescan `setImage` path): API
row-major → `transposePlane` for canvas → Y-flip in viewport draw. Overlay
geometry stays in AcqStore reference pixel space and follows that display
transform.

### 5.3 Provenance note

Treat `graft-kit/reference-view.js` and `reference-view.css` as owned AcqStore
UI: graft them additively (inline for `file://`); do not reinvent the viewer
and do not patch client analysis to render reference images.

### 5.4 Separation from handoff

| | Primary → `setImage` | Reference viewer |
|--|----------------------|------------------|
| Input | `payload.channels` + `payload.plane` | `payload.reference` |
| Owner | Client analysis | AcqStore drop-in |
| Purpose | F/F₀ / ROI / epoch analysis | Inspect reference frame + scan path |
| What may change per new client | LOAD WIRING call into client setter | Prefer leave viewer core unchanged |

---

## 6. Graft recipe (once §4 checklist passes)

1. Copy the new client original to a **new** output path (never overwrite
   `client_originals/`).
2. Insert the five additive blocks in the same relative places as this proof.
3. Keep DROPIN CSS/JS as the reference viewer implementation.
4. Adjust **only** LOAD WIRING so decoded source planes call the client’s real
   setter with the correct single/dual option shape.
5. Verify: native load still works; AcqStore Load File fills analysis state and
   (when present) expands the reference disclosure; client bytes otherwise
   unchanged (subsequence check).

---

## 7. Re-validation prompts for the next client monolith

Ask these against the new HTML before grafting (do not assume v1.18 identifiers).
Policy answers for (2) and (5) are already locked in §0; the questions are for
*discovery* of the new client’s surface:

1. What function is the analysis image entry point, and what is its dual-channel
   option shape?
2. How does that client name / order the analysis channel vs optional second
   **source** channel? (Map AcqStore indices → those roles in LOAD WIRING only;
   do not treat role names as API fields — §0.1. Do not confuse with AcqStore
   `reference` — §0.2.)
3. Are calibration controls still `#msPerLine` / `#umPerPixel` (and ranges)?
4. Does the client already define ids that collide with `#acqstoreReferenceHost`
   / `#acqstoreReferenceCard` / `#acqstoreLoadBtn`?
5. Does the client support more than two source channels? If no: warn + hand off
   ch0/ch1 when `channels.length > 2` (§0.4). If yes: pass all supported
   channels through the client setter instead of truncating.
)
