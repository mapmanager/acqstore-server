"""Tests for static path resolution (API v2 demo)."""

from __future__ import annotations

from acqstore_server.v2.demo import resolve_v2_demo_dir, resolve_v2_demo_index


def test_resolve_v2_demo_dir_from_source_tree() -> None:
    demo_dir = resolve_v2_demo_dir()
    assert demo_dir is not None
    assert (demo_dir / 'index.html').is_file()
    assert resolve_v2_demo_index() == demo_dir / 'index.html'
