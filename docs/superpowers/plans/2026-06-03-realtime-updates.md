# Actualizaciones en tiempo real + Auto-config OTLP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que todas las tablas del dashboard se actualicen automáticamente al llegar telemetría OTLP, y que `npx tokenrace` configure las variables de entorno en `~/.zshrc` sin intervención del usuario.

**Architecture:** Se añade un contador `sseVersion` en `useMetrics` que se incrementa en cada evento SSE; ese contador se pasa como prop a los cinco componentes de tabla/feed para que sus `useEffect` lo tengan como dependencia y relancen el fetch automáticamente. En paralelo, `bin/cli.js` detecta si las vars OTLP están ya en el archivo rc de la shell del usuario y, si no, las añade.

**Tech Stack:** React 19, TypeScript, Node.js (ESM), node:fs, node:os

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `web/src/hooks/useMetrics.ts` | Añadir `sseVersion` state, retornarlo |
| `web/src/App.tsx` | Destruir `sseVersion`, pasarlo a tablas |
| `web/src/components/tables/SessionsTable.tsx` | Añadir prop `sseVersion`, agregar a deps |
| `web/src/components/tables/ProjectsTable.tsx` | Ídem |
| `web/src/components/tables/ToolsTable.tsx` | Ídem |
| `web/src/components/events/EventsFeed.tsx` | Ídem |
| `web/src/components/agents/AgentsTree.tsx` | Ídem (sin timeRange) |
| `src/ensure-env-vars.js` | Crear — lógica de `ensureEnvVars` aislada (testeable) |
| `bin/cli.js` | Importar y llamar a `ensureEnvVars` desde `src/ensure-env-vars.js` |
| `test/cli.test.js` | Tests unitarios para `ensureEnvVars` |

> **Nota:** `ensureEnvVars` va en `src/ensure-env-vars.js` y NO en `bin/cli.js` porque `bin/cli.js` tiene `await startServer()` a nivel de módulo. Si los tests importasen `bin/cli.js` arrancarían el servidor entero.

---

## Task 1: `useMetrics.ts` — exponer `sseVersion`

**Files:**
- Modify: `web/src/hooks/useMetrics.ts`

- [ ] **Paso 1: Añadir `sseVersion` al hook**

Reemplazar el contenido completo de `web/src/hooks/useMetrics.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'
import { useSSE } from './useSSE'
import type { Status, Summary, TimeRange } from '../types'

export function useMetrics(timeRange: TimeRange) {
  const [status, setStatus] = useState<Status>({
    connected: false, lastSeen: null, sessionCount: 0, totalEvents: 0, uptime: 0
  })
  const [summary, setSummary] = useState<Summary | null>(null)
  const [sseVersion, setSseVersion] = useState(0)
  const lastFetchRef = useRef<number>(0)

  const fetchData = useCallback(async () => {
    lastFetchRef.current = Date.now()
    try {
      const [s, sum] = await Promise.all([
        api.status(),
        api.summary(timeRange),
      ])
      setStatus(s)
      setSummary(sum)
    } catch {
      // el servidor puede no estar listo aún
    }
  }, [timeRange])

  // Fetch inicial y al cambiar el rango
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Al llegar un evento SSE: incrementar sseVersion (para tablas) +
  // refrescar summary si los datos tienen más de 30s
  const handleSSE = useCallback((_type: string, _payload: unknown) => {
    setSseVersion(v => v + 1)
    if (Date.now() - lastFetchRef.current > 30_000) {
      fetchData()
    } else {
      api.status().then(setStatus).catch(() => {})
    }
  }, [fetchData])

  useSSE(handleSSE)

  return { status, summary, refetch: fetchData, sseVersion }
}
```

- [ ] **Paso 2: Verificar que TypeScript compila**

```bash
cd /Users/franciscovalero/Desktop/proyectos/tokenrace/web
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add web/src/hooks/useMetrics.ts
git commit -m "feat: exponer sseVersion en useMetrics para trigger de tablas"
```

---

## Task 2: `App.tsx` — pasar `sseVersion` a las tablas

**Files:**
- Modify: `web/src/App.tsx`

- [ ] **Paso 1: Destruir `sseVersion` y pasarlo a todos los componentes**

En `web/src/App.tsx`, línea 25, cambiar:
```typescript
const { status, summary, refetch } = useMetrics(timeRange)
```
por:
```typescript
const { status, summary, refetch, sseVersion } = useMetrics(timeRange)
```

Luego, en las líneas donde se renderizan los tabs (líneas 75-79), añadir `sseVersion` a cada componente:

```typescript
{activeTab === 'sessions' && <SessionsTable timeRange={timeRange} sseVersion={sseVersion} />}
{activeTab === 'projects' && <ProjectsTable timeRange={timeRange} sseVersion={sseVersion} />}
{activeTab === 'tools'    && <ToolsTable timeRange={timeRange} sseVersion={sseVersion} />}
{activeTab === 'agents'   && <AgentsTree sseVersion={sseVersion} />}
{activeTab === 'events'   && <EventsFeed timeRange={timeRange} sseVersion={sseVersion} />}
```

- [ ] **Paso 2: Verificar TypeScript** (fallará hasta que los componentes acepten la prop — pasos siguientes)

```bash
cd /Users/franciscovalero/Desktop/proyectos/tokenrace/web
npx tsc --noEmit 2>&1 | head -20
```

Esperado: errores de tipo en SessionsTable, ProjectsTable, ToolsTable, AgentsTree, EventsFeed (se arreglan en Task 3).

---

## Task 3: Actualizar los cinco componentes de tabla

**Files:**
- Modify: `web/src/components/tables/SessionsTable.tsx`
- Modify: `web/src/components/tables/ProjectsTable.tsx`
- Modify: `web/src/components/tables/ToolsTable.tsx`
- Modify: `web/src/components/events/EventsFeed.tsx`
- Modify: `web/src/components/agents/AgentsTree.tsx`

### 3a — SessionsTable

- [ ] **Paso 1: Añadir prop y dependencia**

En `web/src/components/tables/SessionsTable.tsx`, cambiar la interfaz y el useEffect:

```typescript
interface SessionsTableProps {
  timeRange: TimeRange
  sseVersion: number
}

export function SessionsTable({ timeRange, sseVersion }: SessionsTableProps) {
  // ... estados existentes sin cambio ...

  useEffect(() => {
    api.sessions(50).then(setSessions).catch(() => {})
  }, [timeRange, sseVersion])
```

Solo cambian las líneas 7-9 (interfaz) y la línea 18-20 (useEffect deps). El resto del componente no se toca.

### 3b — ProjectsTable

- [ ] **Paso 2: Añadir prop y dependencia**

En `web/src/components/tables/ProjectsTable.tsx`:

```typescript
interface ProjectsTableProps {
  timeRange: TimeRange
  sseVersion: number
}

export function ProjectsTable({ timeRange, sseVersion }: ProjectsTableProps) {
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    api.projects(timeRange).then(setProjects).catch(() => {})
  }, [timeRange, sseVersion])
```

### 3c — ToolsTable

- [ ] **Paso 3: Añadir prop y dependencia**

En `web/src/components/tables/ToolsTable.tsx`:

```typescript
interface ToolsTableProps {
  timeRange: TimeRange
  sseVersion: number
}

export function ToolsTable({ timeRange, sseVersion }: ToolsTableProps) {
  const [data, setData] = useState<ToolsData | null>(null)

  useEffect(() => {
    api.tools(timeRange).then(setData).catch(() => {})
  }, [timeRange, sseVersion])
```

### 3d — EventsFeed

- [ ] **Paso 4: Añadir prop y dependencia**

En `web/src/components/events/EventsFeed.tsx`, cambiar la firma del componente y el useEffect de fetch:

```typescript
export function EventsFeed({ timeRange, sseVersion }: { timeRange: TimeRange; sseVersion: number }) {
  // ... estados existentes sin cambio ...

  useEffect(() => {
    api.events(500).then(setEvents).catch(() => {})
  }, [timeRange, sseVersion])
```

### 3e — AgentsTree

- [ ] **Paso 5: Añadir prop y dependencia**

En `web/src/components/agents/AgentsTree.tsx`:

```typescript
export function AgentsTree({ sseVersion }: { sseVersion: number }) {
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    api.agents().then(setAgents).catch(() => {})
  }, [sseVersion])
```

- [ ] **Paso 6: Verificar TypeScript**

```bash
cd /Users/franciscovalero/Desktop/proyectos/tokenrace/web
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Paso 7: Build de producción**

```bash
npm run build
```

Esperado: `dist/` generado sin errores.

- [ ] **Paso 8: Commit**

```bash
git add web/src/App.tsx \
        web/src/components/tables/SessionsTable.tsx \
        web/src/components/tables/ProjectsTable.tsx \
        web/src/components/tables/ToolsTable.tsx \
        web/src/components/events/EventsFeed.tsx \
        web/src/components/agents/AgentsTree.tsx
git commit -m "feat: tablas se actualizan en tiempo real via sseVersion"
```

---

## Task 4: Test de `ensureEnvVars`

**Files:**
- Create: `test/cli.test.js`

- [ ] **Paso 1: Escribir el test (antes de implementar la función)**

Crear `test/cli.test.js`:

```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Importamos desde src/ensure-env-vars.js, NO desde bin/cli.js,
// porque bin/cli.js tiene await startServer() a nivel de módulo.
import { ensureEnvVars } from '../src/ensure-env-vars.js'

function makeTmpRc() {
  const dir = join(tmpdir(), `tokenrace-test-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return join(dir, '.zshrc')
}

test('ensureEnvVars añade las vars si el archivo rc está vacío', () => {
  const rcPath = makeTmpRc()
  writeFileSync(rcPath, '', 'utf8')

  const result = ensureEnvVars(1337, rcPath)

  assert.equal(result.added, true)
  const content = readFileSync(rcPath, 'utf8')
  assert.ok(content.includes('CLAUDE_CODE_ENABLE_TELEMETRY=1'))
  assert.ok(content.includes('OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:1337'))
})

test('ensureEnvVars no duplica si las vars ya están presentes', () => {
  const rcPath = makeTmpRc()
  writeFileSync(rcPath, 'export CLAUDE_CODE_ENABLE_TELEMETRY=1\n', 'utf8')

  const result = ensureEnvVars(1337, rcPath)

  assert.equal(result.added, false)
  const content = readFileSync(rcPath, 'utf8')
  // Solo debe aparecer una vez
  const matches = content.match(/CLAUDE_CODE_ENABLE_TELEMETRY/g)
  assert.equal(matches?.length, 1)
})

test('ensureEnvVars crea el archivo si no existe', () => {
  const rcPath = makeTmpRc() + '_nuevo'
  // No creamos el archivo

  const result = ensureEnvVars(1337, rcPath)

  assert.equal(result.added, true)
  const content = readFileSync(rcPath, 'utf8')
  assert.ok(content.includes('CLAUDE_CODE_ENABLE_TELEMETRY=1'))
})

test('ensureEnvVars usa el puerto correcto en el endpoint', () => {
  const rcPath = makeTmpRc()
  writeFileSync(rcPath, '', 'utf8')

  ensureEnvVars(4242, rcPath)

  const content = readFileSync(rcPath, 'utf8')
  assert.ok(content.includes('http://localhost:4242'))
  assert.ok(!content.includes('localhost:1337'))
})
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

```bash
cd /Users/franciscovalero/Desktop/proyectos/tokenrace
node --test test/cli.test.js
```

Esperado: error — `ensureEnvVars` no existe todavía.

---

## Task 5: Implementar `ensureEnvVars` en `src/ensure-env-vars.js` y actualizar `bin/cli.js`

**Files:**
- Create: `src/ensure-env-vars.js`
- Modify: `bin/cli.js`

- [ ] **Paso 1: Crear `src/ensure-env-vars.js`**

```javascript
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Añade las variables de entorno OTLP al archivo rc de la shell
 * si no están ya presentes.
 *
 * @param {number} port - Puerto en el que corre tokenrace
 * @param {string} [rcPathOverride] - Ruta override para tests
 * @returns {{ added: boolean, rcPath: string }}
 */
export function ensureEnvVars(port, rcPathOverride) {
  const shell = process.env.SHELL ?? ''
  const defaultRc = shell.includes('zsh')
    ? join(homedir(), '.zshrc')
    : join(homedir(), '.bashrc')
  const rcPath = rcPathOverride ?? defaultRc

  const marker = 'CLAUDE_CODE_ENABLE_TELEMETRY'
  const existing = existsSync(rcPath) ? readFileSync(rcPath, 'utf8') : ''

  if (existing.includes(marker)) {
    return { added: false, rcPath }
  }

  const block = `
# tokenrace — telemetría Claude Code
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:${port}
export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative
`
  writeFileSync(rcPath, existing + block, 'utf8')
  return { added: true, rcPath }
}
```

- [ ] **Paso 2: Reescribir `bin/cli.js` para usar el nuevo módulo**

```javascript
#!/usr/bin/env node
import { startServer } from '../src/server.js'
import { ensureEnvVars } from '../src/ensure-env-vars.js'
import open from 'open'

const PORT = process.env.TOKENRACE_PORT ? Number(process.env.TOKENRACE_PORT) : 1337

const { added, rcPath } = ensureEnvVars(PORT)

const { server } = await startServer({ port: PORT })

const envStatus = added
  ? `  ✓ Variables OTLP añadidas a ${rcPath}\n  ⚠ Abre una nueva terminal y ejecuta: claude`
  : `  ✓ Variables OTLP ya presentes en ${rcPath}`

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  tokenrace — monitor de Claude Code
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Dashboard  →  http://localhost:${PORT}

${envStatus}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

// Abrir el browser (no bloqueante — si falla, el servidor sigue corriendo)
open(`http://localhost${PORT}`).catch(() => {})
```

- [ ] **Paso 2: Ejecutar los tests**

```bash
cd /Users/franciscovalero/Desktop/proyectos/tokenrace
node --test test/cli.test.js
```

Esperado: 4 tests pasando.

- [ ] **Paso 3: Ejecutar la suite completa**

```bash
npm test
```

Esperado: todos los tests pasando (57 anteriores + 4 nuevos = 61).

- [ ] **Paso 4: Commit**

```bash
git add src/ensure-env-vars.js bin/cli.js test/cli.test.js
git commit -m "feat: auto-configurar vars OTLP en ~/.zshrc al arrancar tokenrace"
```

---

## Task 6: Build final y verificación

- [ ] **Paso 1: Build del frontend**

```bash
cd /Users/franciscovalero/Desktop/proyectos/tokenrace/web
npm run build
```

Esperado: `dist/` generado sin errores ni warnings de TypeScript.

- [ ] **Paso 2: Suite completa de tests**

```bash
cd /Users/franciscovalero/Desktop/proyectos/tokenrace
npm test
```

Esperado: 61 tests pasando, 0 failing.

- [ ] **Paso 3: Bump de versión y commit final**

```bash
cd /Users/franciscovalero/Desktop/proyectos/tokenrace
npm version patch
git push
```
