#!/usr/bin/env bash
# Build "AcqStore Server.app" locally with nicegui-pack.
#
# Run from repo root:
#   ./packaging/acqstore_server/build_app.sh
#
# Smoke test after build:
#   open "packaging/acqstore_server/dist/AcqStore Server.app"
#
# Notes:
# - Does NOT codesign or notarize.
# - Outputs under packaging/acqstore_server/dist and .../build.
# - Entrypoint is src/acqstore_server/desktop.py (native status UI + API).
# - nicegui-pack always writes to cwd/dist (no --distpath). When DIST_DIR is a
#   timestamped subdirectory, we pack into the root then move the .app.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_config.sh"

cd "$SCRIPT_DIR"

_cleanup_transient_build_info() {
  if [[ -n "${BUILD_INFO_PATH:-}" && -f "$BUILD_INFO_PATH" ]]; then
    rm -f "$BUILD_INFO_PATH"
    echo "[build] Removed transient build info: $BUILD_INFO_PATH"
  fi
}

trap _cleanup_transient_build_info EXIT

echo "[build] Repo root : $REPO_ROOT"
echo "[build] App name  : $APP_NAME"
echo "[build] Bundle ID : $BUNDLE_ID"
echo "[build] Main py   : $MAIN_PY"
echo "[build] Dist dir  : $DIST_DIR"
echo "[build] Build dir : $BUILD_DIR"
echo "[build] Build venv: $BUILD_VENV_DIR"

if [[ ! -f "$MAIN_PY" ]]; then
  echo "ERROR: MAIN_PY not found: $MAIN_PY" >&2
  exit 2
fi
if [[ ! -f "$REPO_ROOT/uv.lock" ]]; then
  echo "ERROR: uv.lock not found: $REPO_ROOT/uv.lock" >&2
  exit 2
fi
if ! command -v uv >/dev/null 2>&1; then
  echo "ERROR: uv is not installed or not on PATH." >&2
  exit 2
fi

echo "[build] Syncing locked packaging environment (runtime + build group)..."
(
  cd "$REPO_ROOT"
  UV_PROJECT_ENVIRONMENT="$BUILD_VENV_DIR" uv sync --locked --no-dev --group build --group desktop
)

# shellcheck source=/dev/null
source "$BUILD_VENV_DIR/bin/activate"

echo "[build] uv: $(uv --version)"
echo "[build] Python: $(python -V)"
echo "[build] nicegui: $(python -c 'import importlib.metadata as m; print(m.version("nicegui"))')"
echo "[build] pywebview: $(python -c 'import importlib.metadata as m; print(m.version("pywebview"))')"
echo "[build] pyinstaller: $(python -c 'import importlib.metadata as m; print(m.version("pyinstaller"))')"

if ! command -v nicegui-pack >/dev/null 2>&1; then
  echo "ERROR: nicegui-pack not found on PATH after locked sync." >&2
  exit 2
fi

_remove_dir_with_retries() {
  local d="$1"
  local attempts="${2:-6}"
  local delay="${3:-0.2}"
  [[ -d "$d" ]] || return 0
  for _ in $(seq 1 "$attempts"); do
    xattr -c -r "$d" 2>/dev/null || true
    chmod -N "$d" 2>/dev/null || true
    chmod -R u+rwX "$d" 2>/dev/null || true
    chflags -R nouchg,noschg "$d" 2>/dev/null || true
    rm -rf "$d" 2>/dev/null || true
    [[ -d "$d" ]] || return 0
    sleep "$delay"
  done
  echo "ERROR: failed to remove '$d'." >&2
  exit 1
}

# nicegui-pack / PyInstaller always write to cwd/dist (no --distpath). That pack
# root is packaging/acqstore_server/dist. When DIST_DIR is a timestamped
# subdirectory, we pack into the root then move the .app into DIST_DIR.
PACK_DIST_DIR="$SCRIPT_DIR/dist"
PACK_APP_PATH="$PACK_DIST_DIR/${APP_NAME}.app"
PACK_ONEDIR_PATH="$PACK_DIST_DIR/${APP_NAME}"

echo "[build] Cleaning dist/build..."
_remove_dir_with_retries "$DIST_DIR"
_remove_dir_with_retries "$BUILD_DIR"
# Clear previous pack outputs at the fixed nicegui-pack location when DIST_DIR
# is a different folder (timestamped runs). Do not wipe sibling stamp folders.
if [[ "$DIST_DIR" != "$PACK_DIST_DIR" ]]; then
  _remove_dir_with_retries "$PACK_APP_PATH"
  _remove_dir_with_retries "$PACK_ONEDIR_PATH"
fi
mkdir -p "$DIST_DIR" "$BUILD_DIR"

# Runtime for the frozen app: NiceGUI status UI + ServerController API (two ports).
export ACQSTORE_SERVER_NATIVE=1
export ACQSTORE_SERVER_HOST="${ACQSTORE_SERVER_HOST:-127.0.0.1}"
export ACQSTORE_SERVER_PORT="${ACQSTORE_SERVER_PORT:-8767}"
export ACQSTORE_SERVER_UI_HOST="${ACQSTORE_SERVER_UI_HOST:-127.0.0.1}"
export ACQSTORE_SERVER_UI_PORT="${ACQSTORE_SERVER_UI_PORT:-8766}"

echo "[build] Stamping build identity..."
"$SCRIPT_DIR/build_info.sh"

ARGS=(
  --windowed
  --clean
  --name "$APP_NAME"
  --osx-bundle-identifier "$BUNDLE_ID"
  # Bundle demo HTML for /demo/v2/ inside the frozen app (served by API on :8767).
  --add-data "$REPO_ROOT/src/acqstore_server/static:acqstore_server/static"
)

if [[ -n "${ICON_PATH:-}" && -f "$ICON_PATH" ]]; then
  ARGS+=(--icon "$ICON_PATH")
  echo "[build] Icon: $ICON_PATH"
else
  echo "[build] Icon: none"
fi

echo "[build] Running nicegui-pack..."
(
  cd "$SCRIPT_DIR"
  nicegui-pack "${ARGS[@]}" "$MAIN_PY"
)

if [[ ! -d "$PACK_APP_PATH" ]]; then
  echo "ERROR: nicegui-pack did not create: $PACK_APP_PATH" >&2
  exit 3
fi

if [[ "$APP_PATH" != "$PACK_APP_PATH" ]]; then
  echo "[build] Moving pack output into DIST_DIR..."
  echo "[build]   from: $PACK_APP_PATH"
  echo "[build]   to  : $APP_PATH"
  mkdir -p "$(dirname "$APP_PATH")"
  _remove_dir_with_retries "$APP_PATH"
  ditto "$PACK_APP_PATH" "$APP_PATH"
  _remove_dir_with_retries "$PACK_APP_PATH"
  _remove_dir_with_retries "$PACK_ONEDIR_PATH"
fi

if [[ ! -d "$APP_PATH" ]]; then
  echo "ERROR: expected app not found: $APP_PATH" >&2
  exit 3
fi

echo "[build] Patching Info.plist versions..."
"$SCRIPT_DIR/set_plist_versions.sh"

echo ""
echo "[build] Done: $APP_PATH"
echo "[build] Smoke test:"
echo "  open '$APP_PATH'"
echo "[build] Status UI listens on http://${ACQSTORE_SERVER_UI_HOST}:${ACQSTORE_SERVER_UI_PORT}"
echo "[build] API / demo / docs on http://${ACQSTORE_SERVER_HOST}:${ACQSTORE_SERVER_PORT}"
echo "[build] Demo: http://${ACQSTORE_SERVER_HOST}:${ACQSTORE_SERVER_PORT}/demo/v2/"
echo "[build] When ready for a signed DMG:"
echo "  ./packaging/acqstore_server/build_signed_dmg.sh"
