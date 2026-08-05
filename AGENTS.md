# AcqStore Server — Agent Instructions

## Repository role

`acqstore-server` is an independent Git repository containing a local HTTP API
(FastAPI) and an optional NiceGUI desktop status window around AcqStore.

- Distribution name: `acqstore-server`
- Python import package: `acqstore_server` (underscore)
- Source: `src/acqstore_server/`
- Tests: `tests/`
- Packaging: `packaging/`
- User documentation: `docs/`
- Development notes: `docs-dev/`

This repo owns server/API and transport behavior, plus an optional desktop
status UI. Acquisition models, loaders, and analysis belong to `acqstore`.

> Coexistence note: This file is the primary instruction file when this repo is
> the working root (e.g. a Codex project with `acqstore-server/` primary). When
> this repo is opened as part of the outer `cs_project/` workspace (e.g. in
> Cursor), the outer `cs_project/AGENTS.md` plus `cs_project/.cursor/rules/`
> provide workspace-wide guidance and take precedence for cross-repo scope; this
> file stays repo-local and must not contradict it. This repo also has its own
> scoped rule at `.cursor/rules/linescan-graft-script-check.mdc`.

## Attached sibling repositories

| Repository | Local path | Relationship |
|---|---|---|
| AcqStore | `../acqstore/` | `acqstore-server` depends on it (editable path dep) |
| CloudScope App | `../cloudscope-app/` | Embeds `acqstore-server` core (depends on it) |

`pyproject.toml` maps `acqstore` as an editable uv path dependency.
`acqstore-server` may depend on `acqstore` **only**. It MUST NOT import from
`nicewidgets` or `cloudscope-app`. Inspect `acqstore` public APIs before using
them; do not invent APIs, paths, events, or return types.

## Package boundaries

Put code in `acqstore-server` when it implements:

- FastAPI endpoints, request/response models, and HTTP transport;
- server runtime, ports, logging, and process/desktop launch;
- the optional NiceGUI status window (behind the `[desktop]` extra).

Do not place these in `acqstore-server`:

- acquisition models, loaders, ROI/metadata/analysis, or persistence (use
  `acqstore`);
- reusable widgets meant to work without this server (belong in `nicewidgets`);
- CloudScope application orchestration or views.

Note: embedders such as CloudScope depend on **core** only; keep NiceGUI/desktop
behavior behind the `[desktop]` extra and out of the core import path.

## Default task scope

Work only in `acqstore-server` unless the task explicitly includes another
repository.

- Start with files named by the user and their direct dependencies.
- Do not make unrelated cleanup or consistency edits.
- Do not add abstractions for hypothetical future requirements.
- Do not add or change production dependencies without asking first.
- Ask a focused question, with a recommended answer, when a material decision
  remains ambiguous after inspecting the relevant code.

## Environment and commands

Run commands from the `acqstore-server/` repository root. Use `uv run`.

```bash
uv sync
uv run pytest path/to/test_file.py   # focused first
uv run pytest                        # full suite
uv run ruff check src tests
```

Tests use `--import-mode=importlib`; keep `tests/` from shadowing the installed
`acqstore_server` package.

## Verification

Verification must match the change.

- API/source changes: run focused tests (FastAPI `TestClient` / `httpx` where
  relevant), then the full suite when practical.
- Formatting or lint-sensitive changes: run the relevant Ruff check.
- Desktop/status-UI or packaging changes: run the relevant checks or clearly
  state what could not be exercised locally.

Do not claim an API, desktop, or packaging problem is fixed solely because unit
tests pass. If live verification is blocked, describe the candidate change as
unverified and state exactly what remains to be tested. Do not weaken a
meaningful test merely to make it pass.

## Coding conventions

- Keep changes small, direct, and maintainable.
- Prefer KISS and DRY without speculative shared modules.
- Use type annotations and Google-style docstrings (`Args`, `Returns`,
  `Raises`) for public APIs.
- Fail clearly on invalid input rather than silently guessing.
- New `__init__.py` files are empty by default. Do not change an existing
  curated public API without an explicit request.
- Preserve existing architecture and naming unless the task is a deliberate
  refactor.

## Documentation and ticket reports

Do not update the repository-root `README.md` unless the task explicitly
requests a README change.

Do not create a `docs-dev/cursor_tickets/` report by default. Create one only
when the user explicitly identifies the work as a tracked implementation ticket
or requests a report. Use the next unused three-digit prefix. The
`cursor_tickets/` name is a project convention regardless of which agent writes
the report. Record: requested scope; repositories and files changed; important
decisions; verification performed; unresolved or unverified behavior.

Note: legacy notes under `docs-dev/tickets/` and `docs-dev/reference-clients/`
are historical; do not treat them as current architecture.

## Search exclusions

Unless the task explicitly requires them, do not inspect or search:

- `.venv/`, `venv/`, `__pycache__/`, and tool caches;
- `build/`, `dist/`, `site/`, and generated packaging output;
- `*.zip`, `*.tar`, `*.tar.gz`, `*.whl`, `*.app`, `*.dmg`;
- `.git/`;
- `docs-dev/reference-clients/` and `docs-dev/tickets/` unless explicitly needed.

Do not treat old monorepo paths or archived development notes as current
architecture when they conflict with the present repository.

## Git discipline

This directory is an independent Git repository.

- Check `git status` before and after material work.
- Preserve unrelated user changes.
- Do not commit, push, create branches, or open pull requests unless explicitly
  requested.
- For cross-repository work, report and verify changes separately in each
  affected repository.
