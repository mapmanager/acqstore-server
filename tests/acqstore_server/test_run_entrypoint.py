"""Runnable server entry-point contract."""

from __future__ import annotations

from types import SimpleNamespace

import acqstore_server.app as app_module


def test_main_uvicorn_prints_v2_demo_and_runs_server(monkeypatch, capsys) -> None:
    starts: list[dict[str, object]] = []
    waits: list[bool] = []

    class FakeController:
        def start(self, **kwargs: object) -> SimpleNamespace:
            starts.append(kwargs)
            return SimpleNamespace(
                base_url='http://127.0.0.1:8767',
                host='127.0.0.1',
                port=8767,
            )

        def wait(self) -> None:
            waits.append(True)

        def stop(self) -> None:
            return None

    monkeypatch.setattr(app_module, '_resolve_bind', lambda: ('127.0.0.1', 8767))
    monkeypatch.setattr(
        'acqstore_server.runtime.ServerController',
        FakeController,
    )

    app_module.main_uvicorn()

    output = capsys.readouterr().out
    assert 'http://127.0.0.1:8767/demo/v2/' in output
    assert 'http://127.0.0.1:8767/docs' in output
    assert starts == [{'host': '127.0.0.1', 'port': 8767, 'app': app_module.app}]
    assert waits == [True]
