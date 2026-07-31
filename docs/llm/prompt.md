# LLM prompt

Copy the prompt below into an LLM after AcqStore Server is running locally. This recipe has been exercised with **Cursor** and **ChatGPT**; the same public-docs path is intended for other web LLMs (for example Gemini) that cannot reach your loopback.

**Authoritative references for the agent:** the public docs site ([https://mapmanager.github.io/acqstore-server/](https://mapmanager.github.io/acqstore-server/)) is the **must-work** path (including for cloud/desktop LLMs that cannot reach your machine). Live OpenAPI/Swagger on loopback helps agents that *can* reach `127.0.0.1` (for example Cursor). Do **not** point the agent at application source code or a GitHub repository.

```text
You are building a standalone HTML + JavaScript page that talks to a running
AcqStore Server on the same machine (default http://127.0.0.1:8767).

Read these references in order:

1. https://mapmanager.github.io/acqstore-server/llm/build-a-client/
2. https://mapmanager.github.io/acqstore-server/reference/client-handoff/

If you can reach the user’s loopback (local agent / same machine), also read:

3. Live OpenAPI at http://127.0.0.1:8767/openapi.json
4. Interactive Swagger at http://127.0.0.1:8767/docs

If you cannot reach http://127.0.0.1:8767 (typical for cloud or remote desktop
LLMs), skip steps 3–4 and rely on the public documentation site above. The
finished HTML page will still call the local server when the user runs it in
their own browser.

Open other pages under https://mapmanager.github.io/acqstore-server/ only when
the first-client page links to them (for example Reference / Demo).

Optional behavior check (not source code): if you can open loopback URLs, you
may open http://127.0.0.1:8767/demo/v2/ and match what that page does. Do not
assume access to demo or server source files.

Create one self-contained HTML file:

- Pure HTML + JavaScript
- No build system, npm, React/Vue, or Python
- Use fetch()
- Use Canvas or Plotly for image display

The page must:

1. Verify the server is running (GET /api/v2/health)
2. Query capabilities (GET /api/v2/capabilities)
3. Open an acquisition with POST /api/v2/pick-and-open or POST /api/v2/open
4. Show useful acquisition metadata and the AcqStore header
5. Download and display source (primary) image planes
6. When the open response includes reference data, display reference image
   planes and show the reference line-scan path (scanPath / lineRoi) when present
7. Apply any transpose/conversion the API docs describe for display
8. Delete the session when finished

Do not ask a human how the API works. Treat the public documentation site as
authoritative; use the running server’s OpenAPI when reachable. Do not clone,
browse, or assume access to application source code or a GitHub repository. If
something is unclear, make a reasonable engineering choice and continue.

Do not modify the AcqStore Server application itself.

When finished, briefly note what was sufficient, what was confusing, and what
assumptions you made.
```

Public documentation site:

```text
https://mapmanager.github.io/acqstore-server/
```

Default server base URL:

```text
http://127.0.0.1:8767
```

API base:

```text
http://127.0.0.1:8767/api/v2
```

Reference demo while the server is running (behavior only):

```text
http://127.0.0.1:8767/demo/v2/
```
