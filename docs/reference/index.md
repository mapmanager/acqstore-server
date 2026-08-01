# Reference (details)

Optional detail for implementers who need more than [Build a first client](../llm/build-a-client.md).

Start with the first-client page and the live OpenAPI schema. Use these pages when you need examples or a checklist.

| Page | Use when |
|---|---|
| [API contract](api.md) | Written HTTP contract for API v2 |
| [JavaScript client](javascript-client.md) | Full JS patterns (binary decode, reference planes, scan path) |
| [Demo](demo.md) | What `/demo/v2/` exercises |
| [Errors](errors.md) | Stable JSON error envelope and codes |
| [Client handoff](client-handoff.md) | Short acceptance checklist |
| [Control the server](../llm/control-the-server.md) | Python start / stop / monitor for embedders |

Live machine contract while the app is running:

```text
http://127.0.0.1:8767/openapi.json
http://127.0.0.1:8767/docs
```
