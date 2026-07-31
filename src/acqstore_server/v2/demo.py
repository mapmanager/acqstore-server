"""Static demonstration client registration for AcqStore Server API v2."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from acqstore_server.logging_setup import get_logger

logger = get_logger('v2.demo')


def resolve_v2_demo_dir() -> Path | None:
    """Return the packaged or source-tree API v2 demo directory."""
    candidates: list[Path] = []
    if getattr(sys, 'frozen', False):
        bundle_root = Path(getattr(sys, '_MEIPASS', Path(sys.executable).parent))
        candidates.extend(
            [
                bundle_root / 'acqstore_server' / 'static' / 'demo' / 'v2',
                bundle_root / 'static' / 'demo' / 'v2',
            ]
        )
    candidates.append(Path(__file__).resolve().parents[1] / 'static' / 'demo' / 'v2')
    for candidate in candidates:
        if candidate.is_dir() and (candidate / 'index.html').is_file():
            return candidate
    return None


def resolve_v2_demo_index() -> Path | None:
    """Return the packaged or source-tree API v2 demo HTML path."""
    demo_dir = resolve_v2_demo_dir()
    if demo_dir is None:
        return None
    return demo_dir / 'index.html'


def register_demo_routes(app: Any) -> None:
    """Serve the independent API v2 JavaScript demo at ``/demo/v2/``."""

    @app.get('/demo/v2', include_in_schema=False)
    def v2_demo_redirect() -> RedirectResponse:
        return RedirectResponse(url='/demo/v2/', status_code=307)

    demo_dir = resolve_v2_demo_dir()
    if demo_dir is None:
        logger.warning('API v2 demo directory missing; /demo/v2/ will return 404')
    else:
        logger.info('API v2 demo directory available at /demo/v2/ (%s)', demo_dir)
        app.mount(
            '/demo/v2',
            StaticFiles(directory=demo_dir, html=True),
            name='v2_demo_static',
        )
