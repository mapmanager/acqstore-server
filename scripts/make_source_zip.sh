#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
    echo "Usage: scripts/make_source_zip.sh <output.zip>" >&2
    exit 2
fi

ZIP_NAME="$1"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ "$ZIP_NAME" = /* ]]; then
    ZIP_PATH="$ZIP_NAME"
else
    ZIP_PATH="$REPO_ROOT/$ZIP_NAME"
fi

OUTPUT_DIR="$(dirname "$ZIP_PATH")"
if [[ ! -d "$OUTPUT_DIR" ]]; then
    echo "Output directory does not exist: $OUTPUT_DIR" >&2
    exit 2
fi

rm -f "$ZIP_PATH"

zip -r "$ZIP_PATH" \
    src \
    tests \
    docs \
    mkdocs.yml \
    docs-dev \
    packaging \
    scripts \
    .github/workflows \
    pyproject.toml \
    uv.lock \
    README.md \
    LICENSE \
    .gitignore \
    .python-version \
    migration-report-acqstore-server.md \
    -x \
    "*/__pycache__/*" \
    "*.pyc" \
    "*.pyo" \
    "*/.pytest_cache/*" \
    "*/.mypy_cache/*" \
    "*/.ruff_cache/*" \
    "*/.coverage" \
    "*/htmlcov/*" \
    "*/.DS_Store" \
    "*/.ipynb_checkpoints/*" \
    "*/.idea/*" \
    "*/.vscode/*" \
    "site/*" \
    "build/*" \
    "dist/*" \
    ".venv/*" \
    ".venv-build/*" \
    ".git/*" \
    "tmp/*" \
    "*.egg-info/*" \
    "*.zip" \
    "*.spec" \
    "packaging/acqstore_server/_secrets.sh" \
    "packaging/acqstore_server/.venv-build/*" \
    "packaging/acqstore_server/build/*" \
    "packaging/acqstore_server/dist/*"

echo "Created: $ZIP_PATH"
