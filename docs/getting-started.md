# Getting Started

## Sibling layout

AcqStore is an external sibling dependency, **not** installed from PyPI:

```text
<parent>/
├── acqstore/           # required sibling source checkout
└── acqstore-server/    # this repository
```

`pyproject.toml` maps `acqstore` to `../acqstore` via `[tool.uv.sources]`.

## Install

```bash
uv sync --group dev
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

## Tests

```bash
uv lock --check
uv sync --frozen --group dev
uv run --no-sync ruff check .
uv run --no-sync pytest -ra
```

Representative-format tests are optional and skip cleanly when local fixtures are not configured.

## Relationship to AcqStore

AcqStore Server opens acquisitions through the sibling AcqStore library. AcqStore is **not** expected from PyPI; use the local `../acqstore` checkout.
