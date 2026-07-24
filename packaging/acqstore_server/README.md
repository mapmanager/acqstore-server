# AcqStore Server macOS packaging

This folder builds, signs, and notarizes `AcqStore Server.app` (NiceGUI native
status UI + localhost API).

## Source of truth

App-specific knobs live in:

```bash
packaging/acqstore_server/_config.sh
```

| Variable | Role |
|----------|------|
| `APP_NAME` | Display / `.app` name (`AcqStore Server`) |
| `RELEASE_SLUG` | Zip basename without spaces (`AcqStore-Server`) |
| `BUNDLE_ID` | `com.mapmanager.acqstore-server` |
| `MAIN_PY` | `src/acqstore_server/desktop.py` |

AcqStore must be available as the sibling checkout `../acqstore` (see root
`[tool.uv.sources]`). Packaging syncs the locked environment from this
repository; it does not install AcqStore from PyPI.

## Local build only (unsigned)

```bash
./packaging/acqstore_server/build_app.sh
open "packaging/acqstore_server/dist/AcqStore Server.app"
```

Does **not** codesign or notarize.

## Signing / notarization setup

```bash
cp packaging/acqstore_server/_secrets.example.sh packaging/acqstore_server/_secrets.sh
chmod 600 packaging/acqstore_server/_secrets.sh
# edit SIGN_ID and NOTARY_PROFILE
```

## Manual release chain

```bash
./packaging/acqstore_server/build_app.sh
# smoke-test unsigned app, then:
./packaging/acqstore_server/codesign_and_zip.sh
./packaging/acqstore_server/notary_submit.sh
./packaging/acqstore_server/notary_poll_until_done.sh
./packaging/acqstore_server/staple_and_verify.sh
./packaging/acqstore_server/make_release_zip.sh
```

Or one command after a successful build:

```bash
./packaging/acqstore_server/sign_notarize_release.sh
```

Artifacts:

```text
packaging/acqstore_server/dist/
  AcqStore Server.app
  AcqStore-Server-pre-notarize.zip
  AcqStore-Server-v{version}-macos.zip
  AcqStore-Server-v{version}-macos.zip.sha256
  AcqStore-Server-v{version}-macos-manifest.json
```

Tooling: `codesign`, `xcrun notarytool`, `xcrun stapler`, `spctl`, `ditto`
(no `altool`).

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
