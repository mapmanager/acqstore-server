"""The visible runnable workflow should point users at API v2."""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import acqstore_server.app as app_module
import acqstore_server.status_ui as status_ui_module


def test_cli_startup_text_points_to_v2_demo(monkeypatch, capsys) -> None:
    """Terminal startup advertises the maintained v2 demo and API docs."""
    starts: list[dict[str, object]] = []

    class FakeController:
        def start(self, **kwargs: object) -> SimpleNamespace:
            starts.append(kwargs)
            return SimpleNamespace(base_url='http://127.0.0.1:8767')

        def wait(self) -> None:
            return None

        def stop(self) -> None:
            return None

    monkeypatch.setattr(app_module, '_resolve_bind', lambda: ('127.0.0.1', 8767))
    monkeypatch.setattr(app_module, 'ensure_logging', lambda: None)
    monkeypatch.setattr(app_module, 'log_file_path', lambda: Path('/tmp/server.log'))
    monkeypatch.setattr(
        'acqstore_server.runtime.ServerController',
        FakeController,
    )

    app_module.main_uvicorn()

    output = capsys.readouterr().out
    assert 'http://127.0.0.1:8767/demo/v2/' in output
    assert 'http://127.0.0.1:8767/docs' in output
    assert starts and starts[0]['port'] == 8767


def test_native_status_ui_source_targets_v2_via_controller() -> None:
    """Status UI drives ServerController and opens v2 resources on the API base."""
    source = Path(status_ui_module.__file__).read_text(encoding='utf-8')
    assert 'ServerController' in source
    assert 'Start API' in source
    assert 'Stop API' in source
    assert 'Free API port' in source
    assert 'Start API (reclaim)' in source
    assert "/demo/v2/'" in source or '/demo/v2/' in source
    assert 'health_url' in source
    assert "PUBLIC_DOCS_URL = 'https://mapmanager.github.io/acqstore-server/'" in source


def test_main_native_starts_controller_and_ui_ports(monkeypatch, capsys) -> None:
    """Native entry starts API via controller and runs NiceGUI on the UI port."""
    starts: list[dict[str, object]] = []
    run_kwargs: list[dict[str, object]] = []
    shutdown_hooks: list[object] = []

    class FakeController:
        def start(self, **kwargs: object) -> SimpleNamespace:
            starts.append(kwargs)
            return SimpleNamespace(base_url='http://127.0.0.1:8767')

        def stop(self) -> SimpleNamespace:
            return SimpleNamespace(host='127.0.0.1', port=8767)

        def status(self, probe_health: bool = True) -> SimpleNamespace:
            return SimpleNamespace(
                running=True,
                healthy=True,
                host='127.0.0.1',
                port=8767,
                base_url='http://127.0.0.1:8767',
                error=None,
                health_url='http://127.0.0.1:8767/api/v2/health',
            )

    class FakeNiceguiApp:
        def on_shutdown(self, fn: object) -> None:
            shutdown_hooks.append(fn)

    class FakeUi:
        def page(self, _path: str):
            def decorator(fn: object) -> object:
                return fn

            return decorator

        def run(self, **kwargs: object) -> None:
            run_kwargs.append(kwargs)

    monkeypatch.setattr(app_module, '_resolve_bind', lambda: ('127.0.0.1', 8767))
    monkeypatch.setattr(app_module, '_resolve_ui_bind', lambda: ('127.0.0.1', 8766))
    monkeypatch.setattr(app_module, 'ensure_logging', lambda: None)
    monkeypatch.setattr(app_module, 'log_file_path', lambda: Path('/tmp/server.log'))
    monkeypatch.setattr(
        'acqstore_server.runtime.ServerController',
        FakeController,
    )
    monkeypatch.setitem(
        __import__('sys').modules,
        'nicegui',
        SimpleNamespace(app=FakeNiceguiApp(), ui=FakeUi()),
    )

    # Re-import path used inside main_native: `from nicegui import ...`
    import nicegui

    monkeypatch.setattr(nicegui, 'app', FakeNiceguiApp())
    monkeypatch.setattr(nicegui, 'ui', FakeUi())

    app_module.main_native()

    output = capsys.readouterr().out
    assert 'status UI http://127.0.0.1:8766' in output
    assert 'API http://127.0.0.1:8767' in output
    assert 'demo http://127.0.0.1:8767/demo/v2/' in output
    assert starts == [{'host': '127.0.0.1', 'port': 8767}]
    assert run_kwargs and run_kwargs[0]['port'] == 8766
    assert run_kwargs[0]['fastapi_docs'] is False
    assert shutdown_hooks
