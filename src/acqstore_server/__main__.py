"""CLI entry: ``python -m acqstore_server``.

Default: API-only uvicorn (no native window).

Native status UI (for packing / local try)::

    ACQSTORE_SERVER_NATIVE=1 uv run python -m acqstore_server

Or::

    uv run python -m acqstore_server.desktop

Packaging rules (NiceGUI native / PyInstaller):
    - ``multiprocessing.freeze_support()`` under ``__main__`` only.
    - Never call ``main()`` from ``__mp_main__``.
    - On ``__mp_main__``, only re-apply native ``window_args`` (spawn child).
"""

from __future__ import annotations

import multiprocessing
import os

from acqstore_server.app import configure_native_status_window, main


if __name__ == '__main__':
    multiprocessing.freeze_support()
    main()
elif __name__ == '__mp_main__':
    # macOS NiceGUI native spawn: pywebview child re-imports this module.
    if os.environ.get('ACQSTORE_SERVER_NATIVE', '0').strip().lower() in {
        '1', 'true', 'yes', 'y', 'on',
    }:
        configure_native_status_window()
