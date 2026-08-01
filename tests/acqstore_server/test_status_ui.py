"""Status UI helpers for ServerController-driven desktop mode."""

from __future__ import annotations

from acqstore_server.runtime import ServerStatus
from acqstore_server.status_ui import format_header_versions, format_status_line


def test_format_status_line_healthy() -> None:
    status = ServerStatus(
        running=True,
        host='127.0.0.1',
        port=8767,
        base_url='http://127.0.0.1:8767',
        healthy=True,
    )
    text = format_status_line(
        status,
        ui_bind='127.0.0.1:8766',
        server_version='0.2.0',
    )
    assert 'Server running' in text
    assert 'healthy' in text
    assert 'http://127.0.0.1:8767' in text
    assert 'server 0.2.0' in text
    assert 'UI 127.0.0.1:8766' in text


def test_format_status_line_stopped_with_error() -> None:
    status = ServerStatus(
        running=False,
        host='127.0.0.1',
        port=8767,
        base_url='http://127.0.0.1:8767',
        healthy=False,
        error='port in use',
    )
    text = format_status_line(status, ui_bind='127.0.0.1:8766')
    assert 'Server stopped' in text
    assert 'port in use' in text


def test_format_header_versions_shows_ui_and_server() -> None:
    assert format_header_versions(ui_version='0.2.0', server_version=None) == (
        'UI 0.2.0 · server —'
    )
    assert format_header_versions(ui_version='0.2.0', server_version='0.2.0') == (
        'UI 0.2.0 · server 0.2.0'
    )


def test_force_process_exit_schedules_os_exit(monkeypatch) -> None:
    import acqstore_server.status_ui as status_ui

    calls: list[float] = []

    monkeypatch.setattr(status_ui.time, 'sleep', lambda s: calls.append(float(s)))
    monkeypatch.setattr(status_ui.os, '_exit', lambda code: calls.append(float(code)))

    class ImmediateThread:
        def __init__(self, target=None, name=None, daemon=None):
            self._target = target

        def start(self) -> None:
            assert self._target is not None
            self._target()

    monkeypatch.setattr(status_ui.threading, 'Thread', ImmediateThread)
    status_ui._force_process_exit(delay_s=0.01)
    assert calls == [0.01, 0.0]
