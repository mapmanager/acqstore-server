"""Native ``ui.run`` kwargs for the status-only NiceGUI window."""

from __future__ import annotations

from acqstore_server.app import native_ui_run_kwargs


def test_native_ui_run_kwargs_are_status_only() -> None:
    kwargs = native_ui_run_kwargs(host='127.0.0.1', port=8766)
    assert kwargs['gzip_middleware_factory'] is None
    assert kwargs['native'] is True
    assert kwargs['reload'] is False
    assert kwargs['fastapi_docs'] is False
    assert kwargs['host'] == '127.0.0.1'
    assert kwargs['port'] == 8766
    assert kwargs['window_size'] == (640, 720)
