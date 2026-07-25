# Built-in demo

The packaged app ships a small HTML/JavaScript demo. With the app running, open it from the status window (**Open demo**) or go to:

```text
http://127.0.0.1:8767/demo/v2/
```

![AcqStore Server demo page](../assets/demo-app-html.png)

## What it does

1. Checks health and capabilities.
2. Lets you **Pick and open** a file (native dialog on the machine running the app), or open a path the server can read.
3. Shows acquisition header / session metadata.
4. Loads and displays **source (primary)** image planes.
5. When present, loads **reference** image planes and shows the reference **line-scan path**.
6. Can delete the session when you are done.

Supported file types come from AcqStore at runtime. Prefer `GET /api/v2/capabilities` over hard-coding extensions (typical examples include `.tif`, `.oir`, `.czi`, `.nd2`, and OME-Zarr variants).

## Source in this project

The demo page lives in this repository at:

```text
src/acqstore_server/static/demo/v2/index.html
```

More technical notes: [Reference demo](../reference/demo.md). To build your own page, start with [Build a client](../llm/build-a-client.md).
