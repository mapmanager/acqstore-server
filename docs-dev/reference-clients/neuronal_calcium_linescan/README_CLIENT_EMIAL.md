# Client email — AcqStore handoff

Dear client,

Use your LLM with the following prompt. Give it:

1. your current analysis HTML file  
2. the included **Reference View drop-in** files (do not omit either):
   - `acqstore-reference-view.js`
   - `acqstore-reference-view.css`

These drop-in files are the authoritative Reference image viewer.  
Do **not** ask the LLM to copy or reinvent the viewer from `index.monolith.html`.

Here is the prompt:

```text
Extend analyzer A into a NEW standalone HTML file. Keep all of A’s existing
behavior. Pure HTML+JS only (no build tools, no Plotly).

FILES
A = your analyzer (extend; do not strip features)
D = AcqStore Reference View drop-in
    - acqstore-reference-view.js  (defines window.AcqStoreReferenceView)
    - acqstore-reference-view.css (host-safe Reference styles)

════════════════════════════════════════════════════════
REFERENCE IMAGES — USE THE DROP-IN (DO NOT REIMPLEMENT)
════════════════════════════════════════════════════════
1) Paste D’s CSS into A’s <style> (or <link> it next to the HTML).
2) Paste D’s JS before A’s closing </script> (or <script src> it).
3) Add an empty host in the main column (sibling near Image Display):
     <div id="acqstoreReferenceHost"></div>
4) On startup call:
     AcqStoreReferenceView.mount(
       document.getElementById('acqstoreReferenceHost'),
       { apiBase: 'http://127.0.0.1:8767', injectCss: false }
     );
   Use injectCss:false when CSS was already pasted/linked.

Do NOT:
- reimplement createImageViewport / axes / Save PNG / contrast / composite
- copy CSS/JS out of index.monolith.html
- invent a Plotly or <img> reference viewer

Wrap every block you add in datetime comments, e.g.
  <!-- ==== ACQSTORE ADDED … BEGIN 2026-08-01 00:00 ==== -->

════════════════════════════════════════════════════════
YOUR ONLY REAL JOB: LOAD → ANALYZER SETTERS
════════════════════════════════════════════════════════
1) NEW top-level card (sibling of A’s cards), title “AcqStore Server”:
   one row = [Load from AcqStore Server] + small status text to the right.
   No base-URL field. No large alert block.
   Default base: http://127.0.0.1:8767 (via drop-in apiBase).

2) On button click, using ONLY AcqStoreReferenceView helpers:
   await AcqStoreReferenceView.health()
   payload = await AcqStoreReferenceView.pickAndOpen()
     (body is already JSON {}; handle cancel via error.payload.error === "cancelled")
   Source planes:
     ch0 = await AcqStoreReferenceView.fetchPlane(payload.channels[0], payload.plane)
     rows = AcqStoreReferenceView.planeToRowMajor(ch0, payload.plane.shape)
     → A’s existing image setter (e.g. setImage). channels[1]? → vessels/second channel.
   Apply payload.plane.axes to A’s ms/line and µm/pixel controls if present.
   await AcqStoreReferenceView.setFromOpenPayload(payload)
     ← this mounts N reference canvases; do not draw reference yourself
   await AcqStoreReferenceView.deleteSession(payload.sessionId)

3) Keep every existing TIFF/file/demo/reset/analysis path working.

HARD CHECKS before you finish:
[ ] Load is its own top-level card (button + small status only)
[ ] Drop-in JS+CSS present; AcqStoreReferenceView.mount called once
[ ] Load path calls setFromOpenPayload (not a custom reference renderer)
[ ] A’s left sidebar scroll CSS unchanged
[ ] No new unscoped global .card { overflow:hidden } rules
[ ] No Plotly

Do not modify AcqStore Server.

════════════════════════════════════════════════════════
DIAGNOSTIC REPORT (chat reply, after the HTML)
════════════════════════════════════════════════════════
1. Drop-in present: yes/no (quote AcqStoreReferenceView.mount / setFromOpenPayload)
2. Copy vs adapt vs reinvent — for viewer core must be DROPIN_UNCHANGED
3. Load wiring you wrote (setImage / axes mapping)
4. Hard-check self-score
5. Uncertainties / risks
```

---

**Attachments:** analyzer HTML + `dropin/acqstore-reference-view.js` + `dropin/acqstore-reference-view.css`  
Packet path: `docs-dev/reference-clients/neuronal_calcium_linescan/dropin/`  
Also served by the app at `http://127.0.0.1:8767/demo/v2/dropin/`

**Server:** run **AcqStore Server.app**. Open the grafted HTML (`file://` OK) → **Load from AcqStore Server**.
