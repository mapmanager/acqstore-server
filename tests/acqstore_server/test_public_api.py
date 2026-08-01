"""Public package exports for embedders."""

from __future__ import annotations

import subprocess
import sys
import textwrap

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


def test_core_package_import_does_not_load_nicegui_in_subprocess() -> None:
    """Fresh interpreter: import path must not pull NiceGUI even if installed."""
    script = textwrap.dedent(
        """
        import sys
        import acqstore_server
        from acqstore_server import ServerController

        assert "nicegui" not in sys.modules, sorted(sys.modules)
        assert ServerController.__name__ == "ServerController"
        print("ok")
        """
    )
    result = subprocess.run(
        [sys.executable, '-c', script],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr or result.stdout
    assert 'ok' in result.stdout
