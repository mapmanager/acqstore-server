"""Package version from installed distribution metadata (pyproject.toml)."""

from __future__ import annotations

from importlib.metadata import PackageNotFoundError, version

# Distribution name in pyproject.toml ``[project].name`` (not the import package).
_DISTRIBUTION_NAME = 'acqstore-server'


def get_package_version() -> str:
    """Return the installed package version, or a sentinel if metadata is missing."""
    try:
        return version(_DISTRIBUTION_NAME)
    except PackageNotFoundError:
        return '0.0.0+unknown'


__version__ = get_package_version()
