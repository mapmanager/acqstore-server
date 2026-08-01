# Control the server (Python)

Use this when another desktop app (or script) should start, stop, and monitor AcqStore Server in the same Python process. The optional NiceGUI main window in this package is one such controller. A future CloudScope App panel is another.

This is not the HTTP API for opening files and downloading planes. Browser and JavaScript clients still call API v2 on a running server — see [Build a first client](build-a-client.md).

## Install

Core package (no NiceGUI from this project):

```bash
# Editable sibling layout, or your preferred install path
uv add acqstore-server
```

Only the packaged status window / `python -m acqstore_server.desktop` need the desktop extra:

```bash
uv add 'acqstore-server[desktop]'
```

CloudScope App should depend on the core package only. It already has its own NiceGUI stack.

## Minimal control loop

```python
from acqstore_server import ServerController, PortInUseError

controller = ServerController()
try:
    status = controller.start()
except PortInUseError:
    # Optional: free a stuck listener, then start again
    controller.reclaim_port()
    status = controller.start()

print(status.base_url)  # e.g. http://127.0.0.1:8767
print(status.healthy)

# While running, JS clients use http://127.0.0.1:8767/api/v2/...

snapshot = controller.status(probe_health=True)
controller.stop()
```

## Useful methods

| Method | Purpose |
|---|---|
| `start(...)` | Start the HTTP server in a background thread |
| `status(probe_health=...)` | Running / healthy snapshot |
| `stop()` | Stop the managed server |
| `list_port_listeners()` | PIDs listening on the server port |
| `reclaim_port()` | Stop ours if needed and clear foreign listeners |
| `wait_until_healthy(...)` | Block until `/api/v2/health` succeeds |

Defaults are `127.0.0.1:8767` (override with arguments or `ACQSTORE_SERVER_HOST` / `ACQSTORE_SERVER_PORT`).

## Public imports

```python
from acqstore_server import (
    __version__,
    ServerController,
    ServerStatus,
    ServerError,
    PortInUseError,
    BindError,
    AlreadyRunningError,
    PortReclaimError,
)
```

## What not to do

- Do not import `acqstore_server.status_ui` or run this package’s NiceGUI window from CloudScope.
- Do not call `open_service` / FastAPI route internals from an embedder unless you are extending the server itself. Open files through HTTP API v2 (or leave that to JS clients).
