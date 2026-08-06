#!/usr/bin/env bash
# Staple the notarization ticket onto the .dmg and verify Gatekeeper assessment.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_config.sh"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_dmg_paths.sh"

if [[ ! -f "$DMG_PATH" ]]; then
  echo "ERROR: Signed dmg not found: $DMG_PATH" >&2
  exit 2
fi

echo "[staple-dmg] Stapling: $DMG_PATH"
xcrun stapler staple "$DMG_PATH"
xcrun stapler validate "$DMG_PATH"

echo "[staple-dmg] Assessing with spctl (open)..."
spctl --assess --type open --context context:primary-signature --verbose=4 "$DMG_PATH"

echo "[staple-dmg] Writing final SHA-256: $DMG_SHA256_PATH"
shasum -a 256 "$DMG_PATH" | awk -v f="$(basename "$DMG_PATH")" '{print $1 "  " f}' > "$DMG_SHA256_PATH"

echo "[staple-dmg] Done."
