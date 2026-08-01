# AcqStore handoff — neuronal calcium linescan (maintainer)

**Client-facing email + prompt:** [`README_CLIENT_EMIAL.md`](./README_CLIENT_EMIAL.md)  
**Anti-cheat primer:** `docs-dev/llm-test-prompts/evaluation-primer-linescan-handoff-anti-cheat.md`  
**Owned Reference viewer (attach this):** [`dropin/`](./dropin/)  
Also served at `http://127.0.0.1:8767/demo/v2/dropin/`

**Maintainer tools (NOT client packet):** `docs-dev/maintainer-tools/`

## Packet (email / LLM)

1. Client analyzer HTML (`clinet_originals/neuronal_calcium_linescan_analyzer_v1_18.html`)  
2. `dropin/acqstore-reference-view.js`  
3. `dropin/acqstore-reference-view.css`  
4. Prompt from `README_CLIENT_EMIAL.md`

Do **not** send goldens, monolith-as-copy-target, or anything under `docs-dev/maintainer-tools/`.

## Regenerate drop-in + proof graft

```bash
python3 docs-dev/maintainer-tools/build_reference_view_dropin.py
python3 docs-dev/maintainer-tools/graft_linescan_dropin_load_only.py
```

Proof: `linescan_analyzer_v1_18_acqstore_v2_e.html`

## How to run

- **AcqStore Server.app**  
- Acceptance: Load → Reference card collapsible; contrast one row per channel; canvases non-zero height / not offset  
