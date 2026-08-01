"""FastAPI / NiceGUI entry for AcqStore Server (API v2)."""

from __future__ import annotations

import os
import sys
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from acqstore_server.constants import (
    APP_NAME,
    APP_VERSION,
    DEFAULT_HOST,
    DEFAULT_PORT,
    DEFAULT_UI_PORT,
    PickFileFn,
)
from acqstore_server.dialogs import pick_acquisition_file
from acqstore_server.logging_setup import ensure_logging, get_logger, log_file_path
from acqstore_server.v2.demo import register_demo_routes as register_v2_demo_routes
from acqstore_server.v2.open_service import open_acquisition
from acqstore_server.v2.routes import (
    OpenAcquisitionFn,
    create_router as create_v2_router,
)
from acqstore_server.v2.session_store import SessionStore

_TRUE = {'1', 'true', 'yes', 'y', 'on'}

logger = get_logger('app')


def _env_true(name: str, default: str = '0') -> bool:
    return os.environ.get(name, default).strip().lower() in _TRUE


def attach_api(
    app: Any,
    *,
    session_store: SessionStore | None = None,
    pick_file_fn: PickFileFn | None = None,
    open_fn: OpenAcquisitionFn = open_acquisition,
    include_root_json: bool = False,
    mount_demo: bool = True,
) -> SessionStore:
    """Attach API v2 routes (and optional demo / root JSON) to an ASGI app.

    Args:
        app: FastAPI or NiceGUI app.
        session_store: Optional in-memory session store (tests / embedding).
        pick_file_fn: Optional native file picker override.
        open_fn: Acquisition opener (tests may inject).
        include_root_json: When true, register ``GET /`` discovery JSON.
        mount_demo: When true, register ``/demo/v2/`` and ``/demo/`` redirect.

    Returns:
        The session store bound to the mounted router.
    """
    store = session_store or SessionStore()
    pick_file = pick_file_fn or pick_acquisition_file
    app.include_router(create_v2_router(store=store, pick_file=pick_file, open_fn=open_fn))
    if mount_demo:
        register_v2_demo_routes(app)
    if include_root_json:

        @app.get('/')
        def root() -> dict[str, object]:
            host = os.environ.get('ACQSTORE_SERVER_HOST', DEFAULT_HOST)
            port = int(os.environ.get('ACQSTORE_SERVER_PORT', str(DEFAULT_PORT)))
            return {
                'ok': True,
                'app': APP_NAME,
                'version': APP_VERSION,
                'bind': f'{host}:{port}',
                'api': '/api/v2',
                'health': '/api/v2/health',
                'docs': '/docs',
                'demo': '/demo/v2/',
                'hint': 'Clients: POST /api/v2/pick-and-open or /api/v2/open.',
            }

    return store


def create_app(
    *,
    session_store: SessionStore | None = None,
    pick_file_fn: PickFileFn | None = None,
    open_fn: OpenAcquisitionFn = open_acquisition,
) -> FastAPI:
    """Build the AcqStore Server ASGI app (API-only / CLI mode).

    Args:
        session_store: Optional store override (tests).
        pick_file_fn: Optional native/open picker override (tests).
        open_fn: Optional acquisition opener override (tests).

    Returns:
        Configured :class:`fastapi.FastAPI` instance.
    """
    ensure_logging()
    app = FastAPI(
        title='AcqStore Server',
        version=APP_VERSION,
        description=(
            'Local HTTP API for opening acquisition files with AcqStore and '
            'serving selected two-dimensional channel planes. Use /docs for '
            'interactive OpenAPI. Demo UI at /demo/v2/.'
        ),
        docs_url='/docs',
        redoc_url='/redoc',
        openapi_url='/openapi.json',
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=['*'],
        allow_credentials=False,
        allow_methods=['*'],
        allow_headers=['*'],
    )
    attach_api(
        app,
        session_store=session_store,
        pick_file_fn=pick_file_fn,
        open_fn=open_fn,
        include_root_json=True,
        mount_demo=True,
    )
    return app


def resolve_bind(
    host: str | None = None,
    port: int | None = None,
) -> tuple[str, int]:
    """Resolve API bind host/port from args or environment.

    Args:
        host: Explicit host, or ``None`` to use ``ACQSTORE_SERVER_HOST`` / default.
        port: Explicit port, or ``None`` to use ``ACQSTORE_SERVER_PORT`` / default.

    Returns:
        ``(host, port)`` suitable for localhost-only serving.

    Raises:
        ValueError: If the resolved host is not loopback.
    """
    resolved_host = (
        host
        if host is not None
        else os.environ.get('ACQSTORE_SERVER_HOST', DEFAULT_HOST)
    )
    if port is not None:
        resolved_port = int(port)
    else:
        resolved_port = int(os.environ.get('ACQSTORE_SERVER_PORT', str(DEFAULT_PORT)))
    if resolved_host not in {'127.0.0.1', 'localhost'}:
        raise ValueError(
            f'AcqStore Server binds localhost only; refused host={resolved_host!r}. '
            'Use host=127.0.0.1 or set ACQSTORE_SERVER_HOST=127.0.0.1'
        )
    return resolved_host, resolved_port


def resolve_ui_bind(
    host: str | None = None,
    port: int | None = None,
) -> tuple[str, int]:
    """Resolve NiceGUI status-window bind host/port.

    Args:
        host: Explicit host, or ``None`` to use ``ACQSTORE_SERVER_UI_HOST`` /
            ``ACQSTORE_SERVER_HOST`` / default.
        port: Explicit port, or ``None`` to use ``ACQSTORE_SERVER_UI_PORT`` /
            default UI port (``8766``).

    Returns:
        ``(host, port)`` for the status UI listener.

    Raises:
        ValueError: If the resolved host is not loopback.
    """
    resolved_host = (
        host
        if host is not None
        else os.environ.get(
            'ACQSTORE_SERVER_UI_HOST',
            os.environ.get('ACQSTORE_SERVER_HOST', DEFAULT_HOST),
        )
    )
    if port is not None:
        resolved_port = int(port)
    else:
        resolved_port = int(
            os.environ.get('ACQSTORE_SERVER_UI_PORT', str(DEFAULT_UI_PORT))
        )
    if resolved_host not in {'127.0.0.1', 'localhost'}:
        raise ValueError(
            f'AcqStore Server UI binds localhost only; refused host={resolved_host!r}.'
        )
    return resolved_host, resolved_port


def _resolve_bind() -> tuple[str, int]:
    """CLI API bind helper; exits the process on invalid host (legacy behavior)."""
    try:
        return resolve_bind()
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc


def _resolve_ui_bind() -> tuple[str, int]:
    """CLI UI bind helper; exits the process on invalid host."""
    try:
        return resolve_ui_bind()
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc


def main_uvicorn() -> None:
    """Run API-only uvicorn (no native window)."""
    from acqstore_server.runtime import (
        PortInUseError,
        ServerController,
        looks_like_running_desktop,
    )

    ensure_logging()
    host, port = _resolve_bind()
    ui_host, ui_port = _resolve_ui_bind()

    if looks_like_running_desktop(
        api_host=host,
        api_port=port,
        ui_host=ui_host,
        ui_port=ui_port,
    ):
        print(
            f'[acqstore_server] AcqStore Server desktop already looks running '
            f'(API {host}:{port}, UI {ui_host}:{ui_port}).\n'
            f'  Use the open status window, or Quit that window first.\n'
            f'  From the GUI: Free API port / Start API (reclaim) if needed.',
            file=sys.stderr,
        )
        raise SystemExit(0)

    controller = ServerController()
    try:
        status = controller.start(host=host, port=port, app=app)
    except Exception as exc:  # noqa: BLE001 — CLI surfaces typed runtime errors
        if isinstance(exc, PortInUseError):
            logger.error('Port %s already in use: %s', port, exc)
            print(
                f'[acqstore_server] ERROR: port {port} is already in use.\n'
                f'  If a desktop window is open, Quit it or use Free API port there.\n'
                f'  Or inspect/kill the listener:\n'
                f'    lsof -nP -iTCP:{port} -sTCP:LISTEN\n'
                f'    kill $(lsof -nP -iTCP:{port} -sTCP:LISTEN -t)',
                file=sys.stderr,
            )
            raise SystemExit(1) from exc
        raise

    logger.info('%s v%s listening http://%s:%s', APP_NAME, APP_VERSION, host, port)
    logger.info('health http://%s:%s/api/v2/health', host, port)
    logger.info('demo http://%s:%s/demo/v2/', host, port)
    logger.info('log file %s', log_file_path())
    print(f'[acqstore_server] {APP_NAME} v{APP_VERSION}')
    print(f'[acqstore_server] listening {status.base_url}')
    print(f'[acqstore_server] demo {status.base_url}/demo/v2/')
    print(f'[acqstore_server] API docs {status.base_url}/docs')
    print(f'[acqstore_server] log {log_file_path()}')
    print('[acqstore_server] stop: Ctrl+C in this terminal')
    print(
        f'[acqstore_server] if port busy: '
        f'kill $(lsof -nP -iTCP:{port} -sTCP:LISTEN -t)'
    )

    try:
        controller.wait()
    except KeyboardInterrupt:
        controller.stop()


def native_ui_run_kwargs(*, host: str, port: int) -> dict[str, object]:
    """Return ``ui.run`` kwargs for the native status window.

    The status UI no longer serves API binary planes; ``gzip_middleware_factory``
    remains disabled so a future co-mount cannot regress plane latency.

    Args:
        host: Bind host for ``ui.run`` (status UI only).
        port: Bind port for ``ui.run`` (status UI only; default ``8766``).

    Returns:
        Keyword arguments for :func:`nicegui.ui.run`.
    """
    return {
        'host': host,
        'port': port,
        'title': 'AcqStore Server',
        'native': True,
        'reload': False,
        'dark': True,
        'window_size': (640, 720),
        'show': True,
        'storage_secret': 'acqstore-server-local',
        # API docs live on the ServerController port, not the status UI.
        'fastapi_docs': False,
        'show_welcome_message': False,
        'gzip_middleware_factory': None,
    }


def main_native() -> None:
    """Run NiceGUI status UI as a client of :class:`ServerController`.

    The API listens on the API bind (default ``127.0.0.1:8767``). The status
    window listens on the UI bind (default ``127.0.0.1:8766``).
    """
    from nicegui import app as nicegui_app
    from nicegui import ui

    from acqstore_server.runtime import (
        PortInUseError,
        ServerController,
        ServerError,
        bind_available,
        looks_like_running_desktop,
    )
    from acqstore_server.status_ui import build_status_page

    ensure_logging()
    api_host, api_port = _resolve_bind()
    ui_host, ui_port = _resolve_ui_bind()

    if looks_like_running_desktop(
        api_host=api_host,
        api_port=api_port,
        ui_host=ui_host,
        ui_port=ui_port,
    ):
        print(
            f'[acqstore_server] AcqStore Server already looks running '
            f'(API {api_host}:{api_port}, UI {ui_host}:{ui_port}).\n'
            f'  Use the existing status window, or Quit it first.\n'
            f'  If no window is visible (stale process), free both ports:\n'
            f'    lsof -nP -iTCP:{ui_port} -sTCP:LISTEN\n'
            f'    lsof -nP -iTCP:{api_port} -sTCP:LISTEN\n'
            f'    kill $(lsof -nP -iTCP:{ui_port} -sTCP:LISTEN -t) '
            f'$(lsof -nP -iTCP:{api_port} -sTCP:LISTEN -t)',
            file=sys.stderr,
        )
        raise SystemExit(0)

    if not bind_available(ui_host, ui_port):
        print(
            f'[acqstore_server] ERROR: status UI port {ui_host}:{ui_port} is in use,\n'
            f'  but the API port {api_host}:{api_port} may still be free.\n'
            f'  Free or quit whatever holds {ui_port}, then retry:\n'
            f'    lsof -nP -iTCP:{ui_port} -sTCP:LISTEN\n'
            f'    kill $(lsof -nP -iTCP:{ui_port} -sTCP:LISTEN -t)',
            file=sys.stderr,
        )
        raise SystemExit(1)

    controller = ServerController()

    try:
        status = controller.start(host=api_host, port=api_port)
        logger.info('API started at %s', status.base_url)
    except PortInUseError as exc:
        logger.error('API port in use at startup: %s', exc)
        print(
            f'[acqstore_server] WARNING: could not auto-start API on '
            f'{api_host}:{api_port}: {exc}\n'
            f'  Status UI will still open. Use Free API port or '
            f'Start API (reclaim).',
            file=sys.stderr,
        )
    except ServerError as exc:
        logger.error('API failed to auto-start: %s', exc)
        print(
            f'[acqstore_server] WARNING: could not auto-start API: {exc}\n'
            f'  Use Start API in the status window to retry.',
            file=sys.stderr,
        )

    @nicegui_app.on_shutdown
    def _stop_api_on_shutdown() -> None:
        controller.stop()
        # Closing the native window (red X) must release ports for the next launch.
        from acqstore_server.status_ui import _force_process_exit

        _force_process_exit()

    @ui.page('/')
    def _status_page() -> None:
        build_status_page(
            controller=controller,
            api_host=api_host,
            api_port=api_port,
            ui_host=ui_host,
            ui_port=ui_port,
        )

    api_base = f'http://{api_host}:{api_port}'
    logger.info(
        '%s v%s status UI http://%s:%s (API %s)',
        APP_NAME,
        APP_VERSION,
        ui_host,
        ui_port,
        api_base,
    )
    print(f'[acqstore_server] {APP_NAME} v{APP_VERSION} (native status UI)')
    print(f'[acqstore_server] status UI http://{ui_host}:{ui_port}')
    print(f'[acqstore_server] API {api_base}')
    print(f'[acqstore_server] demo {api_base}/demo/v2/')
    print(f'[acqstore_server] log {log_file_path()}')
    print('[acqstore_server] Quit the status window to stop the API')

    ui.run(**native_ui_run_kwargs(host=ui_host, port=ui_port))


def main() -> None:
    """Entry: native status UI when ``ACQSTORE_SERVER_NATIVE=1``, else uvicorn."""
    if _env_true('ACQSTORE_SERVER_NATIVE'):
        main_native()
    else:
        main_uvicorn()


# ASGI target for ``uvicorn acqstore_server.app:app``.
app = create_app()
