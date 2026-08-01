"""Shared constants and types for AcqStore Server (API v2)."""

from __future__ import annotations

from collections.abc import Callable, Sequence

APP_NAME = 'acqstore_server'
APP_VERSION = '0.1.0'
DEFAULT_HOST = '127.0.0.1'
DEFAULT_PORT = 8767
# NiceGUI status window bind (API listens on DEFAULT_PORT via ServerController).
DEFAULT_UI_PORT = 8766

PickFileFn = Callable[[Sequence[str] | None], str | None]
