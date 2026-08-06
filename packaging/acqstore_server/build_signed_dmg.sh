#!/usr/bin/env bash
# Build a signed / notarized / stapled macOS .app and drag-drop .dmg from the
# current working tree. No git tags, branches, pushes, GitHub releases, zip, or pkg.
#
# Run from acqstore-server repo root:
#   ./packaging/acqstore_server/build_signed_dmg.sh
#   ./packaging/acqstore_server/build_signed_dmg.sh --no-pause
#
# Always allocates a fresh timestamped dist folder. Ambient DIST_DIR in your
# shell is ignored (so leftover exports cannot poison a clean run). Opt in to
# a specific folder only with --dist-dir PATH.
#
# Requires packaging/acqstore_server/_secrets.sh with:
#   SIGN_ID
#   NOTARY_PROFILE
#
# Pipeline:
#   build_app.sh
#   → codesign_and_zip.sh
#   → notary_submit.sh / staple_and_verify.sh   (.app)
#   → build_dmg.sh
#   → notary_submit_dmg.sh / staple_and_verify_dmg.sh
#
# The notary_submit* scripts wait for Apple's verdict, so no separate poll step.
# export DIST_DIR inside this script only affects child processes — not your
# interactive shell.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

NO_PAUSE="${ACQSTORE_SERVER_RELEASE_NO_PAUSE:-0}"
DIST_DIR_EXPLICIT=""

usage() {
  cat <<'EOF'
Usage: ./packaging/acqstore_server/build_signed_dmg.sh [options]

Build a signed/notarized/stapled AcqStore Server.app and drag-drop .dmg.
Does not create git tags, zip, pkg, or GitHub releases.

Always writes to a new packaging/acqstore_server/dist/YYYYMMDD.HH.MM.SS/
folder. Ignores any DIST_DIR already set in your shell.

  --no-pause          Skip smoke-test prompt after build_app.sh
  --dist-dir PATH     Use this output folder instead of a new timestamp
                      (explicit recovery / rebuild into a known path)
  -h, --help          Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-pause)
      NO_PAUSE=1
      shift
      ;;
    --dist-dir)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "ERROR: --dist-dir requires a path argument" >&2
        usage >&2
        exit 2
      fi
      DIST_DIR_EXPLICIT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

# Drop ambient path vars so a leftover export DIST_DIR=... (or derived paths)
# from a previous recovery attempt cannot redirect this run.
unset DIST_DIR APP_PATH APP_PLIST APP_MAIN_BIN PRE_NOTARIZE_ZIP
unset NOTARY_SUBMISSION_ID_FILE NOTARY_DMG_SUBMISSION_ID_FILE
unset DMG_PATH DMG_SHA256_PATH APP_VERSION REL_BASENAME BUILD_INFO_JSON_PATH

if [[ -n "$DIST_DIR_EXPLICIT" ]]; then
  DIST_DIR="$(cd "$(dirname "$DIST_DIR_EXPLICIT")" && pwd)/$(basename "$DIST_DIR_EXPLICIT")"
  mkdir -p "$DIST_DIR"
  export DIST_DIR
  echo "[signed-dmg] Using explicit --dist-dir: $DIST_DIR"
else
  DIST_ROOT="$SCRIPT_DIR/dist"
  BUILD_STAMP="$(date '+%Y%m%d.%H.%M.%S')"
  DIST_DIR="$DIST_ROOT/$BUILD_STAMP"
  suffix=1
  while [[ -e "$DIST_DIR" ]]; do
    DIST_DIR="$DIST_ROOT/${BUILD_STAMP}-$suffix"
    suffix=$((suffix + 1))
  done
  export DIST_DIR
fi

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_config.sh"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_dmg_paths.sh"

if [[ ! -f "$SCRIPT_DIR/_secrets.sh" ]]; then
  echo "ERROR: missing $SCRIPT_DIR/_secrets.sh" >&2
  echo "See packaging/acqstore_server/README-BUILD-DMG.md" >&2
  exit 2
fi

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_secrets.sh"

if [[ -z "${SIGN_ID:-}" ]]; then
  echo "ERROR: SIGN_ID is not set in _secrets.sh" >&2
  exit 2
fi
if [[ -z "${NOTARY_PROFILE:-}" ]]; then
  echo "ERROR: NOTARY_PROFILE is not set in _secrets.sh" >&2
  exit 2
fi

echo "[signed-dmg] App     : $APP_NAME"
echo "[signed-dmg] Version : $APP_VERSION"
echo "[signed-dmg] SIGN_ID : $SIGN_ID"
echo "[signed-dmg] Notary  : $NOTARY_PROFILE"
echo "[signed-dmg] Dist    : $DIST_DIR"
echo "[signed-dmg] DMG     : $DMG_PATH"

echo "[signed-dmg] Validating notary Keychain profile..."
if ! xcrun notarytool history --keychain-profile "$NOTARY_PROFILE" >/dev/null; then
  echo "ERROR: notary Keychain profile is unavailable: $NOTARY_PROFILE" >&2
  exit 1
fi

"$SCRIPT_DIR/build_app.sh"

if [[ "$NO_PAUSE" != "1" ]]; then
  echo ""
  echo "[signed-dmg] Smoke test before codesign/notarization:"
  echo "  open '$APP_PATH'"
  echo ""
  read -r -p "Press ENTER to continue after smoke testing, or Ctrl-C to abort. " _
fi

echo "[signed-dmg] === Sign + notarize + staple .app ==="
"$SCRIPT_DIR/codesign_and_zip.sh"
"$SCRIPT_DIR/notary_submit.sh"
"$SCRIPT_DIR/staple_and_verify.sh"

echo "[signed-dmg] === Build drag-drop .dmg ==="
"$SCRIPT_DIR/build_dmg.sh"

echo "[signed-dmg] === Notarize + staple .dmg ==="
"$SCRIPT_DIR/notary_submit_dmg.sh"
"$SCRIPT_DIR/staple_and_verify_dmg.sh"

echo ""
echo "[signed-dmg] Done."
echo "[signed-dmg] App : $APP_PATH"
echo "[signed-dmg] DMG : $DMG_PATH"
if [[ -f "$DMG_SHA256_PATH" ]]; then
  echo "[signed-dmg] SHA : $DMG_SHA256_PATH"
fi
echo "[signed-dmg] Open: open '$DMG_PATH'"
