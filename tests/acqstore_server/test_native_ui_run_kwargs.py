"""Native ``ui.run`` kwargs and status-window geometry."""

from __future__ import annotations

from types import SimpleNamespace

from acqstore_server.app import (
    _NATIVE_WINDOW_HEIGHT,
    _NATIVE_WINDOW_WIDTH,
    _NATIVE_WINDOW_X,
    _NATIVE_WINDOW_Y,
    configure_native_status_window,
    native_ui_run_kwargs,
)


def test_native_ui_run_kwargs_are_status_only() -> None:
    kwargs = native_ui_run_kwargs(host='127.0.0.1', port=8766)
    assert kwargs['gzip_middleware_factory'] is None
    assert kwargs['native'] is True
    assert kwargs['reload'] is False
    assert kwargs['fastapi_docs'] is False
    assert kwargs['host'] == '127.0.0.1'
    assert kwargs['port'] == 8766
    # Geometry lives on app.native.window_args, not ui.run(window_size=...).
    assert 'window_size' not in kwargs


def test_configure_native_status_window_sets_geometry_and_confirm_close() -> None:
    fake_app = SimpleNamespace(native=SimpleNamespace(window_args={}))
    configure_native_status_window(fake_app)
    assert fake_app.native.window_args == {
        'x': _NATIVE_WINDOW_X,
        'y': _NATIVE_WINDOW_Y,
        'width': _NATIVE_WINDOW_WIDTH,
        'height': _NATIVE_WINDOW_HEIGHT,
        'confirm_close': True,
    }
