"""NiceGUI status window — thin client of :class:`ServerController`."""

from __future__ import annotations

import asyncio
import json
import os
import platform
import subprocess
import urllib.request
import webbrowser
from pathlib import Path

from nicegui import app as nicegui_app
from nicegui import ui

from acqstore_server.constants import APP_NAME, APP_VERSION
from acqstore_server.gui_defaults import setUpGuiDefaults
from acqstore_server.logging_setup import get_logger, get_ui_log_text, log_file_path
from acqstore_server.runtime import (
    AlreadyRunningError,
    ServerController,
    ServerError,
    ServerStatus,
)

logger = get_logger('status_ui')

# Public MkDocs site published via GitHub Pages from this private repository.
PUBLIC_DOCS_URL = 'https://mapmanager.github.io/acqstore-server/'


def format_status_line(status: ServerStatus, *, ui_bind: str) -> str:
    """Return a one-line status summary for the status page header/footer."""
    if status.running and status.healthy:
        api_state = f'API running (healthy) {status.base_url}'
    elif status.running:
        api_state = f'API running (not healthy) {status.base_url}'
    else:
        api_state = f'API stopped ({status.host}:{status.port})'
    if status.error:
        api_state = f'{api_state} — {status.error}'
    return f'{api_state} | UI {ui_bind}'


def _open_path_with_default_app(path: Path) -> None:
    """Open ``path`` with the OS default application.

    Args:
        path: Existing file or directory path.
    """
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


def build_status_page(
    *,
    controller: ServerController,
    api_host: str,
    api_port: int,
    ui_host: str,
    ui_port: int,
) -> None:
    """Build the native status page as a client of ``controller``.

    Args:
        controller: Manages the API-only uvicorn server.
        api_host: Intended API bind host (used when starting).
        api_port: Intended API bind port (used when starting).
        ui_host: NiceGUI bind host (display only).
        ui_port: NiceGUI bind port (display only).
    """
    setUpGuiDefaults('text-xs')

    log_path = log_file_path()
    ui_bind = f'{ui_host}:{ui_port}'

    ui.colors(primary='#38bdf8')

    with ui.column().classes('w-full h-full p-3 gap-2'):
        with ui.row().classes('w-full items-center gap-2 flex-wrap'):
            ui.label(APP_NAME).classes('text-h6 text-primary')
            ui.label('|').classes('text-grey-6')
            ui.label(f'v{APP_VERSION}').classes('text-body2 text-grey-5')
            ui.label('|').classes('text-grey-6')
            ui.button(
                'Documentation',
                on_click=lambda: webbrowser.open(PUBLIC_DOCS_URL),
            ).props('flat dense color=primary')

        status_label = (
            ui.label(format_status_line(controller.status(), ui_bind=ui_bind))
            .classes('text-body2 text-grey-4 w-full')
        )

        def _refresh_status() -> None:
            text = format_status_line(controller.status(), ui_bind=ui_bind)
            if status_label.text != text:
                status_label.set_text(text)

        def _start_api() -> None:
            try:
                status = controller.start(host=api_host, port=api_port)
            except AlreadyRunningError:
                ui.notify('API server is already running.', type='warning')
                _refresh_status()
                return
            except ServerError as exc:
                logger.warning('Start API failed: %s', exc)
                ui.notify(f'Start failed: {exc}', type='negative')
                _refresh_status()
                return
            logger.info('API started via status UI at %s', status.base_url)
            ui.notify(f'API started at {status.base_url}', type='positive')
            _refresh_status()

        def _stop_api() -> None:
            status = controller.stop()
            logger.info('API stopped via status UI (%s:%s)', status.host, status.port)
            ui.notify('API stopped.', type='info')
            _refresh_status()

        with ui.row().classes('gap-2 flex-wrap'):
            ui.button('Start API', on_click=_start_api).props('color=primary')
            ui.button('Stop API', on_click=_stop_api).props('outline')

            def _open_demo() -> None:
                status = controller.status(probe_health=False)
                if not status.running:
                    ui.notify('Start the API first.', type='warning')
                    return
                webbrowser.open(f'{status.base_url}/demo/v2/')

            def _open_docs() -> None:
                status = controller.status(probe_health=False)
                if not status.running:
                    ui.notify('Start the API first.', type='warning')
                    return
                webbrowser.open(f'{status.base_url}/docs')

            ui.button('Open demo', on_click=_open_demo).props('outline')
            ui.button('API docs (/docs)', on_click=_open_docs).props('outline')

            async def _show_health() -> None:
                status = controller.status(probe_health=False)
                if not status.running:
                    ui.notify('Start the API first.', type='warning')
                    return
                url = status.health_url
                try:
                    def _fetch() -> str:
                        with urllib.request.urlopen(url, timeout=5) as resp:
                            return resp.read().decode('utf-8')

                    raw = await asyncio.to_thread(_fetch)
                    try:
                        text = json.dumps(json.loads(raw), indent=2)
                    except json.JSONDecodeError:
                        text = raw
                    logger.info('Health %s\n%s', url, text)
                    ui.notify('Health OK (see log).', type='positive')
                except Exception as exc:  # noqa: BLE001
                    logger.warning('Health request failed: %s — %s', url, exc)
                    ui.notify(f'Health request failed: {exc}', type='negative')
                _refresh_status()

            ui.button('Show health', on_click=_show_health).props('outline')

            def _open_log() -> None:
                try:
                    _open_path_with_default_app(log_path)
                except FileNotFoundError:
                    ui.notify('Log file is not available yet.', type='warning')
                except OSError as exc:
                    ui.notify(f'Unable to open log file: {exc}', type='negative')
                    logger.warning('Failed to open log %s: %s', log_path, exc)

            ui.button('Open log', on_click=_open_log).props('outline')

            def _quit() -> None:
                logger.info('Quit requested from status UI')
                controller.stop()
                nicegui_app.shutdown()

            ui.button('Quit', on_click=_quit).props('flat color=negative')

        ui.label('Server log').classes('text-caption text-grey-5')
        with ui.scroll_area().classes('w-full border rounded').style('height: 320px'):
            log_view = (
                ui.label(get_ui_log_text())
                .classes('w-full font-mono whitespace-pre-wrap text-xs select-text')
            )

        def _refresh_log() -> None:
            text = get_ui_log_text()
            if log_view.text != text:
                log_view.set_text(text)

        ui.timer(0.5, _refresh_log)
        ui.timer(0.5, _refresh_status)

    with ui.footer().classes('bg-grey-10 text-grey-4 q-px-md q-py-xs'):
        footer = ui.label(
            format_status_line(controller.status(), ui_bind=ui_bind)
        ).classes('text-caption')

        def _refresh_footer() -> None:
            text = format_status_line(controller.status(), ui_bind=ui_bind)
            if footer.text != text:
                footer.set_text(text)

        ui.timer(0.5, _refresh_footer)