# Changelog

All notable changes to tokenrace are documented here.

---

## [0.3.1] — 2026-06-12

### Changed
- **Sidebar lateral visible en todos los anchos de pantalla** — se elimina la barra inferior móvil; la navegación lateral de 52px se mantiene fija también en viewports estrechos

---

## [0.3.0] — 2026-06-11

### Changed
- **Rediseño visual completo estilo Dynatrace** — paleta azul-marino (`#0b1218`) con acento cian, paneles con borde fino azulado y mayor densidad de información
- **Sidebar de iconos** sustituye a las pestañas superiores: lateral en desktop, barra inferior en móvil; el header muestra el título de la sección activa
- **Overview como hub** — 6 KPIs clicables que navegan a su sección + grid 3×2 con gráficas compactas, ahorro de caché y paneles "Ver todo →" (sesiones recientes, top proyectos, eventos recientes)
- Gráficas recharts con tema compartido de la paleta nueva (`chartTheme.ts`)

### Added
- **Mini-fila de KPIs propios en cada pestaña** (Sessions, Projects, Tools, Models, Agents, Events) con totales y destacados

---

## [0.2.3] — 2026-06-10

### Fixed
- `index.html` is now served with `Cache-Control: no-cache` so the browser always picks up the latest dashboard after an update (hashed asset bundles remain cacheable)

---

## [0.2.2] — 2026-06-10

### Added
- **Models tab respects the time range** — with 24h/7d/30d selected, per-model stats are computed from timestamped timeseries (requests counted from the recent event buffer); "Todo" keeps the full accumulator. New "% of spend" column
- **Sortable tables** — clickable column headers with ↑↓ indicator in Sessions and Projects
- **Project filter in Sessions** — dropdown to show only one project's sessions
- **Dynamic tab title** — browser tab shows today's spend live: "$4.21 hoy · tokenrace"

---

## [0.2.1] — 2026-06-10

### Fixed
- Models tab showed nothing after a server restart: per-model stats were never persisted to disk. `state.models` is now saved in `data.json`, and for data files written by older versions the stats are rebuilt from the stored timeseries (`requests` is not recoverable and starts at 0)

---

## [0.2.0] — 2026-06-10

### Added
- **Models tab** — per-model comparison table (requests, tokens in/out, cost) with proportional cost bars, fed by the existing `/api/models` endpoint
- **Activity heatmap** — GitHub-style yearly grid in Overview showing daily token activity with a 5-level orange scale and hover tooltip (date, tokens, cost)
- **Trend deltas** — Tokens Input/Output/Total and Total Cost cards now show ▲/▼ percentage change vs the equivalent previous period (24h/7d/30d ranges)
- **Live rate meter** — header shows current pace (`⚡ tokens/min · $/h`) computed from the last 5 minutes, refreshed via SSE and a 30 s fallback interval

### Fixed
- Model price table updated: added Claude Fable 5 ($10/$50 per MTok) and corrected Opus 4.8 ($5/$25) and Haiku 4.5 ($1/$5)

### Removed
- `npx tokenrace` no longer opens a new terminal window automatically — it only starts the server and opens the dashboard

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
