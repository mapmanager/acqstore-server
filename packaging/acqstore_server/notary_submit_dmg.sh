#!/usr/bin/env bash
# Submit the signed .dmg to Apple notary service and wait for the result.
#
# notarytool prints a submission id before the upload completes. If the upload
# then fails, that id is never processed and querying it reports "In Progress"
# forever. Success therefore requires a final "Accepted" status, not just an id.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_config.sh"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_dmg_paths.sh"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_secrets.sh"

if [[ ! -f "$DMG_PATH" ]]; then
  echo "ERROR: Signed dmg not found: $DMG_PATH" >&2
  echo "Run build_dmg.sh first." >&2
  exit 2
fi

SUBMIT_LOG="$DIST_DIR/notary_submit_dmg.log"

NOTARY_ARGS=(
  --keychain-profile "$NOTARY_PROFILE"
  --wait
  --timeout "${NOTARY_TIMEOUT_SECONDS:-3600}"
)
# S3 Transfer Acceleration has crashed notarytool (SIGBUS) when an upload fails,
# which destroys the real error message. Set NOTARY_S3_ACCELERATION=1 to re-enable.
if [[ "${NOTARY_S3_ACCELERATION:-0}" != "1" ]]; then
  NOTARY_ARGS+=(--no-s3-acceleration)
fi

echo "[notary-dmg] Submitting: $DMG_PATH"
echo "[notary-dmg] Profile   : $NOTARY_PROFILE"
rm -f "$NOTARY_DMG_SUBMISSION_ID_FILE"
mkdir -p "$(dirname "$NOTARY_DMG_SUBMISSION_ID_FILE")"

set +e
xcrun notarytool submit "$DMG_PATH" "${NOTARY_ARGS[@]}" 2>&1 | tee "$SUBMIT_LOG"
SUBMIT_RC="${PIPESTATUS[0]}"
set -e

SUB_ID="$(sed -nE 's/^[[:space:]]*id:[[:space:]]*([0-9A-Fa-f-]+).*/\1/p' "$SUBMIT_LOG" | head -1)"
if [[ "$SUB_ID" =~ ^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$ ]]; then
  echo "$SUB_ID" > "$NOTARY_DMG_SUBMISSION_ID_FILE"
  echo "[notary-dmg] Submission id: $SUB_ID"
else
  SUB_ID=""
fi

if (( SUBMIT_RC >= 128 )); then
  echo "ERROR: notarytool was killed by signal $(( SUBMIT_RC - 128 )) during submission." >&2
  echo "The upload did not finish, so submission ${SUB_ID:-<none>} will never leave 'In Progress'." >&2
  echo "Verify this machine can sustain a large HTTPS upload (VPN/network filters are a common cause)." >&2
  exit 1
fi

STATUS="$(sed -nE 's/^[[:space:]]*status:[[:space:]]*(.*)/\1/p' "$SUBMIT_LOG" | tail -1 | tr -d '\r')"

if [[ "$STATUS" == "Accepted" ]]; then
  if (( SUBMIT_RC != 0 )); then
    echo "[notary-dmg] WARNING: notarytool exit code was ${SUBMIT_RC}, but status is Accepted; continuing."
  fi
  echo "[notary-dmg] Accepted: $SUB_ID"
  exit 0
fi

echo "ERROR: dmg notarization did not succeed (exit ${SUBMIT_RC}, status '${STATUS:-<none>}')." >&2
echo "Full submit output: $SUBMIT_LOG" >&2
if [[ -n "$SUB_ID" ]]; then
  echo "[notary-dmg] Fetching notary log..." >&2
  xcrun notarytool log "$SUB_ID" --keychain-profile "$NOTARY_PROFILE" >&2 || true
fi
exit 1
