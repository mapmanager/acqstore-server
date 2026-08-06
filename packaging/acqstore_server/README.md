# AcqStore Server macOS packaging

This folder builds, signs, and notarizes `AcqStore Server.app` (NiceGUI native
status UI + localhost API).

## Primary distribute path (DMG)

For a signed, notarized, stapled drag-drop DMG, use:

```bash
./packaging/acqstore_server/build_signed_dmg.sh
# or
./packaging/acqstore_server/build_signed_dmg.sh --no-pause
```

Full recipe (prerequisites, notary knobs, recovery):
[README-BUILD-DMG.md](README-BUILD-DMG.md).

Expected artifacts:

```text
packaging/acqstore_server/dist/<stamp>/AcqStore Server.app
packaging/acqstore_server/dist/<stamp>/AcqStore-Server-v{version}-macos.dmg
packaging/acqstore_server/dist/<stamp>/AcqStore-Server-v{version}-macos.dmg.sha256
```

## Source of truth

App-specific knobs live in:

```bash
packaging/acqstore_server/_config.sh
```

| Variable | Role |
|----------|------|
| `APP_NAME` | Display / `.app` name (`AcqStore Server`) |
| `RELEASE_SLUG` | Zip/DMG basename without spaces (`AcqStore-Server`) |
| `BUNDLE_ID` | `com.mapmanager.acqstore-server` |
| `MAIN_PY` | `src/acqstore_server/desktop.py` |

AcqStore must be available as the sibling checkout `../acqstore` (see root
`[tool.uv.sources]`). Packaging syncs the locked environment from this
repository; it does not install AcqStore from PyPI.

`build_app.sh` runs `build_info.sh` before packing. That stamps a transient
`src/acqstore_server/_build_info.py` (gitignored, deleted after the pack) so
the frozen app reports a real `server_version` instead of `0.0.0+unknown`. The
NiceGUI header still shows **only** `v{version}`; `/api/v2/health` also
exposes `acqstore_version`, `build_timestamp_eastern` (US Eastern / Baltimore),
and `git_commit` (snake_case; other v2 JSON remains camelCase).

## Local build only (unsigned)

```bash
./packaging/acqstore_server/build_app.sh
open "packaging/acqstore_server/dist/AcqStore Server.app"
```

Does **not** codesign or notarize. Default output is
`packaging/acqstore_server/dist/AcqStore Server.app`. If your shell still has
`DIST_DIR` exported from a mid-pipeline recovery, either `unset DIST_DIR` or
prefer the full DMG orchestrator (`build_signed_dmg.sh`), which ignores ambient
`DIST_DIR` and always stamps a new folder.

## Signing / notarization setup

```bash
cp packaging/acqstore_server/_secrets.example.sh packaging/acqstore_server/_secrets.sh
chmod 600 packaging/acqstore_server/_secrets.sh
# edit SIGN_ID and NOTARY_PROFILE
```

## Legacy zip release chain

Prefer the DMG path above for user distribution. Zip remains available for CI
and older workflows.

```bash
./packaging/acqstore_server/build_app.sh
# smoke-test unsigned app, then:
./packaging/acqstore_server/sign_notarize_release.sh
```

`notary_submit.sh` uses `notarytool submit --wait` (no separate poll in the
happy path). `notary_poll_until_done.sh` remains for recovery / external ids.

Zip artifacts:

```text
packaging/acqstore_server/dist/
  AcqStore Server.app
  AcqStore-Server-pre-notarize.zip
  AcqStore-Server-v{version}-macos.zip
  AcqStore-Server-v{version}-macos.zip.sha256
  AcqStore-Server-v{version}-macos-manifest.json
```

Tooling: `codesign`, `xcrun notarytool`, `xcrun stapler`, `spctl`, `ditto`,
`hdiutil` (no `altool`).

## CI

GitHub Actions: [`.github/workflows/build-acqstore-server-macos.yml`](../../.github/workflows/build-acqstore-server-macos.yml)

- Trigger: `workflow_dispatch` only (manual)
- Checks out pinned `mapmanager/acqstore` as a sibling of `acqstore-server/`
- Scripts: `./packaging/acqstore_server/*.sh` only
- Writes `_secrets.sh` in CI with keychain profile name:
  `acqstore-server-ci-notary-profile`
- Uploads `AcqStore-Server-*-macos.{zip,zip.sha256,manifest.json}`

Icon: `packaging/assets/AcqStoreServer.icns` (teal **AS** monogram).

## Files not tracked

```text
_secrets.sh
.venv-build/
build/
dist/
*.spec
```
