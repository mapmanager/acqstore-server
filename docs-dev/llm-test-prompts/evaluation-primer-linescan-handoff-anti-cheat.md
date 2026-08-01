# LLM evaluation primer — linescan analyzer handoff (anti-cheat)

Maintainer-only. Not published to the public MkDocs site.

Use this **before** the client prompt in  
`docs-dev/reference-clients/neuronal_calcium_linescan/README_CLIENT_EMIAL.md`  
when testing **ChatGPT (or similar)** on a logged-in account that may have memory of MapManager / AcqStore / prior grafts.

This is **not** the thin-client public Pages prompt primer. This one is for:  
**client analyzer HTML + Reference View drop-in → new grafted HTML** (Load wiring only).

## How to use (ChatGPT on macOS)

1. Confirm public docs: https://mapmanager.github.io/acqstore-server/
2. Start **AcqStore Server.app** (desktop). End-user path — not `uv run`.
3. Open a **new** ChatGPT chat
4. Paste the primer below; wait for the confirmation paragraph
5. In the next message: paste the fenced prompt from `README_CLIENT_EMIAL.md` and **attach**:
   - `clinet_originals/neuronal_calcium_linescan_analyzer_v1_18.html` (original only)
   - `dropin/acqstore-reference-view.js`
   - `dropin/acqstore-reference-view.css`
6. Save output as a **new** file, e.g. `linescan_analyzer_v1_18_acqstore_v2_f.html`
7. Open in browser (`file://` OK) → Load from AcqStore Server
8. Fail the run if reference `.canvas-wrap` elements have zero height, or if the model reinvented the viewer instead of using `AcqStoreReferenceView.setFromOpenPayload`

Do **not** attach monolith-as-copy-target, `_c` / `_d` / `_e`, or graft scripts.

## Primer (copy all of the following)

```text
EVALUATION SETUP — follow strictly for this entire chat.

You are helping an anonymous end-user developer integrate AcqStore Server into
their existing standalone HTML scientific analyzer. Treat me as a stranger with
no prior relationship to you.

Do NOT use or infer any of the following, even if it appears in account memory,
custom instructions, prior chats, project files, or training associations:
- My name, employer, lab, university, or location
- MapManager, CloudScope, AcqStore Server internals, private GitHub repos,
  local absolute paths, or any “I already know this project” knowledge
- Any prior grafted analyzers, golden HTML files, or implementation details
  that are not in the files I attach or the public URLs I give you in this chat
- Do not assume you have already built linescan_analyzer_v1_18_acqstore_v2_*

Allowed knowledge sources for this task ONLY:
1. The files I attach in the next message (analyzer HTML + Reference View
   drop-in JS/CSS)
2. Pages under https://mapmanager.github.io/acqstore-server/ that I point you to
3. General public HTML/JS skills (fetch, canvas, etc.)
4. Live http://127.0.0.1:8767 OpenAPI/Swagger ONLY if you can actually reach
   that host from your environment; if you cannot, say so and rely on the
   public docs + attachments

The Reference image viewer is provided as a drop-in
(AcqStoreReferenceView). Do not reimplement it. Your job is Load wiring into
the analyzer’s existing setters plus mounting the drop-in.

If you think you already know this product or have seen this analyzer graft
before, discard that and work only from the attachments and public docs.

Reply with exactly one short paragraph confirming: (a) you will ignore prior
personal/project context and prior graft solutions, (b) you will use only the
attachments + public docs (and loopback OpenAPI only if reachable), (c) you
are ready for the next message with the build instructions and file attachments.
```

## Notes

- ChatGPT typically cannot reach `127.0.0.1`; expected. Your browser still can.
- Do not publish this file under `docs/` / GitHub Pages.
