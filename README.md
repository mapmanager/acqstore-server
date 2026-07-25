# AcqStore Server

AcqStore Server is a small **local** HTTP service that uses [AcqStore](https://github.com/mapmanager/acqstore) to open scientific image acquisitions and expose metadata and image planes to thin clients (browser demos, custom JavaScript/Python clients, and a native status UI).

API v2 is the client target documented on the public docs site.

## Relationship to AcqStore

AcqStore is an **external sibling dependency**, not vendored in this repository and **not** expected from PyPI.

Local layout:

```text
<parent>/
├── acqstore/           # required sibling source checkout
└── acqstore-server/    # this repository
```

`pyproject.toml` maps `acqstore` to `../acqstore` via `[tool.uv.sources]`. GitHub Actions check out a pinned AcqStore commit as a sibling of this repository.

## Requirements

- Python 3.12+
- [uv](https://docs.astral.sh/uv/)
- Sibling `../acqstore` checkout

## Install (development)

```bash
uv sync --group dev
uv run --no-sync python -c "import acqstore, acqstore_server; print(acqstore.__file__); print(acqstore_server.__file__)"
```

## Run (API only)

Default bind is loopback only (`127.0.0.1:8767`):

```bash
uv run python -m acqstore_server
```

Useful URLs:

```text
http://127.0.0.1:8767/api/v2/health
http://127.0.0.1:8767/openapi.json
http://127.0.0.1:8767/demo/v2/
http://127.0.0.1:8767/docs
```

## Run (desktop / native status UI)

```bash
ACQSTORE_SERVER_NATIVE=1 uv run python -m acqstore_server
# or
uv run python -m acqstore_server.desktop
```

## Local-only networking

The server refuses non-loopback hosts unless you change the bind policy in code. Set:

```bash
export ACQSTORE_SERVER_HOST=127.0.0.1
export ACQSTORE_SERVER_PORT=8767
```

## Tests

```bash
uv lock --check
uv sync --frozen --group dev
uv run --no-sync ruff check .
uv run --no-sync pytest -ra --cov=acqstore_server
```

Representative-format tests are optional and skip cleanly when local fixtures are not configured.

## Documentation

Public docs site: [https://acqstore-server.pages.dev/](https://acqstore-server.pages.dev/)

MkDocs source is under [`docs/`](docs/) (end-user GUI, LLM/JS client path, optional reference detail, and a small mkdocstrings API section). Working notes may still live under `docs-dev/` for maintainers; the published site does not link there.

Local preview and strict build:

```bash
uv sync --group docs
uv run --no-sync mkdocs serve
```

```bash
uv run --no-sync mkdocs build --strict
```

## macOS packaging

Unsigned local app build:

```bash
./packaging/acqstore_server/build_app.sh
```

Signing and notarization require local credentials (`packaging/acqstore_server/_secrets.sh`, never committed). CI packaging is manual-only via `.github/workflows/build-acqstore-server-macos.yml`.

See [`packaging/acqstore_server/README.md`](packaging/acqstore_server/README.md).

## License

GPL-3.0-only. Copyright (c) Robert Cudmore.

## Repository status

This repository is extracted from the CloudScope monolith for standalone development. It is currently private and not yet published to GitHub.
