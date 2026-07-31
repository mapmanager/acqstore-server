# Changelog

All notable changes to AcqStore Server will be documented in this file.

This project uses a simple changelog format inspired by Keep a Changelog. During development, add changes under `[Unreleased]`. When preparing a release, move those entries into a versioned section and leave a fresh empty `[Unreleased]` section at the top.

## [Unreleased]

### Desktop / NiceGUI

Added:

- Main-window header: app name · version · **Documentation** (opens the public documentation site).

Changed:

- Main-window footer shows the bind address (`host:port`) only; version moved into the header.

### Demo (`/demo/v2/`)

Added:

- Per-pane **Contrast** cards (one row per channel with Color LUT and Range…); shared Range popover with log-scaled histogram, min/max, and Auto (display-only).
- Reference **Show scan path** overlay (polyline + points from `scanPath`, with `lineRoi` fallback).
- Collapsible **Session** and **Open response** sections.
- Per-canvas image viewport: mouse-wheel / pinch zoom; **square** images use drag square-region zoom; **non-square** images use horizontal/vertical **axis-zoom** drag; **Shift+drag** pan; double-click reset (independent per channel for now).
- Horizontal drag splitter between source and reference panes (enabled when a reference image is present); canvases flex-fill the pane height.
- Independent **Composite** checkboxes for source and for reference (channel 0 green + channel 1 magenta from each channel’s range; LUT ignored while compositing).
- Per-pane **Axes** checkbox: tick labels in physical units from `plane.axes`.

Changed:

- Renamed **Pick and open** to **Open File**; removed the server-accessible path text box and **Open path** button from the demo UI.
- Successful **Open File** deletes the previous demo session before showing the new one; removed the **Delete session** button.
- Removed subtitle, server-readiness / allowed-formats status line, and long per-card axis meta strings (formats stay in docs / `GET /api/v2/capabilities`).
- Compact top chrome: **Loaded …** sits on the same row as **Open File**; channel labels are zero-based (`Channel 0`, …) without vendor `CH1`/`CH2` names.
- Composite / Show scan path / Axes toggles sit left of the pane heading (not right-justified).
- Canvas wrap `min-height` is `0` so the source/reference splitter can collapse either pane fully.
- Page order: source channels → reference channels → AcqStore header → open response → session (header / open / session are collapsed `<details>`).
- Contrast no longer uses a global channel dropdown; LUT/Range controls live inside each source and reference pane.
- Plane rendering uses precomputed 256-entry LUT tables for faster redraws.
- Initial view for non-square (kymograph) planes stretches to fill the viewport width and height (`scaleX` / `scaleY`); square planes keep aspect-preserving contain.

### Documentation

Added:

- GitHub Pages deploy job in `.github/workflows/docs.yml` (PR build-only; push to `main` / manual dispatch deploys).
- Maintainer reference copies of the linescan analyzer HTML under `docs-dev/reference-clients/`.

Changed:

- Public docs URL is `https://mapmanager.github.io/acqstore-server/` (`mkdocs.yml`, README, status UI).
- User docs refer to the **main window** (not “status window”); home page describes a desktop app (not a “small” app).
- Live Swagger / OpenAPI links live on the [Main window](docs/users/gui.md) page (removed from the docs home page).
- User and reference demo docs updated for the current demo UI; wording tightened for end users.
- Refreshed docs screenshots: `docs/assets/demo-app-html.png`, `docs/assets/acqstore-server-gui.png`.
