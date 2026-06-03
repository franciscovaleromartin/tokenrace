# Changelog

All notable changes to tokenrace are documented here.

---

## [0.1.11] — 2026-06-03

### Added
- Dashboard now opens as a standalone app window (Chrome `--app` mode on macOS — no address bar, no tabs). Falls back to a new default browser window if Chrome is not available.
- A new terminal window opens automatically in the directory where `npx tokenrace` was run. macOS uses `Terminal.app` via AppleScript; Linux tries `gnome-terminal`, `konsole`, `xfce4-terminal` and `xterm` in order; Windows uses `cmd`.

---

## [0.1.10] — 2026-06-03

### Performance
- `getProjects()` timeseries scan reduced from O(projects × points) to O(points) via single pre-aggregation pass
- Removed O(n²) retroactive label propagation in `labelSession()` and `loadFromDisk()` — `resolveProject()` already reads from `sessionMappings` directly
- `getStatus()` session count no longer allocates an intermediate array
- SSE version throttled to one update per 5 s to prevent cascade re-fetches across all active charts and tables
- EventsFeed pause button now actually stops data updates (was dead state)
- Project sort in session label notifications fixed from broken O(n log n × m) to O(n log n)
- `sessionEvents` cleared immediately on session switch to prevent stale data flash

### Security
- Server now binds to `127.0.0.1` instead of all interfaces — dashboard is no longer reachable from the local network
- CORS header changed from wildcard (`*`) to the dashboard's own origin
- CSRF guard added to `POST /api/reset`, `POST /api/sessions/:id/label` and `POST /api/sessions/:id/ignore` — requests with a non-local `Origin` header are rejected with 403
- `state.timeseries` capped at 10 000 points per metric to prevent memory exhaustion via OTLP floods
- `?limit` query parameter capped at 500 on `/api/sessions` and `/api/events`
- `~/.tokenrace/data.json` permissions tightened to `0o600`; `~/.tokenrace/` directory to `0o700`
- Security headers added globally: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- `extractAttributes` in OTLP parser now rejects `__proto__`, `constructor` and `prototype` keys
- `project` field in label endpoint validated to max 200 characters

---

## [0.1.9] — 2026-06-03

### Fixed
- Cost displayed with 2 decimal places instead of 4
- `effort` field included in the cumulative key for `cost.usage` metrics
- Normalisation of new Claude Code metric names with cumulative-to-delta support (`claude_code.token.usage`, `claude_code.cost.usage`, `claude_code.lines_of_code.count`, `claude_code.commit.count`)

---

## [0.1.8] — 2026-06-03

### Fixed
- Active time now derived from `api_request` events (`duration_ms`) instead of a missing metric
- Events feed displays newest events first

---

## [0.1.7] — 2026-06-03

### Fixed
- Charts and events feed update in real time via `sseVersion` propagation
- Corrected `bin` path in `package.json`

---

## [0.1.6] — 2026-06-03

### Added
- Auto-configures OTLP environment variables in `~/.zshrc` or `~/.bashrc` on first run
- All data tables (sessions, projects, tools, agents) refresh in real time via SSE

---

## [0.1.5] — 2026-06-03

### Fixed
- Card background colour corrected to `#21262B`

---

## [0.1.4] — 2026-06-03

### Fixed
- Card colours corrected in Tailwind config

---

## [0.1.3] — 2026-06-03

### Changed
- Card background aligned with page base colour (`#14191F`)

---

## [0.1.0 – 0.1.2] — 2026-06-02

Initial release. Real-time token, cost and session monitor for Claude Code over OTLP.

Features: token/cost charts, sessions table, projects table, tools table, agents tree, events feed, cache efficiency view, session labelling, SSE live updates, data persistence to `~/.tokenrace/data.json`.
