# WORKFLOW — Phase A then Phase B (LLM instructions)

You are grafting AcqStore Server support into a client neuronal calcium linescan
analyzer HTML. Follow this file exactly. Supporting contract:
`docs/acqstore-server-additions.md`. Additive payload: `graft-kit/`.

Allowed tools: Anthropic Claude, ChatGPT, or similar. No special IDE required.

---

## Global rules

1. The client HTML attachment is **read-only**. Output a **new** file name.
2. AcqStore changes are **additive only**, wrapped in markers:
   `==== ACQSTORE ADDED … BEGIN/END ====`.
3. Reference UI is a **collapsible disclosure card** from `graft-kit` only
   (`#acqstoreReferenceCard`). Do not invent another reference viewer.
4. Output must load as **`file://`**: **inline** `reference-view.css` and
   `reference-view.js`. Use `injectCss: false`. No `<script src>` / `<link>` to
   kit paths.
5. **Never paste the full grafted monolith into chat** (no full source dump,
   no HTML preview in the message). Phase B delivery depends on the host:

   - **ChatGPT / Claude web (download UI):** deliver **only** a downloadable
     **`.zip`** that contains the complete generated `.html`. Do **not** offer
     a raw `.html` download (ChatGPT web may try to render it).
   - **Cursor / local IDE agent (can write files):** write the complete
     generated `.html` to disk at a new path the user can open. Optionally
     also write a `.zip` of that HTML. Do **not** paste the HTML into chat.

6. Keep the client’s native file/TIFF/demo load paths working.
7. Do not feed AcqStore JSON `reference` into the analysis image setter.
   Client “Vessels / reference channel” ≠ AcqStore `reference` object.
8. Frozen load card: copy `graft-kit/load-card.html` verbatim.
9. Adapt only the analysis setter call sites in `load-wiring.template.js`
   (per Phase A). Keep N>2 source-channel warning behavior.
10. **Never open, preview, render, serve, or run the generated HTML** as the
    LLM/agent unless the user explicitly asks to open it for testing. Do not
    launch a browser or HTML preview as part of delivery. Verification during
    Phase B is limited to static checks of the file (and ZIP, if any). The
    user opens `file://` after delivery.

---

## Phase A — Handoff audit (chat report only)

Using `docs/acqstore-server-additions.md` §0, §4.4, and §7, inspect the client
HTML and report:

1. Analysis image entry point (name, signature, dual-channel option shape)
2. Mapping of AcqStore `channels[0]` / `channels[1]` → client roles
3. Calibration ids (`#msPerLine`, `#umPerPixel`, ranges) present or missing
4. Id collisions with `#acqstoreLoadCard`, `#acqstoreLoadBtn`,
   `#acqstoreLoadStatus`, `#acqstoreReferenceHost`, `#acqstoreReferenceCard`
5. Whether the client supports more than two source channels
6. Verdict: **PASS** | **PASS WITH WARNINGS** | **FAIL**
7. Exact setter call sketch for single- and dual-channel LOAD WIRING

Do **not** write the grafted HTML in Phase A.

Then ask the user: **Continue to Phase B?**

### If Phase A is FAIL

You **may** still run Phase B if the user confirms. Before Phase B, display a
**large, unmistakable disclaimer**, for example:

> **DISCLAIMER — Phase A FAILED**  
> The handoff audit did not pass. Continuing to Phase B is allowed at your
> request, but the grafted HTML may be incorrect, incomplete, or non-functional.
> Prefer fixing the analyzer handoff surface before relying on this output.

Wait for explicit confirmation before Phase B.

### If PASS or PASS WITH WARNINGS

Still ask before Phase B; mention any warnings briefly.

---

## Phase B — Graft (never paste HTML into chat)

Build a new standalone HTML =

1. Exact bytes of the client analyzer HTML, plus
2. Inserts from `graft-kit/` in this order:
   1. Inline `reference-view.css` into existing `<style>` (marker-wrapped)
   2. `load-card.html` in the sidebar after the primary load card (marker-wrapped)
   3. `reference-host.html` in the main column near image display (marker-wrapped)
   4. Inline `reference-view.js` near the end of the main `<script>`
   5. Adapted `load-wiring.template.js` immediately after (setter calls from Phase A)

### Phase B delivery (required — pick the matching host)

**Names:**

- HTML: `<original-stem>_acqstore_v2.html`
- ZIP (when used): `<original-stem>_acqstore_v2.zip` containing that HTML as a
  normal file member

**A) ChatGPT / Claude web — ZIP download only**

1. Build the HTML file, then put it in a ZIP.
2. Deliver **only** the ZIP download link/attachment.
3. Do **not** attach or offer a raw `.html` download (may render in ChatGPT).
4. Do not paste the HTML into chat.

**B) Cursor / local IDE agent — write to disk**

1. Write the complete HTML to a **new** path on disk (never overwrite the
   client original). Prefer a sibling of the client file or a path the user
   names.
2. Optionally also write the ZIP next to it.
3. In chat, report only the output path(s) and the self-check list — do not
   paste the HTML body.

Static self-checks only (print yes/no in chat):

- [ ] Client original is a character subsequence of the output (additive only)
- [ ] Kit CSS/JS inlined; `injectCss: false`
- [ ] Load card ids unchanged from `load-card.html`
- [ ] `setFromOpenPayload` called after primary handoff
- [ ] Reference UI is the disclosure card from the kit
- [ ] HTML was not pasted into chat
- [ ] **Web host:** ZIP delivered (no raw HTML download) **or**
      **Cursor/IDE:** HTML written to disk at the reported path

After delivery, tell the user to open the HTML as `file://` (extract from ZIP
first if they received a ZIP) with AcqStore Server at
`http://127.0.0.1:8767`, then run the acceptance checks in `START_HERE.md`.
