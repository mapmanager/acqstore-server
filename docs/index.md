# AcqStore Server

AcqStore Server is a desktop app. When you run it, you get a main window and a local server. The main window lets you start, stop, and monitor the server. The server opens scientific image files with [AcqStore](https://mapmanager.github.io/acqstore/) and serves metadata and image planes to thin clients.

One thin client ships with the app: the [built-in demo](users/demo.md) at `/demo/v2/`. You can also build your own HTML or JavaScript page that talks to the same API v2.

This site covers:

- Using the packaged desktop app and its main window
- The built-in demo
- Building your own HTML/JavaScript client against API v2
- Controlling the server from another Python desktop app

## Start here

- [Get the desktop app](users/install.md) — request and run the packaged app
- [Main window](users/gui.md) — control the server and open the demo
- [Built-in demo](users/demo.md) — open a file and view images
- [Build a client](llm/index.md) — JavaScript clients and Python server control
- [Control the server](llm/control-the-server.md) — start / stop / monitor from Python
- [LLM prompt](llm/prompt.md) — copy-paste prompt for an agent

Optional detail lives under [Reference (details)](reference/index.md).
