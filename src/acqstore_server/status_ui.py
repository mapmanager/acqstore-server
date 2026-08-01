"""NiceGUI status window — thin client of :class:`ServerController`.

Layout is end-user oriented. Technical notes for maintainers belong in
docstrings, code comments, and MkDocs — not in the live UI chrome.

The scrolling log panel shows the in-memory ``get_ui_log_text()`` buffer for
this desktop process (see ``logging_setup``); it is not a live file tail.
"""

from __future__ import annotations

import asyncio
import json
import os
import platform
import subprocess
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

from nicegui import ui

from acqstore_server.constants import APP_NAME, APP_VERSION
from acqstore_server.gui_defaults import setUpGuiDefaults
from acqstore_server.logging_setup import get_logger, get_ui_log_text, log_file_path
from acqstore_server.ports import PortReclaimError
from acqstore_server.runtime import (
    AlreadyRunningError,
    PortInUseError,
    ServerController,
    ServerError,
    ServerStatus,
)

logger = get_logger('status_ui')

# Public MkDocs site published via GitHub Pages from this private repository.
PUBLIC_DOCS_URL = 'https://mapmanager.github.io/acqstore-server/'


def format_status_line(
    status: ServerStatus,
    *,
    ui_bind: str,
    server_version: str | None = None,
) -> str:
    """Return a one-line status summary for the footer.

    User-facing copy says \"Server\" for the :8767 listener; \"UI\" is the
    NiceGUI status window port (:8766).
    """
    if status.running and status.healthy:
        server_state = f'Server running (healthy) {status.base_url}'
    elif status.running:
        server_state = f'Server running (not healthy) {status.base_url}'
    else:
        server_state = f'Server stopped ({status.host}:{status.port})'
    if status.error:
        server_state = f'{server_state} — {status.error}'
    version_bit = (
        f' | server {server_version}' if server_version else ''
    )
    return f'{server_state}{version_bit} | UI {ui_bind}'


def format_header_versions(
    *,
    ui_version: str,
    server_version: str | None,
) -> str:
    """Return header version text: local UI build and HTTP-reported server."""
    if server_version:
        return f'UI {ui_version} · server {server_version}'
    return f'UI {ui_version} · server —'


def _open_path_with_default_app(path: Path) -> None:
    """Open ``path`` with the OS default application."""
    resolved = path.expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError(str(resolved))
    system = platform.system()
    if system == 'Darwin':
        subprocess.run(['open', str(resolved)], check=False)
    elif system == 'Windows':
        os.startfile(resolved)  # type: ignore[attr-defined]
    else:
        subprocess.run(['xdg-open', str(resolved)], check=False)


def _force_process_exit(*, delay_s: float = 0.35) -> None:
    """Ensure the desktop process exits after NiceGUI shutdown.

    Native ``ui.run`` / pywebview can leave the interpreter alive with ports
    still bound; the next launch then thinks the app is still running.
    """

    def _exit() -> None:
        time.sleep(delay_s)
        logger.info('Forcing process exit after status UI shutdown')
        os._exit(0)

    threading.Thread(target=_exit, name='acqstore-server-exit', daemon=True).start()


def build_status_page(
    *,
    controller: ServerController,
    api_host: str,
    api_port: int,
    ui_host: str,
    ui_port: int,
) -> None:
    """Build the native status page as a client of ``controller``."""
    setUpGuiDefaults('text-xs')

    log_path = log_file_path()
    ui_bind = f'{ui_host}:{ui_port}'
    # Local package build (this process). Server package version comes from HTTP.
    reported_server_version: list[str | None] = [None]

    ui.colors(primary='#38bdf8')

    with ui.column().classes('w-full h-full p-3 gap-2'):
        with ui.row().classes('w-full items-center gap-2 flex-wrap'):
            ui.label(APP_NAME).classes('text-h6 text-primary')
            ui.label('|').classes('text-grey-6')
            version_label = ui.label(
                format_header_versions(
                    ui_version=APP_VERSION,
                    server_version=None,
                )
            ).classes('text-body2 text-grey-5')
            ui.label('|').classes('text-grey-6')
            docs_btn = ui.button(
                'Documentation',
                on_click=lambda: webbrowser.open(PUBLIC_DOCS_URL),
            ).props('outline dense color=primary')
            docs_btn.tooltip('Open the AcqStore Server user docs in your browser')

        def _start_server() -> None:
            try:
                status = controller.start(
                    host=api_host,
                    port=api_port,
                )
            except AlreadyRunningError:
                ui.notify('The server is already running.', type='warning')
                _sync_controls()
                return
            except PortInUseError as exc:
                logger.warning('Start server port busy: %s', exc)
                ui.notify(
                    'That port is busy. Try Free server port, then Start again.',
                    type='warning',
                )
                _sync_controls()
                return
            except ServerError as exc:
                logger.warning('Start server failed: %s', exc)
                ui.notify(f'Could not start the server: {exc}', type='negative')
                _sync_controls()
                return
            logger.info('Server started via status UI at %s', status.base_url)
            ui.notify('Server started.', type='positive')
            _sync_controls()

        def _stop_server() -> None:
            status = controller.stop()
            logger.info('Server stopped via status UI (%s:%s)', status.host, status.port)
            ui.notify('Server stopped.', type='info')
            _sync_controls()

        def _list_server_listeners() -> None:
            try:
                pids = controller.list_port_listeners(port=api_port)
            except PortReclaimError as exc:
                ui.notify(f'Could not list port users: {exc}', type='negative')
                return
            if not pids:
                logger.info('No LISTEN pids on server port %s', api_port)
                ui.notify('Nothing else is using the server port.', type='info')
            else:
                logger.info('LISTEN pids on server port %s: %s', api_port, pids)
                ui.notify(f'Server port in use by process id(s): {pids}', type='warning')

        def _free_server_port() -> None:
            try:
                killed = controller.reclaim_port(port=api_port)
            except PortReclaimError as exc:
                logger.warning('Free server port failed: %s', exc)
                ui.notify(f'Could not free the server port: {exc}', type='negative')
                _sync_controls()
                return
            if killed:
                logger.info('Freed server port %s; signaled pids=%s', api_port, killed)
                ui.notify('Server port freed.', type='positive')
            else:
                ui.notify('Server port was already free.', type='info')
            _sync_controls()

        def _open_demo() -> None:
            status = controller.status(probe_health=False)
            if not status.running:
                ui.notify('Start the server first.', type='warning')
                return
            webbrowser.open(f'{status.base_url}/demo/v2/')

        def _open_docs() -> None:
            status = controller.status(probe_health=False)
            if not status.running:
                ui.notify('Start the server first.', type='warning')
                return
            webbrowser.open(f'{status.base_url}/docs')

        async def _show_health() -> None:
            status = controller.status(probe_health=False)
            if not status.running:
                ui.notify('Start the server first.', type='warning')
                return
            url = status.health_url
            try:
                def _fetch() -> str:
                    with urllib.request.urlopen(url, timeout=5) as resp:
                        return resp.read().decode('utf-8')

                raw = await asyncio.to_thread(_fetch)
                try:
                    payload = json.loads(raw)
                    text = json.dumps(payload, indent=2)
                    if isinstance(payload, dict) and payload.get('serverVersion'):
                        reported_server_version[0] = str(payload['serverVersion'])
                except json.JSONDecodeError:
                    text = raw
                logger.info('Health %s\n%s', url, text)
                ui.notify('Server is healthy.', type='positive')
            except Exception as exc:  # noqa: BLE001
                logger.warning('Health request failed: %s — %s', url, exc)
                ui.notify(f'Health check failed: {exc}', type='negative')
            _sync_controls()
            _sync_version_labels()

        def _open_log() -> None:
            try:
                _open_path_with_default_app(log_path)
            except FileNotFoundError:
                ui.notify('Log file is not available yet.', type='warning')
            except OSError as exc:
                ui.notify(f'Unable to open log file: {exc}', type='negative')
                logger.warning('Failed to open log %s: %s', log_path, exc)

        # --- Clients (primary) ---
        ui.label('Clients').classes('text-subtitle2 text-grey-5')
        with ui.row().classes('gap-2 flex-wrap'):
            open_demo_btn = ui.button('Open demo', on_click=_open_demo).props(
                'color=primary'
            )
            open_demo_btn.tooltip('Open the browser demo for this server')

            # Opens FastAPI /docs (OpenAPI) on the server port.
            api_docs_btn = ui.button('API docs', on_click=_open_docs).props('outline')
            api_docs_btn.tooltip('Open interactive HTTP API documentation')

            health_btn = ui.button('Check health', on_click=_show_health).props(
                'outline'
            )
            health_btn.tooltip('Ask the server if it is responding')

        # --- Server (ops) — controls the :8767 listener, not the NiceGUI UI port ---
        ui.label('Server').classes('text-subtitle2 text-grey-5')
        with ui.row().classes('gap-2 flex-wrap'):
            start_btn = ui.button(
                'Start server',
                on_click=_start_server,
            ).props('outline color=primary')
            start_btn.tooltip('Start the local server on the default port')

            stop_btn = ui.button('Stop server', on_click=_stop_server).props('outline')
            stop_btn.tooltip('Stop the local server (demo and clients will disconnect)')

            list_btn = ui.button(
                'Who uses server port?',
                on_click=_list_server_listeners,
            ).props('outline')
            list_btn.tooltip('Show which process is holding the server port')

            free_btn = ui.button('Free server port', on_click=_free_server_port).props(
                'outline color=negative'
            )
            free_btn.tooltip('Stop our server and clear anything blocking the port')

            open_log_btn = ui.button('Open log file', on_click=_open_log).props('outline')
            open_log_btn.tooltip('Open the log file in your default viewer')

        def _sync_controls() -> None:
            """Enable/disable actions from current server running state."""
            running = controller.status(probe_health=False).running
            # Clients need a live server.
            open_demo_btn.set_enabled(running)
            api_docs_btn.set_enabled(running)
            health_btn.set_enabled(running)
            # Start only when stopped; stop only when running.
            start_btn.set_enabled(not running)
            stop_btn.set_enabled(running)
            # Diagnostics always available.
            list_btn.set_enabled(True)
            free_btn.set_enabled(True)
            open_log_btn.set_enabled(True)

        def _sync_version_labels() -> None:
            header = format_header_versions(
                ui_version=APP_VERSION,
                server_version=reported_server_version[0],
            )
            if version_label.text != header:
                version_label.set_text(header)

        def _read_server_version(health_url: str) -> str | None:
            """HTTP client: read package version from ``/api/v2/health``."""
            try:
                with urllib.request.urlopen(health_url, timeout=1.5) as resp:
                    payload = json.loads(resp.read().decode('utf-8'))
            except Exception:  # noqa: BLE001 — UI probe; keep chrome responsive
                return None
            if not isinstance(payload, dict):
                return None
            value = payload.get('serverVersion')
            return str(value) if value else None

        _sync_controls()
        _sync_version_labels()

        # In-memory process buffer via get_ui_log_text(); see module docstring.
        ui.label('Log').classes('text-caption text-grey-5')
        with ui.scroll_area().classes('w-full border rounded').style('height: 280px'):
            log_view = (
                ui.label(get_ui_log_text())
                .classes('w-full font-mono whitespace-pre-wrap text-xs select-text')
            )

        def _refresh_log() -> None:
            text = get_ui_log_text()
            if log_view.text != text:
                log_view.set_text(text)

        ui.timer(0.5, _refresh_log)

    with ui.footer().classes('bg-grey-10 text-grey-4 q-px-md q-py-xs'):
        footer = ui.label(
            format_status_line(
                controller.status(),
                ui_bind=ui_bind,
                server_version=reported_server_version[0],
            )
        ).classes('text-caption')
        last_version_probe_s = [0.0]

        async def _refresh_footer_and_controls() -> None:
            status = controller.status()
            if not status.running:
                reported_server_version[0] = None
            else:
                now = time.monotonic()
                # Re-probe health occasionally as an HTTP client (not in-process).
                if (
                    reported_server_version[0] is None
                    or (now - last_version_probe_s[0]) >= 2.0
                ):
                    reported_server_version[0] = await asyncio.to_thread(
                        _read_server_version,
                        status.health_url,
                    )
                    last_version_probe_s[0] = now
            text = format_status_line(
                status,
                ui_bind=ui_bind,
                server_version=reported_server_version[0],
            )
            if footer.text != text:
                footer.set_text(text)
            _sync_version_labels()
            _sync_controls()

        ui.timer(0.5, _refresh_footer_and_controls)
