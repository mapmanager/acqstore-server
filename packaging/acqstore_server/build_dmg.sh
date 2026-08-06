#!/usr/bin/env bash
# Build a drag-and-drop DMG: "AcqStore Server.app" + Applications symlink.
#
# Run from repo root (after the .app is built; ideally signed/notarized/stapled):
#   ./packaging/acqstore_server/build_dmg.sh
#
# Output (RELEASE_SLUG avoids spaces in the filename):
#   packaging/acqstore_server/dist/AcqStore-Server-v{VERSION}-macos.dmg
#   packaging/acqstore_server/dist/AcqStore-Server-v{VERSION}-macos.dmg.sha256
#
# If packaging/acqstore_server/_secrets.sh defines SIGN_ID, the DMG is codesigned
# (Developer ID Application). Notarization/stapling of the DMG is separate.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_config.sh"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_dmg_paths.sh"

REQUIRE_GATEKEEPER="${REQUIRE_GATEKEEPER:-1}"

if [[ ! -d "$APP_PATH" ]]; then
  echo "ERROR: App not found: $APP_PATH" >&2
  echo "Run build_app.sh (and preferably codesign/notarize/staple) first." >&2
  exit 2
fi

REL_DMG="$DMG_PATH"
REL_SHA256="$DMG_SHA256_PATH"
DMG_STAGE="$DIST_DIR/dmg-stage"
DMG_RW="$DIST_DIR/${RELEASE_SLUG}-rw.dmg"
VOLUME_NAME="$APP_NAME"

echo "[dmg] App     : $APP_PATH"
echo "[dmg] Version : $APP_VERSION"
echo "[dmg] Output  : $REL_DMG"

if [[ "$REQUIRE_GATEKEEPER" == "1" ]]; then
  SPCTL_OUT="$(spctl --assess --type execute --verbose=4 "$APP_PATH" 2>&1 || true)"
  echo "$SPCTL_OUT"
  if ! echo "$SPCTL_OUT" | grep -qi accepted; then
    echo "ERROR: spctl did not accept the app. Staple first, or re-run with REQUIRE_GATEKEEPER=0." >&2
    exit 3
  fi
else
  echo "[dmg] Skipping Gatekeeper check (REQUIRE_GATEKEEPER=0)."
fi

echo "[dmg] Staging drag-and-drop contents..."
rm -rf "$DMG_STAGE"
mkdir -p "$DMG_STAGE"
ditto "$APP_PATH" "$DMG_STAGE/$(basename "$APP_PATH")"
ln -s /Applications "$DMG_STAGE/Applications"

rm -f "$DMG_RW" "$REL_DMG"

echo "[dmg] Creating read-write DMG..."
hdiutil create \
  -srcfolder "$DMG_STAGE" \
  -volname "$VOLUME_NAME" \
  -fs HFS+ \
  -fsargs "-c c=64,a=16,e=16" \
  -format UDRW \
  -ov \
  "$DMG_RW"

echo "[dmg] Mounting for Finder layout..."
MOUNT_OUTPUT="$(hdiutil attach -readwrite -noverify -noautoopen "$DMG_RW")"
echo "$MOUNT_OUTPUT"
DEVICE="$(echo "$MOUNT_OUTPUT" | awk '/^\/dev\// { print $1; exit }')"
MOUNT_DIR="$(echo "$MOUNT_OUTPUT" | awk -F'\t' '/\/Volumes\// { print $NF; exit }')"
if [[ -z "$DEVICE" || -z "$MOUNT_DIR" || ! -d "$MOUNT_DIR" ]]; then
  echo "ERROR: failed to mount RW DMG." >&2
  exit 1
fi

cleanup_mount() {
  if [[ -n "${DEVICE:-}" ]]; then
    hdiutil detach "$DEVICE" -force >/dev/null 2>&1 || true
  fi
}
trap cleanup_mount EXIT

# Classic window: app on the left, Applications on the right.
osascript <<EOF || echo "[dmg] WARNING: could not set Finder icon layout (DMG contents are still valid)."
tell application "Finder"
  tell disk "$VOLUME_NAME"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set the bounds of container window to {200, 120, 760, 480}
    set viewOptions to the icon view options of container window
    set arrangement of viewOptions to not arranged
    set icon size of viewOptions to 128
    set position of item "$(basename "$APP_PATH")" of container window to {140, 180}
    set position of item "Applications" of container window to {420, 180}
    update without registering applications
    delay 1
    close
  end tell
end tell
EOF

sync
hdiutil detach "$DEVICE"
trap - EXIT
DEVICE=""

echo "[dmg] Converting to compressed UDZO: $REL_DMG"
hdiutil convert "$DMG_RW" -format UDZO -imagekey zlib-level=9 -o "$REL_DMG"
rm -f "$DMG_RW"
rm -rf "$DMG_STAGE"

if [[ -f "$SCRIPT_DIR/_secrets.sh" ]]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/_secrets.sh"
fi
if [[ -n "${SIGN_ID:-}" ]]; then
  echo "[dmg] Codesigning with: $SIGN_ID"
  codesign --force --sign "$SIGN_ID" --timestamp "$REL_DMG"
  codesign --verify --verbose=2 "$REL_DMG"
else
  echo "[dmg] SIGN_ID not set; leaving DMG unsigned."
fi

echo "[dmg] Writing SHA-256: $REL_SHA256"
shasum -a 256 "$REL_DMG" | awk -v f="$(basename "$REL_DMG")" '{print $1 "  " f}' > "$REL_SHA256"

ls -lh "$REL_DMG"
echo "[dmg] Done."
echo "[dmg] Open with: open '$REL_DMG'"
echo "[dmg] Tip: notarize/staple the DMG for distribution (notarytool submit → stapler staple)."
