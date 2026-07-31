# AcqStore Server

AcqStore Server is a small **local** app: a status window plus an HTTP API that opens scientific image files with [AcqStore](https://github.com/mapmanager/acqstore) and serves metadata and image planes to thin clients (browser pages, custom JavaScript, and the built-in demo).

This site covers:

- using the packaged desktop app and its status window
- the built-in demo page at `/demo/v2/`
- building your own HTML/JavaScript client against **API v2**

While the app is running, the live API contract is at `http://127.0.0.1:8767/docs` (Swagger) and `http://127.0.0.1:8767/openapi.json`.

## Start here

- [Get the desktop app](users/install.md) — request and run the packaged app
- [Status window](users/gui.md) — header, Documentation link, and action buttons
- [Built-in demo](users/demo.md) — open a file and view images
- [Build a client](llm/build-a-client.md) — first JavaScript / LLM path
- [Cursor prompt](llm/prompt.md) — copy-paste prompt for an agent

Optional detail lives under [Reference (details)](reference/index.md). Python module docs are under [API](api/index.md).
