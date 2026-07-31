# Changelog

All notable changes to AcqStore Server will be documented in this file.

This project uses a simple changelog format inspired by Keep a Changelog. During development, add changes under `[Unreleased]`. When preparing a release, move those entries into a versioned section and leave a fresh empty `[Unreleased]` section at the top.

## [Unreleased]

### Desktop / NiceGUI

Added:

- Status-window header: **AcqStore Server** · version · **Documentation** (opens the public MkDocs site).

Changed:

- Status-window footer shows the bind address (`host:port`) only; version moved into the header.

### Demo (`/demo/v2/`)

Added:

- Shared **Contrast** controls for source and reference channels: full LUT set, Range popover with log-scaled histogram, min/max, and Auto (display-only).
- Reference **Show scan path** overlay (polyline + points from `scanPath`, with `lineRoi` fallback).
- Collapsible **Session** and **Open response** sections.
- Per-canvas image viewport: mouse-wheel / pinch zoom, horizontal/vertical **axis-zoom** drag, **Shift+drag** pan, double-click reset (independent per channel for now).
- Horizontal drag splitter between source and reference panes (enabled when a reference image is present); canvases flex-fill the pane height.
- Independent **Composite** checkboxes for source and for reference (ch0 green + ch1 magenta from each channel’s range; LUT ignored while compositing).

Changed:

- Renamed **Pick and open** to **Open File**; removed the server-accessible path text box and **Open path** button from the demo UI.
- Successful **Open File** deletes the previous demo session before showing the new one; **Delete session** remains for explicit cleanup.
- Status line shows API readiness and allowed formats only (no session TTL or `raw-f32-le` chrome).
- Page order: source channels → reference channels → AcqStore header → open response → session (header / open / session are collapsed `<details>`).
- Plane rendering uses precomputed 256-entry LUT tables for faster redraws.
- Initial view for non-square (kymograph) planes stretches to fill the viewport width and height (`scaleX` / `scaleY`); square planes keep aspect-preserving contain.

### Documentation

Added:

- GitHub Pages deploy job in `.github/workflows/docs.yml` (PR build-only; push to `main` / manual dispatch deploys).
- Maintainer reference copies of the linescan analyzer HTML under `docs-dev/reference-clients/`.

Changed:

- Public docs URL is `https://mapmanager.github.io/acqstore-server/` (`mkdocs.yml`, README, status UI).
- User and reference demo docs updated for the current demo UI (Open File, contrast, composite, navigation, split panes, collapsed JSON) and status-window header; wording tightened for end users (no implementation jargon in user pages).
- Refreshed docs screenshots: `docs/assets/demo-app-html.png`, `docs/assets/acqstore-server-gui.png`.
