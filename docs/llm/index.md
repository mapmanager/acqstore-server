# Build a client

These pages are for people (and LLMs) writing a thin HTML/JavaScript page against a **running** AcqStore Server. The public site root is:

```text
https://mapmanager.github.io/acqstore-server/
```

1. [Build a first client](build-a-client.md) — step-by-step API v2 path
2. [LLM prompt](prompt.md) — paste into Cursor, ChatGPT, or another LLM (public docs URLs; OpenAPI on loopback when the agent can reach it)

While the app is running, use live Swagger and OpenAPI on the **server** (not the docs site):

```text
http://127.0.0.1:8767/docs
http://127.0.0.1:8767/openapi.json
```

Optional extras are under [Reference (details)](../reference/index.md). Match the **behavior** of the built-in demo at `http://127.0.0.1:8767/demo/v2/` (primary images, reference images when present, and the reference line-scan path when available). Application source code is not required.
