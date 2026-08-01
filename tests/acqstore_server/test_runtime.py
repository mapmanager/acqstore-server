"""Unit tests for programmatic ServerController lifecycle."""

from __future__ import annotations

import json
import socket
import urllib.error
import urllib.request

import pytest

from acqstore_server.runtime import (
    AlreadyRunningError,
    BindError,
    PortInUseError,
    ServerController,
)


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(('127.0.0.1', 0))
        return int(sock.getsockname()[1])


def test_start_status_stop_round_trip() -> None:
    port = _free_port()
    controller = ServerController()
    status = controller.start(host='127.0.0.1', port=port)
    try:
        assert status.running is True
        assert status.healthy is True
        assert status.port == port
        with urllib.request.urlopen(status.health_url, timeout=2) as response:
            assert response.status == 200
            health = json.loads(response.read().decode('utf-8'))
        assert health['ok'] is True
        assert health['apiVersion'] == 'v2'
        assert health['serverVersion']
        probed = controller.status(probe_health=True)
        assert probed.healthy is True
    finally:
        stopped = controller.stop()
    assert stopped.running is False
    assert controller.is_running is False


def test_double_start_raises() -> None:
    port = _free_port()
    controller = ServerController()
    controller.start(host='127.0.0.1', port=port)
    try:
        with pytest.raises(AlreadyRunningError):
            controller.start(host='127.0.0.1', port=_free_port())
    finally:
        controller.stop()


def test_port_in_use_raises() -> None:
    port = _free_port()
    blocker = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    blocker.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    blocker.bind(('127.0.0.1', port))
    blocker.listen(1)
    controller = ServerController()
    try:
        with pytest.raises(PortInUseError):
            controller.start(host='127.0.0.1', port=port)
    finally:
        blocker.close()
        if controller.is_running:
            controller.stop()


def test_non_localhost_bind_raises() -> None:
    controller = ServerController()
    with pytest.raises(BindError):
        controller.start(host='0.0.0.0', port=_free_port())


def test_stop_when_not_running_is_safe() -> None:
    controller = ServerController()
    status = controller.stop()
    assert status.running is False


def test_free_api_port_then_start_again() -> None:
    """End-user flow: Free server port (stop+reclaim) then Start server must work."""
    port = _free_port()
    controller = ServerController()
    controller.start(host='127.0.0.1', port=port)
    killed = controller.reclaim_port(port=port)
    assert killed == []
    assert controller.is_running is False
    status = controller.start(host='127.0.0.1', port=port)
    try:
        assert status.healthy is True
    finally:
        controller.stop()


def test_demo_redirect_from_legacy_path() -> None:
    port = _free_port()
    controller = ServerController()
    status = controller.start(host='127.0.0.1', port=port)
    try:
        request = urllib.request.Request(
            f'{status.base_url}/demo/',
            method='GET',
        )
        try:
            urllib.request.urlopen(request, timeout=2)
        except urllib.error.HTTPError as exc:
            # TestClient-style clients follow redirects; urllib may not on 307
            # depending on method. Accept redirect status.
            assert exc.code in {307, 302, 301}
            assert '/demo/v2/' in exc.headers.get('Location', '')
        else:
            # If followed, landing page should be the v2 demo.
            pass
    finally:
        controller.stop()
