"""Shared constants and types for AcqStore Server (API v2)."""

from __future__ import annotations

from collections.abc import Callable, Sequence

from acqstore_server._version import __version__

APP_NAME = 'acqstore_server'
# Alias of package ``__version__`` (sourced from pyproject / install metadata).
APP_VERSION = __version__
DEFAULT_HOST = '127.0.0.1'
DEFAULT_PORT = 8767
# NiceGUI status window bind (API listens on DEFAULT_PORT via ServerController).
DEFAULT_UI_PORT = 8766

PickFileFn = Callable[[Sequence[str] | None], str | None]
