# Build a client

These pages are for people (and LLMs) integrating with AcqStore Server.

1. [Build a first client](build-a-client.md) — HTML / JavaScript against HTTP API v2 on a running server
2. [Control the server (Python)](control-the-server.md) — start / stop / monitor from another desktop app
3. [LLM prompt](prompt.md) — paste into Cursor, ChatGPT, or another LLM (for JavaScript clients)

While the server is running, live Swagger and OpenAPI are available at:

```text
http://127.0.0.1:8767/docs
http://127.0.0.1:8767/openapi.json
```

Match the behavior of the built-in demo at `http://127.0.0.1:8767/demo/v2/` when building a JavaScript client (primary images, reference images when present, and the reference line-scan path when available). Application source code is not required.

Optional detail lives under [Reference (details)](../reference/index.md).
