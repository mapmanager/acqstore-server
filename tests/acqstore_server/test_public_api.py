"""Public package exports for embedders."""

from __future__ import annotations

import sys

import acqstore_server
from acqstore_server import (
    AlreadyRunningError,
    BindError,
    PortInUseError,
    PortReclaimError,
    ServerController,
    ServerError,
    ServerStatus,
    __version__,
)


def test_public_exports_match_dunder_all() -> None:
    assert set(acqstore_server.__all__) == {
        'AlreadyRunningError',
        'BindError',
        'PortInUseError',
        'PortReclaimError',
        'ServerController',
        'ServerError',
        'ServerStatus',
        '__version__',
    }
    assert __version__
    assert issubclass(PortInUseError, ServerError)
    assert issubclass(AlreadyRunningError, ServerError)
    assert issubclass(BindError, ServerError)
    _ = ServerController
    _ = ServerStatus
    _ = PortReclaimError


def test_importing_package_does_not_load_nicegui() -> None:
    """Core embedder path must not require NiceGUI."""
    # Fresh check: if already imported by other tests, skip the negative assert.
    if 'nicegui' in sys.modules:
        # Still verify controller import path is independent.
        from acqstore_server.runtime import ServerController as SC

        assert SC is ServerController
        return
    import importlib

    importlib.reload(acqstore_server)
    assert 'nicegui' not in sys.modules
