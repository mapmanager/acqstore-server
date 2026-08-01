"""Package version surfaces (metadata, import, CLI)."""

from __future__ import annotations

import acqstore_server
import acqstore_server.app as app_module
from acqstore_server.constants import APP_VERSION
from acqstore_server._version import __version__ as version_module_version


def test_package_dunder_version_matches_constants() -> None:
    assert acqstore_server.__version__ == APP_VERSION
    assert version_module_version == APP_VERSION
    assert APP_VERSION != '0.0.0+unknown'
    assert APP_VERSION.count('.') >= 1


def test_main_version_flag_prints_and_exits(monkeypatch, capsys) -> None:
    monkeypatch.setattr(app_module.sys, 'argv', ['acqstore_server', '--version'])
    called: list[str] = []

    def _fail_native() -> None:
        called.append('native')

    def _fail_uvicorn() -> None:
        called.append('uvicorn')

    monkeypatch.setattr(app_module, 'main_native', _fail_native)
    monkeypatch.setattr(app_module, 'main_uvicorn', _fail_uvicorn)

    app_module.main()

    out = capsys.readouterr().out.strip()
    assert out == f'acqstore-server {APP_VERSION}'
    assert called == []
