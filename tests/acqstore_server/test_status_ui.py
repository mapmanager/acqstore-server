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
    text = format_status_line(status, ui_bind='127.0.0.1:8766')
    assert 'healthy' in text
    assert 'http://127.0.0.1:8767' in text
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
    assert 'API stopped' in text
    assert 'port in use' in text
