# AcqStore Server — local signed DMG build

One path: **source → signed/notarized/stapled `.app` → signed/notarized/stapled drag-drop `.dmg`**.

No git tags. No GitHub Release upload. No `.pkg`. No focus on `.zip`
(`sign_notarize_release.sh` still exists for zip; do **not** use it for this goal).

## Prerequisites (once per Mac)

1. Developer ID **Application** certificate installed in Keychain  
   (`Developer ID Application: …`).
2. Sibling checkout next to this repo (editable dep in `pyproject.toml`):
   - `../acqstore`
3. Local secrets file (not committed):

```bash
cd /path/to/acqstore-server
cp packaging/acqstore_server/_secrets.example.sh packaging/acqstore_server/_secrets.sh
chmod 600 packaging/acqstore_server/_secrets.sh
```

Edit `packaging/acqstore_server/_secrets.sh` so it contains at least:

```bash
export SIGN_ID='Developer ID Application: Robert Cudmore (794C773KDS)'
export NOTARY_PROFILE='your-notarytool-profile-name'
```

(You can reuse the same Developer ID and notarytool profile as CloudScope —
only the `.app` / bundle id differ.)

`SIGN_ID` = codesign identity for the `.app` and the `.dmg`.  
`NOTARY_PROFILE` = Keychain profile name used as `--keychain-profile` by our scripts.

4. Create the notary Keychain profile **once** (name must match `NOTARY_PROFILE`):

```bash
xcrun notarytool store-credentials your-notarytool-profile-name \
  --apple-id "you@example.com" \
  --team-id "TEAMID"
```

Use an **app-specific password**. Success looks like: `Credentials validated` /
`Credentials saved to Keychain`.

5. Confirm the profile works:

```bash
xcrun notarytool history --keychain-profile your-notarytool-profile-name
```

Success = history prints (may be long). Failure = `No Keychain password item found for profile`.

## One-command build (recommended)

From the **acqstore-server** repo root:

```bash
./packaging/acqstore_server/build_signed_dmg.sh
```

Skip the post-`build_app` Enter prompt:

```bash
./packaging/acqstore_server/build_signed_dmg.sh --no-pause
```

You do **not** need `unset DIST_DIR` first. This orchestrator ignores any
`DIST_DIR` already in your shell and always allocates a new
`dist/YYYYMMDD.HH.MM.SS/` folder (unless you pass `--dist-dir PATH`).
`export DIST_DIR` inside the script only affects its child processes, not
your interactive shell.

### What that script runs

1. Select one unique output folder: `packaging/acqstore_server/dist/YYYYMMDD.HH.MM.SS/`
2. `build_app.sh` — `nicegui-pack` writes to `packaging/acqstore_server/dist/`, then the
   `.app` is moved into the timestamped folder (nicegui-pack has no `--distpath`)
3. Optional smoke-test pause (`open` the `.app`, then Enter)
4. `codesign_and_zip.sh` — sign `.app`, write pre-notarize zip
5. `notary_submit.sh` + `staple_and_verify.sh` — notarize/staple **`.app`**
6. `build_dmg.sh` — drag-drop DMG (`AcqStore Server.app` + `Applications` symlink), codesign DMG with `SIGN_ID`
7. `notary_submit_dmg.sh` + `staple_and_verify_dmg.sh` — notarize/staple **`.dmg`**

The `notary_submit*` scripts use `notarytool submit --wait`, so they block until
Apple returns a verdict and fail unless the final status is `Accepted`. There is
no separate poll step.

### Notarization knobs

| Variable | Default | Meaning |
|---|---|---|
| `NOTARY_TIMEOUT_SECONDS` | `3600` | How long to wait for Apple's verdict |
| `NOTARY_S3_ACCELERATION` | `0` | `1` re-enables S3 Transfer Acceleration |

S3 Transfer Acceleration is disabled because a failed upload through that path
has crashed `notarytool` (SIGBUS), which discards the real error. With it off,
upload failures are reported normally.

### If notarization fails

The full submit transcript is kept next to the artifacts as
`notary_submit.log` / `notary_submit_dmg.log`. On a non-`Accepted` verdict the
script prints Apple's notary log, which names the offending file.

If `notarytool` dies by signal during upload, the submission id exists but the
file never arrived; Apple will report `In Progress` on that id forever. Re-submit
instead of waiting.

### Expected output

Version comes from `pyproject.toml` (`version = "…"`):

```text
packaging/acqstore_server/dist/20260805.19.00.00/AcqStore Server.app
packaging/acqstore_server/dist/20260805.19.00.00/AcqStore-Server-v0.x.x-macos.dmg
packaging/acqstore_server/dist/20260805.19.00.00/AcqStore-Server-v0.x.x-macos.dmg.sha256
```

The script prints the exact output folder and DMG path when it finishes. Open
that exact path, for example:

```bash
open packaging/acqstore_server/dist/20260805.19.00.00/AcqStore-Server-v0.x.x-macos.dmg
```

## Do not use for this goal

| Script | Why skip |
|--------|----------|
| `sign_notarize_release.sh` | Legacy **zip** release path. Not the DMG pipeline. |
| `make_release_zip.sh` | Zip artifact only. |
| `notary_poll_until_done.sh` | Recovery / external submits; DMG path uses `--wait`. |

## Mid-pipeline recovery (optional)

If the orchestrator fails after the `.app` is already stapled, continue with
**individual** step scripts (these still honor `DIST_DIR` so they can target
the failed run’s stamp folder):

```bash
export DIST_DIR="$PWD/packaging/acqstore_server/dist/<timestamp printed by the failed run>"
./packaging/acqstore_server/build_dmg.sh
./packaging/acqstore_server/notary_submit_dmg.sh
./packaging/acqstore_server/staple_and_verify_dmg.sh
unset DIST_DIR
```

To force the **full** orchestrator into an existing folder (rebuild from
scratch into that path), use an explicit flag — do not rely on ambient env:

```bash
./packaging/acqstore_server/build_signed_dmg.sh --no-pause \
  --dist-dir "$PWD/packaging/acqstore_server/dist/<timestamp>"
```

## Related files

- `_config.sh` — app name, `RELEASE_SLUG`, paths, bundle id
- `_secrets.sh` — local `SIGN_ID` / `NOTARY_PROFILE` (gitignored)
- `_dmg_paths.sh` — versioned `AcqStore-Server-v{VERSION}-macos.dmg` path helper
- `README.md` — broader packaging notes (zip/CI); this file is the DMG recipe
