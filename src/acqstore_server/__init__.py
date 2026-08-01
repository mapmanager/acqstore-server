"""AcqStore Server — local HTTP API and optional desktop status UI.

Two ways to use this package:

* **Control the server (Python):** :class:`~acqstore_server.ServerController`
  starts and stops the HTTP listener in-process. Use this from embedders such as
  CloudScope App or the optional NiceGUI main window. Install the core package
  only (no NiceGUI required).

* **Call API v2 (HTTP):** browser and JavaScript clients talk to a *running*
  server at ``http://127.0.0.1:8767/api/v2``. See the public docs under
  “Build a client”.

Optional desktop UI (NiceGUI)::

    pip install 'acqstore-server[desktop]'
"""

from __future__ import annotations

from acqstore_server._version import __version__
from acqstore_server.ports import PortReclaimError
from acqstore_server.runtime import (
    AlreadyRunningError,
    BindError,
    PortInUseError,
    ServerController,
    ServerError,
    ServerStatus,
)

__all__ = [
    'AlreadyRunningError',
    'BindError',
    'PortInUseError',
    'PortReclaimError',
    'ServerController',
    'ServerError',
    'ServerStatus',
    '__version__',
]
