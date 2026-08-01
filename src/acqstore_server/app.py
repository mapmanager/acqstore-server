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
    """Resolve bind host/port from args or environment.

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


def _resolve_bind() -> tuple[str, int]:
    """CLI bind helper; exits the process on invalid host (legacy behavior)."""
    try:
        return resolve_bind()
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc


def main_uvicorn() -> None:
    """Run API-only uvicorn (no native window)."""
    from acqstore_server.runtime import ServerController

    ensure_logging()
    host, port = _resolve_bind()
    controller = ServerController()
    try:
        status = controller.start(host=host, port=port, app=app)
    except Exception as exc:  # noqa: BLE001 — CLI surfaces typed runtime errors
        from acqstore_server.runtime import PortInUseError

        if isinstance(exc, PortInUseError):
            logger.error('Port %s already in use: %s', port, exc)
            print(
                f'[acqstore_server] ERROR: port {port} is already in use.\n'
                f'  Stop the old process, then retry:\n'
                f'    lsof -nP -iTCP:{port} -sTCP:LISTEN\n'
                f'    kill $(lsof -nP -iTCP:{port} -sTCP:LISTEN -t)\n'
                f'  See docs-dev/README.md (Dev run / stop).',
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

    NiceGUI's ``ui.run`` installs Starlette ``GZipMiddleware`` by default
    (``compresslevel=9``). Browsers send ``Accept-Encoding: gzip``, and that
    middleware compresses the full body before sending response headers. Real
    float32 session planes (~20 MB) are highly compressible and take on the
    order of 15–20 seconds per GET at level 9; the same payload without gzip is
    tens of milliseconds on localhost. API-only uvicorn never installs this
    middleware. Pass ``gzip_middleware_factory=None`` so native mode matches.

    Args:
        host: Bind host for ``ui.run``.
        port: Bind port for ``ui.run``.

    Returns:
        Keyword arguments for :func:`nicegui.ui.run`.

    See also:
        https://nicegui.io/documentation/section_configuration_deployment
    """
    return {
        'host': host,
        'port': port,
        'title': 'AcqStore Server',
        'native': True,
        'reload': False,
        'dark': True,
        'window_size': (560, 640),
        'show': True,
        'storage_secret': 'acqstore-server-local',
        'fastapi_docs': True,
        'show_welcome_message': False,
        # Required: do not gzip large API session binary responses.
        'gzip_middleware_factory': None,
    }


def main_native() -> None:
    """Run NiceGUI native status window + API v2 routes on one port."""
    from nicegui import app as nicegui_app
    from nicegui import ui

    from acqstore_server.status_ui import build_status_page

    ensure_logging()
    host, port = _resolve_bind()
    pick_file = pick_acquisition_file

    nicegui_app.add_middleware(
        CORSMiddleware,
        allow_origins=['*'],
        allow_credentials=False,
        allow_methods=['*'],
        allow_headers=['*'],
    )
    attach_api(
        nicegui_app,
        pick_file_fn=pick_file,
        include_root_json=False,
        mount_demo=True,
    )

    @ui.page('/')
    def _status_page() -> None:
        build_status_page(host=host, port=port)

    logger.info('%s v%s native UI http://%s:%s', APP_NAME, APP_VERSION, host, port)
    print(f'[acqstore_server] {APP_NAME} v{APP_VERSION} (native status UI)')
    print(f'[acqstore_server] listening http://{host}:{port}')
    print(f'[acqstore_server] demo http://{host}:{port}/demo/v2/')
    print(f'[acqstore_server] log {log_file_path()}')
    print('[acqstore_server] Quit the status window to stop the server')

    ui.run(**native_ui_run_kwargs(host=host, port=port))


def main() -> None:
    """Entry: native status UI when ``ACQSTORE_SERVER_NATIVE=1``, else uvicorn."""
    if _env_true('ACQSTORE_SERVER_NATIVE'):
        main_native()
    else:
        main_uvicorn()


# ASGI target for ``uvicorn acqstore_server.app:app``.
app = create_app()
