"""Package version from pack-time stamp or installed distribution metadata."""

from __future__ import annotations

from importlib.metadata import PackageNotFoundError, version
from typing import Any

# Distribution name in pyproject.toml ``[project].name`` (not the import package).
_DISTRIBUTION_NAME = 'acqstore-server'


def get_stamped_build_info() -> dict[str, Any]:
    """Return pack-time ``BUILD_INFO`` when present.

    Packaging writes ``acqstore_server._build_info`` before nicegui-pack and
    removes it from the source tree afterward. The frozen app keeps a copy.

    Returns:
        Stamped metadata dict, or ``{}`` for normal development installs.
    """
    try:
        from acqstore_server._build_info import BUILD_INFO  # type: ignore[import-not-found]
    except Exception:
        return {}
    if not isinstance(BUILD_INFO, dict):
        return {}
    return dict(BUILD_INFO)


def get_package_version() -> str:
    """Return package version from stamp, install metadata, or a sentinel.

    Returns:
        Stamped ``version``, else ``importlib.metadata`` for
        ``acqstore-server``, else ``0.0.0+unknown`` when metadata is missing
        (typical for an unstamped frozen app).
    """
    stamped = get_stamped_build_info().get('version')
    if stamped:
        return str(stamped)
    try:
        return version(_DISTRIBUTION_NAME)
    except PackageNotFoundError:
        return '0.0.0+unknown'


def get_acqstore_version() -> str | None:
    """Return the AcqStore dependency version when known.

    Prefers the pack-time stamp; otherwise tries installed ``acqstore``
    metadata.

    Returns:
        Version string, or ``None`` when unavailable.
    """
    stamped = get_stamped_build_info().get('acqstore_version')
    if stamped and str(stamped) != 'unknown':
        return str(stamped)
    try:
        return version('acqstore')
    except PackageNotFoundError:
        return None


__version__ = get_package_version()
