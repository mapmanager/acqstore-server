# Main window

When you start the app, a main window stays open while the local server is running.

![AcqStore Server main window](../assets/acqstore-server-gui.png)

## Header

The top row shows the app name (`acqstore_server`), the version (for example `v0.1.0`), and **Documentation** (opens [this documentation site](https://mapmanager.github.io/acqstore-server/)).

## Buttons

| Button | What it does |
|---|---|
| **Open demo** | Opens the built-in browser demo at `http://127.0.0.1:8767/demo/v2/` — see [Built-in demo](demo.md) |
| **API docs (/docs)** | Opens live Swagger for API v2 at `http://127.0.0.1:8767/docs` |
| **Show health** | Calls `GET /api/v2/health` and writes the result into the window log |
| **Open log** | Opens the on-disk log file in your default app |
| **Quit server** | Stops the app and the local server |

The footer shows the bind address (default `127.0.0.1:8767`).

## Log pane

The lower area is a live view of the server log. Use it when a file fails to open or a client request looks wrong.

## Live API contract

While the app is running:

- Interactive Swagger: `http://127.0.0.1:8767/docs`
- Machine-readable OpenAPI: `http://127.0.0.1:8767/openapi.json`
