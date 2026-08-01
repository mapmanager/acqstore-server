"""Programmatic start/stop/status for the AcqStore Server HTTP API (v2).

Embedders (for example a future CloudScope left-toolbar panel) should use
:class:`ServerController` instead of ``python -m acqstore_server.desktop``.
"""

from __future__ import annotations

import json
import socket
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

import uvicorn

from acqstore_server.app import create_app, resolve_bind
from acqstore_server.constants import DEFAULT_HOST, DEFAULT_PORT, PickFileFn
from acqstore_server.logging_setup import ensure_logging, get_logger
from acqstore_server.v2.routes import OpenAcquisitionFn
from acqstore_server.v2.session_store import SessionStore

logger = get_logger('runtime')


class ServerError(Exception):
    """Base error for programmatic server control."""


class PortInUseError(ServerError):
    """The requested bind address is already listening."""


class BindError(ServerError):
    """Host/port could not be bound or is not allowed."""


class AlreadyRunningError(ServerError):
    """:meth:`ServerController.start` called while already running."""


@dataclass(frozen=True)
class ServerStatus:
    """Snapshot of a managed AcqStore Server process."""

    running: bool
    host: str
    port: int
    base_url: str
    healthy: bool | None
    error: str | None = None

    @property
    def health_url(self) -> str:
        return f'{self.base_url}/api/v2/health'


class ServerController:
    """Start, stop, and probe an API-only uvicorn server in a background thread.

    Used by the API-only CLI, the NiceGUI status window (``main_native``), tests,
    and future embedders such as CloudScope App.
    """

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._thread: threading.Thread | None = None
        self._server: uvicorn.Server | None = None
        self._host = DEFAULT_HOST
        self._port = DEFAULT_PORT
        self._last_error: str | None = None

    def start(
        self,
        *,
        host: str | None = None,
        port: int | None = None,
        app: Any | None = None,
        session_store: SessionStore | None = None,
        pick_file_fn: PickFileFn | None = None,
        open_fn: OpenAcquisitionFn | None = None,
        ready_timeout_s: float = 10.0,
    ) -> ServerStatus:
        """Start the HTTP API in a daemon thread and wait until it accepts connections.

        Args:
            host: Bind host (default env / ``127.0.0.1``).
            port: Bind port (default env / ``8767``).
            app: Optional prebuilt ASGI app (defaults to :func:`create_app`).
            session_store: Optional store passed to :func:`create_app` when
                ``app`` is omitted.
            pick_file_fn: Optional picker override for :func:`create_app`.
            open_fn: Optional opener override for :func:`create_app`.
            ready_timeout_s: Seconds to wait for the server to become reachable.

        Returns:
            Status after a successful start (``healthy`` probed once).

        Raises:
            AlreadyRunningError: Controller already has a live server.
            BindError: Invalid host/port.
            PortInUseError: Address already in use before start, or bind failed.
            ServerError: Server thread exited or did not become ready in time.
        """
        ensure_logging()
        with self._lock:
            if self.is_running:
                raise AlreadyRunningError('AcqStore Server is already running')
            try:
                resolved_host, resolved_port = resolve_bind(host, port)
            except ValueError as exc:
                raise BindError(str(exc)) from exc

            if _port_is_open(resolved_host, resolved_port):
                raise PortInUseError(
                    f'Port {resolved_port} is already in use on {resolved_host}'
                )

            if app is None:
                create_kwargs: dict[str, Any] = {
                    'session_store': session_store,
                    'pick_file_fn': pick_file_fn,
                }
                if open_fn is not None:
                    create_kwargs['open_fn'] = open_fn
                asgi_app = create_app(**create_kwargs)
            else:
                asgi_app = app

            config = uvicorn.Config(
                asgi_app,
                host=resolved_host,
                port=resolved_port,
                log_level='info',
                access_log=False,
            )
            server = uvicorn.Server(config)
            # Avoid uvicorn installing its own signal handlers in a thread.
            server.install_signal_handlers = lambda: None  # type: ignore[method-assign]

            thread = threading.Thread(
                target=self._run_server,
                args=(server,),
                name='acqstore-server-uvicorn',
                daemon=True,
            )
            self._server = server
            self._thread = thread
            self._host = resolved_host
            self._port = resolved_port
            self._last_error = None
            thread.start()

        deadline = time.monotonic() + ready_timeout_s
        while time.monotonic() < deadline:
            if not self.is_running:
                with self._lock:
                    detail = self._last_error or 'server thread exited during startup'
                raise ServerError(detail)
            if _port_is_open(resolved_host, resolved_port):
                status = self.status(probe_health=True)
                if status.healthy:
                    logger.info(
                        'ServerController listening %s', status.base_url
                    )
                    return status
            time.sleep(0.05)

        self.stop(timeout_s=2.0)
        raise ServerError(
            f'Server did not become ready at '
            f'http://{resolved_host}:{resolved_port} within {ready_timeout_s}s'
        )

    def stop(self, *, timeout_s: float = 5.0) -> ServerStatus:
        """Request shutdown and join the server thread.

        Args:
            timeout_s: Max seconds to wait for the thread to exit.

        Returns:
            Status after stop (``running`` should be false).
        """
        with self._lock:
            server = self._server
            thread = self._thread
            host = self._host
            port = self._port

        if server is not None:
            server.should_exit = True

        if thread is not None and thread.is_alive():
            thread.join(timeout=timeout_s)

        with self._lock:
            if thread is not None and thread.is_alive():
                self._last_error = f'server thread did not stop within {timeout_s}s'
            else:
                self._server = None
                self._thread = None
                self._last_error = None

        return self._status_unlocked(
            host=host,
            port=port,
            probe_health=False,
        )

    def status(self, *, probe_health: bool = True) -> ServerStatus:
        """Return whether the managed server is running and optionally healthy."""
        with self._lock:
            return self._status_unlocked(
                host=self._host,
                port=self._port,
                probe_health=probe_health,
            )

    def wait(self) -> None:
        """Block until the server thread exits (CLI helper)."""
        with self._lock:
            thread = self._thread
        if thread is not None:
            thread.join()

    def wait_until_healthy(self, *, timeout_s: float = 10.0) -> ServerStatus:
        """Poll until ``/api/v2/health`` succeeds or raise :class:`ServerError`."""
        deadline = time.monotonic() + timeout_s
        last: ServerStatus | None = None
        while time.monotonic() < deadline:
            last = self.status(probe_health=True)
            if last.healthy:
                return last
            if not last.running:
                raise ServerError(last.error or 'server is not running')
            time.sleep(0.05)
        raise ServerError(
            f'Server not healthy within {timeout_s}s'
            + (f': {last.error}' if last and last.error else '')
        )

    @property
    def is_running(self) -> bool:
        with self._lock:
            thread = self._thread
            server = self._server
        if thread is None or not thread.is_alive():
            return False
        if server is not None and server.should_exit:
            return False
        return True

    def _run_server(self, server: uvicorn.Server) -> None:
        try:
            server.run()
        except OSError as exc:
            errno = getattr(exc, 'errno', None)
            if errno in {48, 98}:
                message = f'Port bind failed: {exc}'
                with self._lock:
                    self._last_error = message
                logger.error(message)
                return
            with self._lock:
                self._last_error = str(exc)
            raise
        except Exception as exc:  # noqa: BLE001
            with self._lock:
                self._last_error = f'{type(exc).__name__}: {exc}'
            logger.exception('ServerController thread crashed')
            raise

    def _status_unlocked(
        self,
        *,
        host: str,
        port: int,
        probe_health: bool,
    ) -> ServerStatus:
        base_url = f'http://{host}:{port}'
        running = self.is_running
        healthy: bool | None = None
        error = self._last_error
        if probe_health and running:
            healthy = _probe_health(base_url)
            if healthy is False and error is None:
                error = f'health check failed at {base_url}/api/v2/health'
        elif probe_health and not running:
            healthy = False
        return ServerStatus(
            running=running,
            host=host,
            port=port,
            base_url=base_url,
            healthy=healthy,
            error=error,
        )


def _port_is_open(host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.2):
            return True
    except OSError:
        return False


def _probe_health(base_url: str) -> bool:
    url = f'{base_url}/api/v2/health'
    try:
        with urllib.request.urlopen(url, timeout=0.5) as response:
            if getattr(response, 'status', 200) != 200:
                return False
            payload = json.loads(response.read().decode('utf-8'))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError):
        return False
    return payload.get('ok') is True and payload.get('apiVersion') == 'v2'
