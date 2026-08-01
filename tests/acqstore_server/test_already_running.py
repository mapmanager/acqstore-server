"""Preflight detection for an already-running desktop stack."""

from __future__ import annotations

import pytest

import acqstore_server.app as app_module
from acqstore_server.runtime import looks_like_running_desktop


def test_looks_like_running_desktop_when_both_ports_busy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        'acqstore_server.runtime._bind_available',
        lambda _host, _port: False,
    )
    assert looks_like_running_desktop(
        api_host='127.0.0.1',
        api_port=8767,
        ui_host='127.0.0.1',
        ui_port=8766,
    )


def test_main_native_exits_cleanly_when_desktop_already_running(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(app_module, '_resolve_bind', lambda: ('127.0.0.1', 8767))
    monkeypatch.setattr(app_module, '_resolve_ui_bind', lambda: ('127.0.0.1', 8766))
    monkeypatch.setattr(app_module, 'ensure_logging', lambda: None)
    monkeypatch.setattr(
        'acqstore_server.runtime.looks_like_running_desktop',
        lambda **_kwargs: True,
    )

    with pytest.raises(SystemExit) as exc_info:
        app_module.main_native()

    assert exc_info.value.code == 0
    err = capsys.readouterr().err
    assert 'already looks running' in err


def test_main_uvicorn_exits_cleanly_when_desktop_already_running(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(app_module, '_resolve_bind', lambda: ('127.0.0.1', 8767))
    monkeypatch.setattr(app_module, '_resolve_ui_bind', lambda: ('127.0.0.1', 8766))
    monkeypatch.setattr(app_module, 'ensure_logging', lambda: None)
    monkeypatch.setattr(
        'acqstore_server.runtime.looks_like_running_desktop',
        lambda **_kwargs: True,
    )

    with pytest.raises(SystemExit) as exc_info:
        app_module.main_uvicorn()

    assert exc_info.value.code == 0
    err = capsys.readouterr().err
    assert 'desktop already looks running' in err


def test_main_native_exits_when_ui_port_busy_alone(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(app_module, '_resolve_bind', lambda: ('127.0.0.1', 8767))
    monkeypatch.setattr(app_module, '_resolve_ui_bind', lambda: ('127.0.0.1', 8766))
    monkeypatch.setattr(app_module, 'ensure_logging', lambda: None)
    monkeypatch.setattr(
        'acqstore_server.runtime.looks_like_running_desktop',
        lambda **_kwargs: False,
    )
    monkeypatch.setattr(
        'acqstore_server.runtime.bind_available',
        lambda _host, port: port != 8766,
    )

    with pytest.raises(SystemExit) as exc_info:
        app_module.main_native()

    assert exc_info.value.code == 1
    err = capsys.readouterr().err
    assert 'status UI port' in err
