# AcqStore Server

AcqStore Server is a small local HTTP service that uses **AcqStore** to open scientific image acquisitions and expose their metadata and image planes to thin clients.

## Start here

New browser and JavaScript client developers should read:

**[Client roadmap](client-roadmap.md)**

It contains the complete first workflow: start the server, open a file, read its header, fetch one image plane, display it, and delete the session.

Do not begin with the detailed reference documents. Use them only when the roadmap points to them or when you need a specific contract detail.

## Documentation layers

- [`client-roadmap.md`](client-roadmap.md) — the onboarding path for a new client
- [`reference/`](reference/README.md) — detailed API, JavaScript, error, testing, and architecture reference
- [`reference-clients/`](reference-clients/) — non-shipped HTML reference clients (for maintainers comparing demo behavior)
- [`v1/`](v1/README.md) — **historical** API v1 notes only (v1 is removed from the product)

## Running server

External JavaScript developers normally receive and run **AcqStore Server.app**. They do not need to clone this repository or install Python.

Python developers working from this repository need a sibling `../acqstore` checkout (see the root README), then:

```bash
uv sync
uv run python -m acqstore_server
```

The default server origin is:

```text
http://127.0.0.1:8767
```

Useful live resources:

```text
http://127.0.0.1:8767/demo/v2/
http://127.0.0.1:8767/docs
http://127.0.0.1:8767/openapi.json
```

API v2 is the only client-development target. API v1 has been removed; see [`v1/`](v1/README.md) for historical notes only.
