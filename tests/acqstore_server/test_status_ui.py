"""Status UI helpers for ServerController-driven desktop mode."""

from __future__ import annotations

from acqstore_server.runtime import ServerStatus
from acqstore_server.status_ui import format_status_line


def test_format_status_line_healthy() -> None:
    status = ServerStatus(
        running=True,
        host='127.0.0.1',
        port=8767,
        base_url='http://127.0.0.1:8767',
        healthy=True,
    )
    left, right = format_status_line(status)
    assert left == 'Server running http://127.0.0.1:8767'
    assert right == 'healthy'
    assert 'UI ' not in left
    assert '8766' not in left and '8766' not in right


def test_format_status_line_stopped_with_error() -> None:
    status = ServerStatus(
        running=False,
        host='127.0.0.1',
        port=8767,
        base_url='http://127.0.0.1:8767',
        healthy=False,
        error='port in use',
    )
    left, right = format_status_line(status)
    assert left == 'Server stopped — port in use'
    assert right == ''
    assert 'UI ' not in left


def test_format_status_line_running_unhealthy() -> None:
    status = ServerStatus(
        running=True,
        host='127.0.0.1',
        port=8767,
        base_url='http://127.0.0.1:8767',
        healthy=False,
    )
    left, right = format_status_line(status)
    assert left == 'Server running http://127.0.0.1:8767'
    assert right == 'not healthy'


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
