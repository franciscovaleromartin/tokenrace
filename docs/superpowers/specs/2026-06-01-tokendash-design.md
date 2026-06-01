# tokendash — Design Spec
**Fecha:** 2026-06-01  
**Estado:** Aprobado

---

## 1. Visión general

Monitor en tiempo real para Claude Code. Un comando lo arranca todo: receptor OTLP + web app servidos desde el mismo proceso Node.js en un único puerto.

```
Claude Code → OTLP HTTP/JSON → localhost:1337/v1/*
                                       ↓
                           store en memoria + ~/.tokendash/data.json
                                       ↓
                      API REST + SSE en localhost:1337/api/*
                                       ↓
                      Web app servida en localhost:1337/
```

El usuario ejecuta `npx tokendash` y abre el browser.

---

## 2. Decisiones de diseño confirmadas

| Decisión | Elección | Razón |
|----------|----------|-------|
| Puerto | `:1337` único para OTLP + API + web | Simplicidad, un solo `app.listen()` |
| React | 19 | Coherente con el stack global del proyecto |
| Retención de datos | Sin límite temporal | El usuario decide cuándo borrar |
| Reset de datos | Botón "↺ Reset" en el header | UX: visible y accesible en todo momento |
| Etiquetado de sesiones | Retroactivo desde la web | Nunca hay que acordarse de exportar vars |
| Módulos Node.js | ESM (`"type": "module"`) | Estándar moderno |
| Build para npx | `web/dist/` incluida en el paquete npm | El usuario no necesita buildear |

---

## 3. Arquitectura

### 3.1 Proceso único

Un solo proceso Node.js con Express escuchando en `:1337`:

- **Rutas OTLP** — `POST /v1/metrics`, `/v1/logs`, `/v1/traces`: reciben telemetría de Claude Code, parsean el JSON OTLP y alimentan el store.
- **Rutas API REST** — `GET /api/*`: exponen datos del store al frontend.
- **SSE** — `GET /api/stream`: push de eventos en tiempo real al browser.
- **Estáticos** — `GET /*`: sirve `web/dist/` (React 19 + Vite, compilado en prepublish).

### 3.2 Variables de entorno para Claude Code

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:1337
export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative
```

Etiquetado de sesión (opcional — puede hacerse desde la web):
```bash
export OTEL_RESOURCE_ATTRIBUTES="project=mi-proyecto,feature=mi-feature"
```

---

## 4. Estructura de archivos

```
tokendash/
├── package.json
├── bin/
│   └── cli.js                    ← entry point npx
├── src/
│   ├── server.js                 ← Express completo (un puerto)
│   ├── store.js                  ← store en memoria + persistencia
│   ├── otlp-parser.js            ← parseo OTLP JSON
│   └── api-routes.js             ← rutas REST separadas
└── web/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── types.ts
        ├── api.ts
        ├── hooks/
        │   ├── useSSE.ts
        │   ├── useMetrics.ts
        │   └── useTimeRange.ts
        └── components/
            ├── layout/
            │   ├── Header.tsx
            │   └── TabBar.tsx
            ├── setup/
            │   └── SetupGuide.tsx
            ├── notifications/
            │   └── SessionLabelNotification.tsx  ← nuevo
            ├── stats/
            │   ├── StatCard.tsx
            │   └── StatsRow.tsx
            ├── charts/
            │   ├── TokensChart.tsx
            │   ├── CostChart.tsx
            │   ├── CacheChart.tsx
            │   └── EfficiencyChart.tsx
            ├── tables/
            │   ├── SessionsTable.tsx
            │   ├── ProjectsTable.tsx
            │   └── ToolsTable.tsx
            ├── events/
            │   └── EventsFeed.tsx
            ├── agents/
            │   └── AgentsTree.tsx
            └── ui/
                ├── Badge.tsx
                ├── Tooltip.tsx
                └── LiveIndicator.tsx
```

---

## 5. Etiquetado retroactivo de sesiones

### 5.1 Motivación

El usuario no tiene que acordarse de exportar `OTEL_RESOURCE_ATTRIBUTES` antes de arrancar Claude Code. Puede etiquetar la sesión en caliente desde el panel.

### 5.2 Flujo

1. Llega una sesión sin atributo `project` en el resource.
2. El proxy emite por SSE: `{ type: "unlabeled_session", sessionId, model, timestamp }`.
3. La web muestra una notificación bajo los tabs:

```
● Nueva sesión sin proyecto
  session: a3f9b2c1...  ·  modelo: claude-opus-4  ·  hace 2s
  [graphmycode] [daysa] [aluz] [tokendash] [+ Nuevo] [Ignorar]
```

4. El usuario hace click en un proyecto conocido o escribe uno nuevo.
5. La web llama a `POST /api/sessions/:id/label` con `{ project: "nombre" }`.
6. El proxy guarda el mapping en `store.sessionMappings` (sessionId → project).
7. El proxy aplica el mapping retroactivamente a todos los datos ya almacenados de esa sesión (timeseries, events, aggregates).
8. La notificación pasa a estado "resuelto" (verde, se desvanece en 3s).

### 5.3 Proyectos conocidos en la notificación

Los botones de proyectos se construyen a partir de `GET /api/projects` (devuelve todos los proyectos vistos, tanto de resource attributes como de mappings manuales). El frontend llama a este endpoint al montar `SessionLabelNotification`. Si no hay proyectos conocidos aún, solo aparece `[+ Nuevo]`.

Ordenados por frecuencia de uso (el más usado primero).

### 5.4 "Ignorar"

La sesión se marca como `ignored: true` en el store. No vuelve a generar notificaciones. Los datos se acumulan sin proyecto asignado.

### 5.5 Re-etiquetar

Desde la tabla Sessions: click en el badge de proyecto de cualquier fila → edición inline. Llama al mismo endpoint `POST /api/sessions/:id/label`.

### 5.6 API

```
POST /api/sessions/:sessionId/label
  Body: { project: string }
  Respuesta: { ok: true }

GET /api/sessions/unlabeled
  Respuesta: [ { sessionId, model, timestamp, tokensInput } ]
```

### 5.7 Persistencia

`sessionMappings` se persiste en `~/.tokendash/data.json` junto con el resto del estado. Al cargar el JSON al arrancar, se re-aplican todos los mappings a los datos históricos.

---

## 6. Store

### 6.1 Estructura en memoria

```js
const state = {
  timeseries: new Map(),     // metricName → [ { ts, value, labels } ]
  sessions:   new Map(),     // sessionId  → SessionData
  sessionMappings: new Map(),// sessionId  → projectName
  ignoredSessions: new Set(),// sessionIds ignorados
  events:     [],            // buffer circular, max 1000
  eventIndex: 0,
  projects:   new Map(),     // projectName → ProjectAggregates
  tools:      new Map(),     // toolName    → ToolStats
  agents:     new Map(),     // agentId     → AgentData
  models:     new Map(),     // modelName   → ModelStats
  lastSeen:   null,
  startTime:  Date.now(),
  totalEvents: 0
}
```

### 6.2 Retención

Sin límite temporal. El usuario resetea los datos desde el botón "↺ Reset" del header.

`POST /api/reset` — vacía el state en memoria y sobreescribe `~/.tokendash/data.json` con estado vacío.

### 6.3 Persistencia

- Guardar cada 60s: `fs.writeFileSync(~/.tokendash/data.json, JSON.stringify(state))`
- Guardar en SIGINT/SIGTERM.
- Cargar al arrancar: si el archivo está corrupto, ignorarlo y arrancar limpio.
- Nunca lanzar excepción desde el store: si falla la escritura a disco, loguearlo y continuar.

---

## 7. OTLP Parser

### 7.1 `parseMetrics(body)`

Iterar `body.resourceMetrics[]`:
- Extraer resource attributes: `service.name`, `session.id`, `user.email`, `user.account_uuid`, `app.version`, `project`, `feature`.
- Por cada `scopeMetrics[].metrics[]`:
  - Nombre (`metric.name`), tipo (`sum` / `gauge` / `histogram`).
  - Por cada `dataPoint`: valor (`asInt` o `asDouble`, pueden venir como string), timestamp (`timeUnixNano` → ms), attributes del dataPoint (`model`, etc.).

Retornar array de `{ name, value, timestamp, labels: { ...resource, ...dataPoint } }`.

### 7.2 `parseEvents(body)`

Iterar `body.resourceLogs[]`:
- Extraer resource attributes igual que métricas.
- Por cada `scopeLogs[].logRecords[]`:
  - `eventName`: de `attributes["event.name"]` o `body.stringValue`.
  - `timestamp`: `timeUnixNano` → ms.
  - `severity`: `severityText`.
  - Todos los attributes como objeto plano.

Helper `extractAttributes(attrs)`: `attrs` es `[{ key, value: { stringValue | intValue | doubleValue | boolValue } }]` → objeto plano `{ key: value }`.

### 7.3 `parseTraces(body)`

Iterar `body.resourceSpans[].scopeSpans[].spans[]`:
- `spanId`, `traceId`, `parentSpanId`, `name`, `startTimeUnixNano`, `endTimeUnixNano`.
- Attributes planos, status.

### 7.4 Robustez

Todo el parsing envuelto en `try/catch`. Si hay error: loguearlo, no propagar. Los endpoints OTLP responden siempre 200 `{ "partialSuccess": {} }` para que Claude Code no reintente indefinidamente.

---

## 8. API REST

Todos los endpoints:
- `Access-Control-Allow-Origin: *`
- `Content-Type: application/json`
- Si no hay datos: devolver estructura vacía válida, nunca error.

### Endpoints

```
GET  /api/status
     → { connected, lastSeen, sessionCount, totalEvents, uptime }

GET  /api/summary?from=now-7d
     → { tokens, cost, activeTimeMs, sessions, commits, pullRequests,
         linesAdded, linesRemoved, efficiency }

GET  /api/timeseries?metric=tokens_input&from=now-7d&bucket=1h
     → [ { timestamp, value } ]
     Métricas: tokens_input, tokens_output, tokens_cache_read,
               tokens_cache_creation, cost, active_time, sessions

GET  /api/projects?from=now-7d
     → [ { project, cost, tokensInput, tokensOutput,
           cacheHitRate, sessions, commits, linesAdded, linesRemoved } ]

GET  /api/sessions?limit=50&project=x
     → [ { sessionId, project, feature, model, startTime, lastSeen,
           durationActiveMs, tokensInput, tokensOutput, tokensCache,
           cost, apiRequests, toolCalls } ]

GET  /api/sessions/unlabeled
     → [ { sessionId, model, timestamp, tokensInput } ]
     ⚠️  Registrar esta ruta ANTES de /:sessionId en Express para evitar conflicto.

GET  /api/sessions/:sessionId/events
     → [ últimos eventos de esa sesión ]

GET  /api/events?limit=200&type=api_request&project=x
     → [ { timestamp, eventName, sessionId, project, model, attributes } ]

GET  /api/tools?from=now-7d
     → { usage: [ { toolName, count, successRate, avgDurationMs } ],
         decisionRate: { approved, rejected } }

GET  /api/agents?sessionId=x
     → [ { agentId, parentAgentId, tokensInput, tokensOutput,
           cost, toolCalls, durationMs } ]

GET  /api/models?from=now-7d
     → [ { model, requests, tokensInput, tokensOutput, cost,
           avgLatencyMs, avgTtftMs } ]

POST /api/sessions/:sessionId/label
     Body: { project: string }
     → { ok: true }

POST /api/reset
     → { ok: true }

GET  /api/stream   → SSE
     Heartbeat cada 15s: data: {"type":"ping"}
     Eventos: data: {"type":"metrics"|"event"|"trace"|"unlabeled_session","payload":{...}}

GET  /*  → sirve web/dist/
```

---

## 9. Frontend

### 9.1 Stack

- React 19 + Vite + TypeScript
- Tailwind CSS (dark theme)
- Recharts para gráficos
- Lucide React para iconos

### 9.2 Paleta de colores (CSS variables)

```css
--bg-base: #000000;
--bg-card: #0d0d0d;
--bg-card-hover: #141414;
--bg-border: #1a1a1a;
--bg-subtle: #111111;

--text-primary: #ffffff;
--text-secondary: #888888;
--text-muted: #444444;

--accent-green:  #00ff88;   /* tokens output, éxito */
--accent-blue:   #4da6ff;   /* tokens input */
--accent-purple: #a855f7;   /* coste */
--accent-orange: #ff6b35;   /* alertas, errores */
--accent-teal:   #00d4aa;   /* caché, ahorro */
--accent-yellow: #fbbf24;   /* warnings */
```

### 9.3 Layout

```
┌─────────────────────────────────┐
│ HEADER (h-10, sticky)           │
│ </> tokendash  [●LIVE]  [7d ▾] [↺ Reset]│
├─────────────────────────────────┤
│ NOTIFICACIONES (si las hay)     │  ← zona de unlabeled sessions
├─────────────────────────────────┤
│ [Overview][Sessions][Projects]  │  tabs con scroll horizontal
│ [Tools][Agents][Events][Costs]  │
├─────────────────────────────────┤
│  CONTENIDO DEL TAB ACTIVO       │  scroll vertical
└─────────────────────────────────┘
```

Sin sidebar. Diseñado para split-screen (funciona desde 400px de ancho).  
En >1024px: layout de 2 columnas dentro de cada tab donde tenga sentido.

### 9.4 Header

- Izquierda: logo `</>` + `tokendash`
- Centro: `LiveIndicator` (punto verde pulsante + "LIVE" + tiempo desde último dato; gris si sin datos)
- Derecha: selector [Hoy | 7d | 30d | Todo] + botón "↺ Reset"

### 9.5 Zona de notificaciones

Aparece entre el header y los tabs solo cuando hay sesiones sin etiquetar. Cada notificación muestra:
- Dot amarillo pulsante + "Nueva sesión sin proyecto"
- `session: <id truncado>  ·  modelo: <model>  ·  hace Xs`
- Botones de proyectos conocidos + `[+ Nuevo]` + `[Ignorar]`

Al etiquetar: la notificación cambia a verde "✓ Sesión etiquetada como X" y desaparece en 3s.  
Pueden acumularse múltiples notificaciones (una por sesión sin etiquetar).

### 9.6 Pantalla de onboarding (SetupGuide)

Se muestra cuando `connected === false` (nunca han llegado datos):

```
</>  tokendash
[● pulsante]  Esperando datos de Claude Code...

Pega esto en tu terminal:
┌─────────────────────────────────────────────┐
│ export CLAUDE_CODE_ENABLE_TELEMETRY=1        │
│ export OTEL_METRICS_EXPORTER=otlp            │
│ export OTEL_LOGS_EXPORTER=otlp               │
│ export OTEL_EXPORTER_OTLP_PROTOCOL=http/json │
│ export OTEL_EXPORTER_OTLP_ENDPOINT=\         │
│   http://localhost:1337                      │
│ export OTEL_EXPORTER_OTLP_METRICS_\          │
│   TEMPORALITY_PREFERENCE=cumulative          │
└─────────────────────────────────────────────┘
[Copiar todo]

Etiqueta tu sesión (opcional — puedes hacerlo desde la web):
export OTEL_RESOURCE_ATTRIBUTES="project=mi-proyecto"

Luego: claude
```

Cuando llegan los primeros datos via SSE → transición suave al dashboard.

### 9.7 Tabs y contenido

#### Overview
- StatsRow (3 columnas, 2 en móvil): Input tokens, Output tokens, Coste total, Tiempo activo, Sesiones, Commits
- TokensChart — área chart input vs output por hora/día
- CostChart — barra chart por día, coloreado por proyecto

#### Sessions
- Tabla ordenable: session_id, Proyecto (badge editable inline), Feature, Modelo, Inicio, Duración, Input, Output, Coste
- Click en fila → expande mini-feed de eventos de esa sesión
- Badge de proyecto clickable → edición inline (llama a `/api/sessions/:id/label`)

#### Projects
- Barras horizontales por proyecto (ordenadas por coste desc)
- Tabla: Proyecto | Sesiones | Input | Output | Caché % | Coste | Commits | LOC+/-

#### Tools
- Distribución horizontal: Bash | Edit | Read | Write | Glob | Grep | MCP...
- Tabla de últimas tool calls: Timestamp | Tool | Status (✓/✗) | Duración | Sesión
- Stat: tasa de aprobación (approved/total × 100%)

#### Agents
- Solo visible si hay datos de múltiples agentes (`agent_id` en traces)
- Árbol visual por sesión + tabla resumen

#### Events
- Feed de los últimos 500 eventos, tipo log de terminal
- Colores por tipo: user_prompt (azul), api_request (verde), api_error (naranja), tool_use ✓ (teal), tool_use ✗ (rojo), hook_* (amarillo)
- Filtros: [Todos] [API] [Tools] [Prompts] [Errores]
- Botón [⏸ Pausar scroll]

#### Costs
- Stats: Coste hoy | Coste mes | Proyección mes | Ahorro por caché
- CacheChart — stacked area (tokens caché leídos vs creados)
- EfficiencyChart — ratio output/input con línea de referencia en 0.5
- Tabla por modelo: Modelo | Requests | Input | Output | Coste | % total

### 9.8 Reglas de UI

- Números grandes: `1,234,567 → "1.2M"`, costes con 4 decimales
- Tiempos relativos: "hace 2 min", "hace 3h", "ayer"
- Font mono para números y IDs, sans-serif para labels
- Al cambiar de tab: no re-fetch si datos frescos (<30s)
- StatCard: flash breve del color de acento al recibir nuevos valores
- EventsFeed: slide-in desde arriba para nuevas entradas
- Gráficos: transición suave al cambiar rango temporal

---

## 10. bin/cli.js

```js
#!/usr/bin/env node
import { startServer } from '../src/server.js'
import open from 'open'

const PORT = process.env.TOKENDASH_PORT || 1337

await startServer({ port: PORT })

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  tokendash — monitor de Claude Code
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Dashboard  →  http://localhost:${PORT}

  Activa la telemetría en Claude Code:

  export CLAUDE_CODE_ENABLE_TELEMETRY=1
  export OTEL_METRICS_EXPORTER=otlp
  export OTEL_LOGS_EXPORTER=otlp
  export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
  export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:${PORT}
  export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative

  Etiqueta tu sesión (opcional — puedes hacerlo desde la web):
  export OTEL_RESOURCE_ATTRIBUTES="project=mi-proyecto"

  Luego: claude

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

open(`http://localhost:${PORT}`)
```

---

## 11. package.json raíz

```json
{
  "name": "tokendash",
  "version": "0.1.0",
  "description": "Monitor en tiempo real para Claude Code",
  "bin": { "tokendash": "./bin/cli.js" },
  "type": "module",
  "scripts": {
    "start": "node bin/cli.js",
    "build": "cd web && npm install && npm run build && cp -r dist ../dist",
    "dev:server": "node bin/cli.js",
    "dev:web": "cd web && npm run dev",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "express": "^4.18.0",
    "open": "^10.0.0"
  },
  "engines": { "node": ">=18" }
}
```

---

## 12. web/vite.config.ts

```ts
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:1337',
      '/v1':  'http://localhost:1337'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
}
```

---

## 13. Reglas de implementación

1. Nunca crashear por datos OTLP mal formados — `try/catch` en todo el parsing.
2. Todos los endpoints devuelven estructura vacía válida si no hay datos.
3. SSE soporta múltiples clientes simultáneos.
4. El store nunca lanza excepción — si falla escribir a disco, loguearlo y continuar.
5. La web funciona bien entre 400px y 2560px de ancho.
6. Al cambiar de tab: no re-fetch innecesario si los datos están frescos (<30s).
7. Comentarios del código en español.
8. En ESM, usar `import.meta.url` con `fileURLToPath` para resolver rutas (no `__dirname`). Ejemplo en `src/server.js`: `const __dirname = path.dirname(fileURLToPath(import.meta.url))` → estáticos en `path.join(__dirname, '../dist')`.
9. El servidor sirve estáticos desde `../dist` relativo a `src/` (= raíz del proyecto `dist/`, generado por el build).

---

## 14. Orden de implementación

1. `src/otlp-parser.js` — base de todo
2. `src/store.js` — estructura, getters, persistencia, sessionMappings
3. `src/api-routes.js` — endpoints REST + SSE
4. `src/server.js` — Express completo, un puerto
5. `bin/cli.js` — entry point
6. `web/` — App.tsx + layout (Header, TabBar, zona de notificaciones, SetupGuide)
7. `web/` — StatsRow + TokensChart + CostChart (Overview tab)
8. `web/` — SessionLabelNotification (etiquetado retroactivo)
9. `web/` — resto de tabs (Sessions, Projects, Tools, Agents, Events, Costs)
10. Build end-to-end + verificar `npx tokendash` funciona
