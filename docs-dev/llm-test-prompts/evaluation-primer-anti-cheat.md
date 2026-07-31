# LLM evaluation primer (anti-cheat)

Maintainer-only. Not published to the public MkDocs site.

Use this **before** pasting the public end-user [LLM prompt](https://mapmanager.github.io/acqstore-server/llm/prompt/) when testing web LLMs (ChatGPT, Gemini, etc.) on a logged-in account that may have personal or project memory.

## How to use

1. Deploy / confirm public docs are current at https://mapmanager.github.io/acqstore-server/
2. Start AcqStore Server locally (so the finished HTML can call `:8767`)
3. Open a **new** chat on the target LLM web UI
4. Paste the primer below; wait for the confirmation paragraph
5. Paste the fenced prompt from https://mapmanager.github.io/acqstore-server/llm/prompt/

## Primer (copy all of the following)

```text
EVALUATION SETUP — follow strictly for this entire chat.

You are helping an anonymous end user build a thin HTML/JavaScript client for
AcqStore Server. Treat me as a stranger with no prior relationship to you.

Do NOT use or infer any of the following, even if it appears in account memory,
custom instructions, prior chats, or training associations:
- My name, employer, lab, university, or location
- MapManager, CloudScope, AcqStore Server internals, private GitHub repos,
  local file paths, or any “I already know how this project works” knowledge
- Any unpublished APIs, demo source code, or implementation details that are
  not explicitly present in a URL I give you in this chat

Allowed knowledge sources for this task ONLY:
1. Pages I ask you to open under https://mapmanager.github.io/acqstore-server/
2. General public web/HTML/JS skills (fetch, canvas, etc.)
3. Live http://127.0.0.1:8767 OpenAPI/Swagger ONLY if you can actually reach
   that host from your environment; if you cannot, say so and rely on the
   public docs

If you think you already know this product from memory, discard that and
re-learn from the public docs I point you to.

Reply with exactly one short paragraph confirming: (a) you will ignore prior
personal/project context, (b) you will use only the public docs (and loopback
OpenAPI only if reachable), (c) you are ready for the next message containing
the build instructions.
```

## Notes

- The primer does not replace the public LLM prompt; it only reduces account/memory leakage during maintainer evaluation.
- Cloud LLMs typically cannot reach `127.0.0.1:8767`; that is expected. The generated page still runs against the local app in the user’s browser.
- Do not publish this file under `docs/` / GitHub Pages.
