# API modules

Python module docs for the API v2 surface used by thin clients. Prefer the live OpenAPI schema while the app is running:

```text
http://127.0.0.1:8767/openapi.json
http://127.0.0.1:8767/docs
```

Documented modules:

- [Schemas](schemas.md) — JSON-facing Pydantic models
- [Routes](routes.md) — FastAPI `/api/v2` routes
- [Open service](open-service.md) — open/decode into transport-neutral models
