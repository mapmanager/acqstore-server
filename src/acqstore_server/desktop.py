"""Desktop entry for nicegui-pack / double-click (native status UI).

Sets ``ACQSTORE_SERVER_NATIVE=1`` then runs the shared ``main()``.

Packaging (PyInstaller / nicegui-pack):
    - ``multiprocessing.freeze_support()`` under ``__main__`` only.
    - Never call ``main()`` from ``__mp_main__``.
    - On ``__mp_main__``, only re-apply native ``window_args`` (spawn child).
    - NiceGUI ``reload=False`` (enforced in ``main_native``).
"""

from __future__ import annotations

import multiprocessing
import os

os.environ.setdefault('ACQSTORE_SERVER_NATIVE', '1')

from acqstore_server.app import configure_native_status_window, main  # noqa: E402


if __name__ == '__main__':
    multiprocessing.freeze_support()
    main()
elif __name__ == '__mp_main__':
    # macOS NiceGUI native spawn: pywebview child re-imports this module.
    configure_native_status_window()
