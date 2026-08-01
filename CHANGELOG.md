# Changelog

## [Unreleased]

### Added

- Docs: [Control the server (Python)](docs/llm/control-the-server.md) for embedders (`ServerController`).
- Public package exports: `ServerController`, `ServerStatus`, and related errors from `acqstore_server`.

### Changed

- NiceGUI / pywebview moved to optional extra `acqstore-server[desktop]` (and local uv group `desktop`). Core install is enough to start/stop the HTTP server from Python.
- MkDocs: removed top-level autodoc “API” nav (schemas / routes / open service); client docs split into JS vs Python control.

## [0.2.0] — 2026-08-01

### Breaking

- Removed HTTP **API v1**. Only **API v2** (`/api/v2`, `/demo/v2/`) remains. Legacy `/demo/` redirects to `/demo/v2/`.

### Added

- Programmatic **`ServerController`** (`start` / `stop` / `status`, optional `start(reclaim=True)`) for embedders and tests.
- Main-window **server controls**: Start server, Stop server, Who uses server port?, Free server port.
- Package version from install metadata (`acqstore_server.__version__`); CLI `--version` / `-V`; `GET /api/v2/health` includes `serverVersion`.
- Public docs site at [mapmanager.github.io/acqstore-server](https://mapmanager.github.io/acqstore-server/) (GitHub Pages workflow).
- Modular built-in demo under `static/demo/v2/` (ES modules); frozen monolith kept under `archive/` for reference.

### Changed

- Desktop **main window** drives the HTTP server via `ServerController` (default server URL `http://127.0.0.1:8767`). Closing the window stops the server.
- Main-window layout: **Clients** (Open demo, API docs, Check health) and **Server** (start/stop/port tools, Open log file); header shows app name + one version + Documentation; footer shows server status only.
- Packaged app bind defaults updated for the split listener setup (status window vs server).
- Demo UX: Open File flow, per-pane contrast/composite/axes, viewport zoom/pan, optional reference scan-path overlay, collapsible session/header sections (see user demo docs).

### Removed

- Main-window **Quit** and **Start server (force)** buttons (use the window close / app Quit menu; free the port then Start when needed).
- API v1 modules, routes, and demo.
