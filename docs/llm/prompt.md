# Cursor prompt

Copy the prompt below into Cursor or ChatGPT after AcqStore Server is running locally. Point the agent at this documentation site and the live OpenAPI schema — not at any other repository.

```text
You are building a standalone HTML + JavaScript page that talks to a running
AcqStore Server on the same machine.

Read only these docs first (in order):

1. Build a client (this site’s “Build a first client” page)
2. Client handoff checklist
3. Live OpenAPI at http://127.0.0.1:8767/openapi.json
4. Interactive Swagger at http://127.0.0.1:8767/docs

Open Reference pages only when the first-client page tells you to.

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

Do not ask a human how the API works. Treat this documentation site and the
running server’s OpenAPI as authoritative. If something is unclear, make a
reasonable engineering choice and continue.

Do not modify the AcqStore Server application itself.

When finished, briefly note what was sufficient, what was confusing, and what
assumptions you made.
```

Default server base URL:

```text
http://127.0.0.1:8767
```

API base:

```text
http://127.0.0.1:8767/api/v2
```

Reference demo while the server is running:

```text
http://127.0.0.1:8767/demo/v2/
```
