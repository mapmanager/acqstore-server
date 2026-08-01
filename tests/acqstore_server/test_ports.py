"""Tests for localhost port reclaim helpers."""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
from types import SimpleNamespace

import pytest

import acqstore_server.ports as ports_mod
from acqstore_server.ports import list_listening_pids, reclaim_port
from acqstore_server.runtime import PortInUseError, ServerController


def test_list_listening_pids_parses_lsof(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_run(*_args: object, **_kwargs: object) -> SimpleNamespace:
        return SimpleNamespace(returncode=0, stdout='111\n222\n111\n', stderr='')

    monkeypatch.setattr(ports_mod.platform, 'system', lambda: 'Darwin')
    monkeypatch.setattr(ports_mod.subprocess, 'run', fake_run)
    assert list_listening_pids(8767) == [111, 222]


def test_reclaim_port_skips_current_pid(monkeypatch: pytest.MonkeyPatch) -> None:
    signaled: list[tuple[int, bool]] = []
    calls = {'n': 0}

    def fake_list(_port: int) -> list[int]:
        calls['n'] += 1
        if calls['n'] == 1:
            return [os.getpid(), 99999]
        return []

    monkeypatch.setattr(ports_mod, 'list_listening_pids', fake_list)
    monkeypatch.setattr(
        ports_mod,
        '_terminate_pid',
        lambda pid, force: signaled.append((pid, force)),
    )
    monkeypatch.setattr(ports_mod.time, 'sleep', lambda _s: None)

    killed = reclaim_port(8767)
    assert killed == [99999]
    assert signaled == [(99999, False)]


def test_start_reclaim_kills_foreign_listener() -> None:
    """start(reclaim=True) terminates another process holding the API port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(('127.0.0.1', 0))
        busy_port = int(sock.getsockname()[1])

    child = subprocess.Popen(
        [
            sys.executable,
            '-c',
            (
                'import socket, time\n'
                's = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\n'
                's.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)\n'
                f's.bind(("127.0.0.1", {busy_port}))\n'
                's.listen(1)\n'
                'time.sleep(60)\n'
            ),
        ],
    )
    controller = ServerController()
    try:
        deadline = time.monotonic() + 5.0
        while time.monotonic() < deadline:
            if busy_port and child.poll() is None:
                try:
                    with socket.create_connection(('127.0.0.1', busy_port), timeout=0.2):
                        break
                except OSError:
                    time.sleep(0.05)
            else:
                time.sleep(0.05)
        else:
            pytest.fail('child listener did not bind in time')

        with pytest.raises(PortInUseError):
            controller.start(host='127.0.0.1', port=busy_port)

        status = controller.start(host='127.0.0.1', port=busy_port, reclaim=True)
        assert status.healthy is True
        assert status.port == busy_port
        # Child should have been terminated by reclaim.
        child.wait(timeout=5)
        assert child.returncode is not None
    finally:
        controller.stop()
        if child.poll() is None:
            child.kill()
            child.wait(timeout=5)
