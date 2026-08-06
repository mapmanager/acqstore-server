#!/usr/bin/env bash
# Resolve the versioned release DMG path (same naming as build_dmg.sh).
# Uses RELEASE_SLUG so the DMG basename has no spaces.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_config.sh"

APP_VERSION="$(grep -E '^version[[:space:]]*=' "$REPO_ROOT/pyproject.toml" 2>/dev/null | head -1 | sed -E 's/^version[[:space:]]*=[[:space:]]*["'\'' ]*([^"'\'' ]+)["'\'' ]*.*/\1/')"
APP_VERSION="${APP_VERSION:-0.0.0}"
REL_BASENAME="${RELEASE_SLUG}-v${APP_VERSION}-${RELEASE_PLATFORM}"
export DMG_PATH="${DMG_PATH:-$DIST_DIR/${REL_BASENAME}.dmg}"
export DMG_SHA256_PATH="${DMG_SHA256_PATH:-$DMG_PATH.sha256}"
export APP_VERSION REL_BASENAME
