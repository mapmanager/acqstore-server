# Migration report — AcqStore Server standalone extraction

Date: 2026-07-24

## Source repositories used

| Role | Path | Notes |
|------|------|-------|
| Read-only monolith source | `/Users/cudmore/Sites/cs_project/cloudscope` | Authoritative `acqstore_server` implementation |
| Read-only sibling dependency | `/Users/cudmore/Sites/cs_project/acqstore` | Not copied; path-mapped via uv |
| Convention reference only | `/Users/cudmore/Sites/cs_project/nicewidgets` | Packaging/CI style reference |
| New standalone repository | `/Users/cudmore/Sites/cs_project/acqstore-server` | Created by this extraction |

ZIP archives were not used as source.

## Monolith / sibling edit confirmation

- `cloudscope/`: **not edited** (`git status --porcelain` empty)
- `acqstore/`: **not edited** (`git status --porcelain` empty)
- `nicewidgets/`: **not edited** (`git status --porcelain` empty)
- Git was **not** initialized in `acqstore-server/`
- No GitHub repository was created or pushed

## Files migrated

- `cloudscope/src/acqstore_server/` → `acqstore-server/src/acqstore_server/`
- `cloudscope/tests/acqstore_server/` → `acqstore-server/tests/acqstore_server/`
- `cloudscope/docs-dev/acqstore_server/*` → flattened to `acqstore-server/docs-dev/*`
- `cloudscope/packaging/acqstore_server/` scripts/config/README/gitignore/example secrets → `acqstore-server/packaging/acqstore_server/`
- `cloudscope/packaging/assets/AcqStoreServer.{png,icns,ico}` → `acqstore-server/packaging/assets/`
- Workflow pattern from `cloudscope/.github/workflows/build-acqstore-server-macos.yml` → adapted standalone workflow

## Files excluded

- `src/acqstore/` (must remain external sibling)
- Monolith `pyproject.toml` / CloudScope package metadata
- `packaging/acqstore_server/_secrets.sh`
- `packaging/acqstore_server/.venv-build/`, `build/`, `dist/`
- Generated `AcqStore Server.spec`
- CloudScope app assets (`CloudScope.png/.icns/.ico`)
- Secrets, virtualenvs, caches, `.DS_Store`, archives

## Files adapted

- New focused `pyproject.toml` (`name = "acqstore-server"`, import package `acqstore_server`)
- `[tool.uv.sources] acqstore = { path = "../acqstore", editable = true }`
- Root `.gitignore` + packaging-local `.gitignore`
- `.github/workflows/tests.yml` (new; dual checkout + pinned AcqStore)
- `.github/workflows/build-acqstore-server-macos.yml` (sibling checkouts; manual-only)
- `packaging/acqstore_server/_config.sh` — removed unused `PYPI_PACKAGE=cloudscope`
- Packaging README — standalone wording; CI trigger matches `workflow_dispatch` only
- `packaging/assets/build_icons.sh` + README — AcqStore Server only
- Docs flattened path updates (`docs-dev/acqstore_server/` → `docs-dev/`)
- Active docs updated for sibling AcqStore / no CloudScope clone requirement
- `src/acqstore_server/app.py` docs path in port-busy message
- `tests/.../test_documentation_contract.py` docs root after flatten
- Pytest `addopts` includes `--import-mode=importlib` so `tests/acqstore_server` does not shadow the installable package
- Root `README.md`, `scripts/make_source_zip.sh`

## Direct runtime dependencies

Declared from actual imports / packaging requirements:

- `acqstore` (sibling source; not PyPI)
- `fastapi>=0.115.0`
- `nicegui>=3.14.0`
- `numpy>=1.26.0`
- `platformdirs>=4.0.0`
- `pydantic>=2.0`
- `pywebview>=6.2.1` (kept as a direct runtime dependency; native NiceGUI packaging verifies it — optional split deferred to avoid packaging complexity)
- `uvicorn>=0.30.0`

## Development / build dependencies

**dev**

- `pytest>=8.4.2`
- `pytest-cov>=7.0.0`
- `ruff>=0.15.11`
- `httpx>=0.27.0`

**build**

- `pyinstaller>=6.21.0`
- `pillow>=10.0.0` (icon regeneration)

Build backend: `uv_build>=0.9.2,<0.10.0` (same convention as standalone siblings).

## Pinned AcqStore commit

Verified from live local `acqstore/`:

```text
5133b6839a225d1ba85b7cd07a852d67e0c82475
5133b68 Initial standalone AcqStore repository
```

Pinned in both GitHub workflows as `ref: 5133b6839a225d1ba85b7cd07a852d67e0c82475`.

## Local sibling resolution

```text
uv run --no-sync python -c "import acqstore, acqstore_server; ..."
→ /Users/cudmore/Sites/cs_project/acqstore/src/acqstore/__init__.py
→ /Users/cudmore/Sites/cs_project/acqstore-server/src/acqstore_server/__init__.py
```

`acqstore` resolves from the sibling local repository via `[tool.uv.sources]`.

## License

**Chosen license: `GPL-3.0-only`** (confirmed by Robert, 2026-07-24).

Matches the migrated CloudScope source and the standalone AcqStore dependency. Applied using the same established pattern as the local standalone `acqstore/` and `nicewidgets/` repositories.

Files added / changed for the license decision:

- `LICENSE` — added (full GPL-3.0 text, byte-identical to the sibling `acqstore/` and `nicewidgets/` `LICENSE`)
- `pyproject.toml` — added `license = "GPL-3.0-only"`, `license-files = ["LICENSE"]`, and classifier `License :: OSI Approved :: GNU General Public License v3 (GPLv3)`
- `README.md` — added a `## License` section (`GPL-3.0-only. Copyright (c) Robert Cudmore.`) and updated the repository-status note (private, not yet published)
- `uv.lock` — re-locked after metadata change (dependency set unchanged; 145 packages)

No runtime behavior or dependencies were changed by the license step.

## Validation results (finalization run, 2026-07-24)

| Check | Result |
|-------|--------|
| `uv lock --check` | Pass |
| `uv sync --frozen --group dev` | Pass |
| Sibling resolution | Pass (`acqstore` → `../acqstore/src/acqstore/__init__.py`) |
| `ruff check .` | Pass (all checks passed) |
| `pytest -ra --cov=acqstore_server` | **110 passed** (coverage 78%) |
| `uv build` | Pass (`dist/acqstore_server-0.1.0-py3-none-any.whl` + sdist) |
| LICENSE in wheel | Pass (`acqstore_server-0.1.0.dist-info/licenses/LICENSE`) |
| LICENSE in sdist | Pass (`acqstore_server-0.1.0/LICENSE`) |
| Clean wheel install + imports | Pass (Python 3.12 temp venv; installed sibling `../acqstore` + wheel) |
| Static demo assets in wheel | Pass (`static/demo/index.html`, `static/demo/v2/index.html`) |
| Smoke via TestClient on installed wheel | Pass: `GET /api/v2/health` → `{ok, apiVersion: v2}`, `/openapi.json` (14 paths), `/demo/v2/` |
| Unsigned macOS `./packaging/acqstore_server/build_app.sh` | **Re-run: Pass** → `packaging/acqstore_server/dist/AcqStore Server.app` (v0.1.0) |
| Signing / notarization | **Not run** (deferred until GitHub secrets are configured) |

No runtime/test imports of `cloudscope` or `nicewidgets` (intentional local copy note remains in `gui_defaults.py`).

### Ruff / build-artifact note

`ruff check .` initially reported 220 errors sourced entirely from the transient
`packaging/acqstore_server/.venv-build/` created by the earlier unsigned macOS build.
Ruff only honors `.gitignore` inside a git repository, and this repository is intentionally
not git-initialized yet, so it scanned those gitignored build-venv scripts. This matches the
sibling repositories' behavior (they rely on gitignore and define no ruff excludes) and was
resolved by removing the transient packaging build outputs before linting. No ruff config
change was made, to stay consistent with `acqstore/` and `nicewidgets/`. The finalized
on-disk tree has these transient artifacts removed and `ruff check .` passes.

## Repository integrity confirmation

- `cloudscope/`, `acqstore/`, `nicewidgets/`: **not modified** (`git status --porcelain` empty for each)
- `acqstore-server/`: Git is **still not initialized** (no `.git/`); no commits, no GitHub repository, no push, no secrets configured — deferred per instructions

## Known deferrals / unresolved issues

1. Signing/notarization not validated locally (deferred until GitHub secrets are configured).
2. `pywebview` kept as a direct runtime dependency rather than an optional extra.
3. Historical ticket markdown still mentions past monolith-era constraints in places; active docs/README/packaging were updated for standalone use.
4. Generated packaging outputs (`.venv-build/`, `build/`, `dist/`, `.spec`) are gitignored and excluded from the review ZIP; the finalized tree has them removed after the build/validation run.
