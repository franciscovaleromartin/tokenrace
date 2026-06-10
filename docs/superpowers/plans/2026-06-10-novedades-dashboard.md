# Novedades Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir 4 funcionalidades al dashboard: pestaña Modelos, heatmap anual de actividad, deltas de tendencia en tarjetas y velocímetro en vivo en la cabecera.

**Architecture:** Todo frontend (React 19 + Tailwind). Los componentes nuevos siguen el patrón existente: reciben `timeRange`/`sseVersion` como props, hacen fetch con el cliente `api` y manejan estado local. El backend Express no se toca — `/api/timeseries` y `/api/models` ya existen.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vite. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-06-10-novedades-dashboard-design.md`

**Verificación:** el frontend no tiene test runner; cada tarea se verifica con `cd web && npx tsc --noEmit` (0 errores) y al final con inspección visual en navegador. Los tests del backend (`npm test`) deben seguir pasando intactos.

---

## Estructura de archivos

- Modify: `web/src/types.ts` — añadir `'models'` a `TabId`
- Modify: `web/src/components/layout/TabBar.tsx` — pestaña "Models"
- Create: `web/src/components/tables/ModelsTable.tsx` — tabla de modelos con barra de coste
- Create: `web/src/components/charts/ActivityHeatmap.tsx` — heatmap anual
- Modify: `web/src/components/stats/StatCard.tsx` — prop opcional `delta`
- Modify: `web/src/components/stats/StatsRow.tsx` — cálculo de tendencias
- Create: `web/src/hooks/useLiveRate.ts` — ritmo tokens/min y $/h
- Modify: `web/src/components/layout/Header.tsx` — mostrar velocímetro
- Modify: `web/src/App.tsx` — cablear todo

---

### Task 1: Pestaña Modelos

**Files:**
- Modify: `web/src/types.ts:107`
- Modify: `web/src/components/layout/TabBar.tsx:8-16`
- Create: `web/src/components/tables/ModelsTable.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Añadir 'models' al tipo TabId**

En `web/src/types.ts`, reemplazar:

```ts
export type TabId = 'overview' | 'sessions' | 'projects' | 'tools' | 'agents' | 'events' | 'costs'
```

por:

```ts
export type TabId = 'overview' | 'sessions' | 'projects' | 'tools' | 'agents' | 'models' | 'events' | 'costs'
```

- [ ] **Step 2: Añadir la pestaña en TabBar**

En `web/src/components/layout/TabBar.tsx`, reemplazar el array `TABS`:

```tsx
const TABS: Tab[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'sessions',  label: 'Sessions' },
  { id: 'projects',  label: 'Projects' },
  { id: 'tools',     label: 'Tools' },
  { id: 'agents',    label: 'Agents' },
  { id: 'models',    label: 'Models' },
  { id: 'events',    label: 'Events' },
  { id: 'costs',     label: 'Costs' },
]
```

- [ ] **Step 3: Crear ModelsTable**

Crear `web/src/components/tables/ModelsTable.tsx` con este contenido completo:

```tsx
import { useState, useEffect } from 'react'
import { api } from '../../api'
import { formatNumber, formatCost } from '../../utils/format'
import type { ModelStats } from '../../types'

interface ModelsTableProps {
  sseVersion: number
}

export function ModelsTable({ sseVersion }: ModelsTableProps) {
  const [models, setModels] = useState<ModelStats[]>([])

  useEffect(() => {
    api.models().then(setModels).catch(() => {})
  }, [sseVersion])

  if (models.length === 0) {
    return <div className="text-text-muted text-sm p-4">Sin datos de modelos</div>
  }

  const maxCost = Math.max(...models.map(m => m.cost), 0.000001)

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4">
      <div className="flex justify-between items-baseline mb-4">
        <h3 className="text-sm font-medium text-text-secondary">Coste por modelo</h3>
        <span className="text-xs text-text-muted">acumulado total</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-text-muted uppercase tracking-wider text-left">
            <th className="pb-2 font-medium">Modelo</th>
            <th className="pb-2 font-medium text-right">Requests</th>
            <th className="pb-2 font-medium text-right">Tokens In</th>
            <th className="pb-2 font-medium text-right">Tokens Out</th>
            <th className="pb-2 font-medium text-right">Coste</th>
          </tr>
        </thead>
        <tbody>
          {models.map(m => (
            <tr key={m.model} className="border-t border-bg-border">
              <td className="py-2 pr-4">
                <div className="font-mono text-text-primary">{m.model}</div>
                <div className="h-1.5 bg-bg-base rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-accent-purple rounded-full"
                    style={{ width: `${(m.cost / maxCost) * 100}%` }}
                  />
                </div>
              </td>
              <td className="py-2 text-right font-mono text-text-secondary">{m.requests}</td>
              <td className="py-2 text-right font-mono text-accent-blue">{formatNumber(m.tokensInput)}</td>
              <td className="py-2 text-right font-mono text-accent-green">{formatNumber(m.tokensOutput)}</td>
              <td className="py-2 text-right font-mono font-bold text-accent-purple">{formatCost(m.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Cablear en App.tsx**

Añadir el import junto a los demás:

```tsx
import { ModelsTable } from './components/tables/ModelsTable'
```

Y añadir el caso junto a las otras pestañas (después de la línea de `agents`):

```tsx
{activeTab === 'models'   && <ModelsTable sseVersion={sseVersion} />}
```

- [ ] **Step 5: Verificar compilación**

Run: `cd web && npx tsc --noEmit`
Expected: sin errores (exit 0)

- [ ] **Step 6: Commit**

```bash
git add web/src/types.ts web/src/components/layout/TabBar.tsx web/src/components/tables/ModelsTable.tsx web/src/App.tsx
git commit -m "feat: pestaña Modelos con comparativa de coste por modelo"
```

---

### Task 2: Cuadrícula de actividad (heatmap)

**Files:**
- Create: `web/src/components/charts/ActivityHeatmap.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Crear ActivityHeatmap**

Crear `web/src/components/charts/ActivityHeatmap.tsx` con este contenido completo.
Notas de diseño: días en UTC (los buckets de 1d del backend son medianoche UTC); fila 0 = lunes; nivel de color por proporción sobre el máximo del año.

```tsx
import { useState, useEffect } from 'react'
import { api } from '../../api'
import { formatNumber, formatCost } from '../../utils/format'
import type { TimeseriesPoint } from '../../types'

interface ActivityHeatmapProps {
  sseVersion: number
}

interface DayData { tokens: number; cost: number }

interface TooltipData {
  x: number
  y: number
  label: string
  tokens: number
  cost: number
}

const DAY_MS = 86_400_000
// Escala de naranjas del tema: apagado → máxima intensidad
const LEVEL_COLORS = ['#2a1d15', '#5c3a22', '#a05a2c', '#e07b39', '#ff8c4a']
const CELL = 11
const GAP = 3
const STEP = CELL + GAP
const LABEL_W = 28

function dayIndex(ts: number): number {
  return Math.floor(ts / DAY_MS)
}

export function ActivityHeatmap({ sseVersion }: ActivityHeatmapProps) {
  const [days, setDays] = useState<Map<number, DayData>>(new Map())
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  useEffect(() => {
    Promise.all([
      api.timeseries('claude_code.tokens.input',  'now-365d', '1d'),
      api.timeseries('claude_code.tokens.output', 'now-365d', '1d'),
      api.timeseries('claude_code.cost',          'now-365d', '1d'),
    ]).then(([input, output, cost]) => {
      const map = new Map<number, DayData>()
      const add = (points: TimeseriesPoint[], field: keyof DayData) => {
        for (const p of points) {
          const key = dayIndex(p.timestamp)
          const day = map.get(key) ?? { tokens: 0, cost: 0 }
          day[field] += p.value
          map.set(key, day)
        }
      }
      add(input, 'tokens')
      add(output, 'tokens')
      add(cost, 'cost')
      setDays(map)
    }).catch(() => {})
  }, [sseVersion])

  const values = [...days.values()]
  if (!values.some(d => d.tokens > 0)) {
    return (
      <div className="bg-bg-card border border-bg-border rounded-lg p-6 flex items-center justify-center h-32">
        <span className="text-text-muted text-sm">Sin datos de actividad</span>
      </div>
    )
  }

  const maxTokens = Math.max(...values.map(d => d.tokens), 1)

  // Desde el lunes de la semana de hace 364 días hasta hoy
  const todayIdx = dayIndex(Date.now())
  const startRaw = todayIdx - 364
  const startDow = (new Date(startRaw * DAY_MS).getUTCDay() + 6) % 7 // 0 = lunes
  const startIdx = startRaw - startDow

  const allDays: number[] = []
  for (let idx = startIdx; idx <= todayIdx; idx++) allDays.push(idx)

  // Etiquetas de mes: una por cambio de mes entre semanas
  const monthLabels: { col: number; label: string }[] = []
  let lastMonth = -1
  for (let col = 0; col * 7 + startIdx <= todayIdx; col++) {
    const firstDay = new Date((startIdx + col * 7) * DAY_MS)
    const month = firstDay.getUTCMonth()
    if (month !== lastMonth) {
      monthLabels.push({
        col,
        label: firstDay.toLocaleDateString('es', { month: 'short', timeZone: 'UTC' }),
      })
      lastMonth = month
    }
  }

  function levelFor(tokens: number): number {
    if (tokens <= 0) return 0
    return Math.min(4, Math.max(1, Math.ceil((tokens / maxTokens) * 4)))
  }

  function showTooltip(e: React.MouseEvent<HTMLDivElement>, idx: number) {
    const container = e.currentTarget.closest('[data-heatmap]') as HTMLElement | null
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const cellRect = e.currentTarget.getBoundingClientRect()
    const data = days.get(idx)
    setTooltip({
      x: cellRect.left - containerRect.left + CELL / 2,
      y: cellRect.top - containerRect.top,
      label: new Date(idx * DAY_MS).toLocaleDateString('es', {
        weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
      }),
      tokens: data?.tokens ?? 0,
      cost: data?.cost ?? 0,
    })
  }

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-text-secondary mb-4">Actividad — últimos 12 meses</h3>
      <div className="overflow-x-auto pb-1">
        <div className="relative inline-block" data-heatmap onMouseLeave={() => setTooltip(null)}>
          {/* Etiquetas de mes */}
          <div className="relative h-4 mb-1" style={{ marginLeft: LABEL_W }}>
            {monthLabels.map(m => (
              <span
                key={`${m.col}-${m.label}`}
                className="absolute text-[10px] text-text-secondary capitalize"
                style={{ left: m.col * STEP }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex">
            {/* Etiquetas de día de la semana */}
            <div className="relative shrink-0" style={{ width: LABEL_W, height: 7 * STEP - GAP }}>
              {([['Lun', 0], ['Mié', 2], ['Vie', 4]] as const).map(([label, row]) => (
                <span
                  key={label}
                  className="absolute text-[10px] text-text-secondary leading-none"
                  style={{ top: row * STEP + 1 }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Cuadrícula: columnas = semanas, filas = lun–dom */}
            <div
              className="grid grid-flow-col"
              style={{
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                gridAutoColumns: `${CELL}px`,
                gap: GAP,
              }}
            >
              {allDays.map(idx => (
                <div
                  key={idx}
                  className="rounded-[2px]"
                  style={{
                    width: CELL,
                    height: CELL,
                    background: LEVEL_COLORS[levelFor(days.get(idx)?.tokens ?? 0)],
                  }}
                  onMouseEnter={e => showTooltip(e, idx)}
                />
              ))}
            </div>
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="absolute z-10 pointer-events-none px-3 py-2 rounded-md text-xs whitespace-nowrap"
              style={{
                left: tooltip.x,
                top: tooltip.y - 8,
                transform: 'translate(-50%, -100%)',
                background: '#0d0d0d',
                border: '1px solid #1a1a1a',
              }}
            >
              <div className="text-text-primary font-medium capitalize">{tooltip.label}</div>
              <div className="text-text-secondary mt-0.5">
                {formatNumber(tooltip.tokens)} tokens · {formatCost(tooltip.cost)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Insertar en el Overview de App.tsx**

Añadir el import:

```tsx
import { ActivityHeatmap } from './components/charts/ActivityHeatmap'
```

En el bloque `{activeTab === 'overview' && (...)}`, insertar entre `<StatsRow …/>` y el `<div className="grid …">` de los gráficos:

```tsx
<ActivityHeatmap sseVersion={sseVersion} />
```

- [ ] **Step 3: Verificar compilación**

Run: `cd web && npx tsc --noEmit`
Expected: sin errores (exit 0)

- [ ] **Step 4: Commit**

```bash
git add web/src/components/charts/ActivityHeatmap.tsx web/src/App.tsx
git commit -m "feat: cuadrícula de actividad anual en Overview"
```

---

### Task 3: Tarjetas con tendencia

**Files:**
- Modify: `web/src/components/stats/StatCard.tsx`
- Modify: `web/src/components/stats/StatsRow.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Añadir prop delta a StatCard**

Reemplazar el contenido completo de `web/src/components/stats/StatCard.tsx`:

```tsx
interface StatCardProps {
  label: string
  value: string
  accent: string
  sublabel?: string
  delta?: number
}

export function StatCard({ label, value, accent, sublabel, delta }: StatCardProps) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4 flex flex-col gap-1">
      <span className="text-xs text-text-secondary uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-mono font-bold ${accent}`}>{value}</span>
      <div className="flex items-baseline gap-2">
        {delta !== undefined && (
          <span className={`text-xs font-mono ${delta >= 0 ? 'text-accent-teal' : 'text-accent-orange'}`}>
            {delta >= 0 ? '▲ +' : '▼ '}{delta.toFixed(1)}%
          </span>
        )}
        {sublabel && <span className="text-xs text-text-muted">{sublabel}</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Calcular tendencias en StatsRow**

Reemplazar el contenido completo de `web/src/components/stats/StatsRow.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { StatCard } from './StatCard'
import { formatNumber, formatCost, formatDuration } from '../../utils/format'
import { api } from '../../api'
import type { Summary, Project, TimeRange, TimeseriesPoint } from '../../types'

interface StatsRowProps {
  summary: Summary
  selectedProjectData: Project | null
  timeRange: TimeRange
  sseVersion: number
}

interface Trends {
  input?: number
  output?: number
  total?: number
  cost?: number
}

// Ventana doble para comparar con el período anterior equivalente.
// "all" no tiene período anterior, así que no lleva delta.
const PREV_WINDOW: Partial<Record<TimeRange, { from: string; bucket: string; ms: number }>> = {
  'now-24h': { from: 'now-48h', bucket: '1h', ms: 86_400_000 },
  'now-7d':  { from: 'now-14d', bucket: '1d', ms: 7 * 86_400_000 },
  'now-30d': { from: 'now-60d', bucket: '1d', ms: 30 * 86_400_000 },
}

function splitSums(points: TimeseriesPoint[], boundary: number): [number, number] {
  let prev = 0
  let cur = 0
  for (const p of points) {
    if (p.timestamp >= boundary) cur += p.value
    else prev += p.value
  }
  return [prev, cur]
}

function pctChange(prev: number, cur: number): number | undefined {
  if (prev <= 0) return undefined
  return ((cur - prev) / prev) * 100
}

export function StatsRow({ summary, selectedProjectData, timeRange, sseVersion }: StatsRowProps) {
  const [trends, setTrends] = useState<Trends>({})

  useEffect(() => {
    const win = PREV_WINDOW[timeRange]
    if (!win) {
      setTrends({})
      return
    }
    const boundary = Date.now() - win.ms
    Promise.all([
      api.timeseries('claude_code.tokens.input',  win.from, win.bucket),
      api.timeseries('claude_code.tokens.output', win.from, win.bucket),
      api.timeseries('claude_code.cost',          win.from, win.bucket),
    ]).then(([input, output, cost]) => {
      const [pi, ci] = splitSums(input, boundary)
      const [po, co] = splitSums(output, boundary)
      const [pc, cc] = splitSums(cost, boundary)
      setTrends({
        input:  pctChange(pi, ci),
        output: pctChange(po, co),
        total:  pctChange(pi + po, ci + co),
        cost:   pctChange(pc, cc),
      })
    }).catch(() => setTrends({}))
  }, [timeRange, sseVersion])

  const inputTokens  = selectedProjectData?.tokensInput  ?? summary.tokens.input
  const outputTokens = selectedProjectData?.tokensOutput ?? summary.tokens.output
  const totalTokens  = summary.tokens.input + summary.tokens.output

  const stats = [
    {
      label: 'Tokens Input',
      value: formatNumber(inputTokens),
      accent: 'text-accent-blue',
      delta: trends.input,
      sublabel: selectedProjectData
        ? `hit rate: ${(selectedProjectData.cacheHitRate * 100).toFixed(1)}%`
        : `caché: ${formatNumber(summary.tokens.cache)}`
    },
    {
      label: 'Tokens Output',
      value: formatNumber(outputTokens),
      accent: 'text-accent-green',
      delta: trends.output,
      sublabel: `eficiencia: ${(summary.efficiency * 100).toFixed(1)}%`
    },
    {
      label: 'Token total',
      value: formatNumber(totalTokens),
      accent: 'text-accent-teal',
      delta: trends.total,
      sublabel: `i: ${formatNumber(summary.tokens.input)} / o: ${formatNumber(summary.tokens.output)}`
    },
    {
      label: 'Coste de proyecto',
      value: selectedProjectData ? formatCost(selectedProjectData.cost) : '—',
      accent: 'text-accent-orange',
    },
    {
      label: 'Coste Total',
      value: formatCost(summary.cost),
      accent: 'text-accent-purple',
      delta: trends.cost,
    },
    {
      label: 'Tiempo Activo',
      value: formatDuration(summary.activeTimeMs),
      accent: 'text-text-secondary',
    },
    {
      label: 'Sesiones',
      value: String(summary.sessions),
      accent: 'text-text-primary',
    },
    {
      label: 'Commits',
      value: String(summary.commits),
      accent: 'text-accent-yellow',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(stat => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Pasar las props nuevas desde App.tsx**

Localizar en `web/src/App.tsx`:

```tsx
{summary && <StatsRow summary={summary} selectedProjectData={selectedProjectData} />}
```

Reemplazar por:

```tsx
{summary && (
  <StatsRow
    summary={summary}
    selectedProjectData={selectedProjectData}
    timeRange={timeRange}
    sseVersion={sseVersion}
  />
)}
```

- [ ] **Step 4: Verificar compilación**

Run: `cd web && npx tsc --noEmit`
Expected: sin errores (exit 0)

- [ ] **Step 5: Commit**

```bash
git add web/src/components/stats/StatCard.tsx web/src/components/stats/StatsRow.tsx web/src/App.tsx
git commit -m "feat: deltas de tendencia vs período anterior en tarjetas del Overview"
```

---

### Task 4: Velocímetro en vivo

**Files:**
- Create: `web/src/hooks/useLiveRate.ts`
- Modify: `web/src/components/layout/Header.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Crear el hook useLiveRate**

Crear `web/src/hooks/useLiveRate.ts` con este contenido completo:

```ts
import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import type { TimeseriesPoint } from '../types'

export interface LiveRate {
  tokensPerMin: number
  costPerHour: number
}

const sum = (points: TimeseriesPoint[]) => points.reduce((acc, p) => acc + p.value, 0)

/**
 * Ritmo de actividad de los últimos 5 minutos: tokens/min y $/hora.
 * Se refresca al llegar datos por SSE y cada 30s (para decaer a 0 al parar).
 */
export function useLiveRate(sseVersion: number): LiveRate {
  const [rate, setRate] = useState<LiveRate>({ tokensPerMin: 0, costPerHour: 0 })

  const fetchRate = useCallback(async () => {
    try {
      const [input, output, cost] = await Promise.all([
        api.timeseries('claude_code.tokens.input',  'now-5m', '5m'),
        api.timeseries('claude_code.tokens.output', 'now-5m', '5m'),
        api.timeseries('claude_code.cost',          'now-5m', '5m'),
      ])
      setRate({
        tokensPerMin: (sum(input) + sum(output)) / 5,
        costPerHour: sum(cost) * 12,
      })
    } catch {
      // el servidor puede no estar listo aún
    }
  }, [])

  useEffect(() => {
    fetchRate()
  }, [fetchRate, sseVersion])

  useEffect(() => {
    const id = setInterval(fetchRate, 30_000)
    return () => clearInterval(id)
  }, [fetchRate])

  return rate
}
```

- [ ] **Step 2: Mostrar el ritmo en Header**

En `web/src/components/layout/Header.tsx`:

Añadir el import de tipos y formato (tras los imports existentes):

```tsx
import { formatNumber, formatCost } from '../../utils/format'
import type { LiveRate } from '../../hooks/useLiveRate'
```

Añadir `liveRate` a las props:

```tsx
interface HeaderProps {
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
  connected: boolean
  lastSeen: number | null
  onReset: () => void
  liveRate: LiveRate
}
```

Actualizar la firma de la función:

```tsx
export function Header({ timeRange, onTimeRangeChange, connected, lastSeen, onReset, liveRate }: HeaderProps) {
```

Y reemplazar el bloque del live indicator por:

```tsx
      {/* Live indicator + velocímetro */}
      <div className="flex items-center gap-2 text-xs">
        <span
          className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-accent-green animate-pulse' : 'bg-text-muted'}`}
        />
        <span className={connected ? 'text-accent-green' : 'text-text-muted'}>
          {connected ? 'LIVE' : 'SIN DATOS'}
        </span>
        <span className="text-text-muted">{timeSince(lastSeen)}</span>
        {liveRate.tokensPerMin > 0 && (
          <span className="hidden sm:flex items-center gap-2 ml-2 font-mono">
            <span className="text-accent-orange">⚡ {formatNumber(liveRate.tokensPerMin)} tok/min</span>
            <span className="text-accent-purple">{formatCost(liveRate.costPerHour)}/h</span>
          </span>
        )}
      </div>
```

- [ ] **Step 3: Cablear en App.tsx**

Añadir el import:

```tsx
import { useLiveRate } from './hooks/useLiveRate'
```

Dentro de `App()`, tras la línea de `useMetrics`:

```tsx
const liveRate = useLiveRate(sseVersion)
```

Y pasar `liveRate={liveRate}` a **los dos** `<Header …/>` (el del SetupGuide y el principal).

- [ ] **Step 4: Verificar compilación**

Run: `cd web && npx tsc --noEmit`
Expected: sin errores (exit 0)

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/useLiveRate.ts web/src/components/layout/Header.tsx web/src/App.tsx
git commit -m "feat: velocímetro en vivo (tokens/min y \$/h) en la cabecera"
```

---

### Task 5: Verificación final y release

**Files:**
- Modify: `package.json` (bump de versión)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Tests de backend intactos**

Run: `npm test` (desde la raíz)
Expected: 66 tests pass, 0 fail

- [ ] **Step 2: Build de producción**

Run: `npm run build` (desde la raíz)
Expected: build de Vite sin errores

- [ ] **Step 3: Verificación visual**

Run: `node bin/cli.js` y abrir `http://localhost:1337`. Comprobar:
- Pestaña Models aparece y lista modelos (o "Sin datos de modelos")
- Overview muestra el heatmap entre tarjetas y gráficos
- Hover en una celda del heatmap muestra tooltip con fecha, tokens y coste
- Con rango 7d/30d, las tarjetas Tokens Input/Output/Total y Coste Total muestran ▲/▼ (si hay datos del período anterior)
- Durante una sesión activa de Claude Code, la cabecera muestra "⚡ X tok/min · $Y/h"

- [ ] **Step 4: Bump de versión y CHANGELOG**

En `package.json` raíz, subir `version` a `0.2.0` (minor: funcionalidades nuevas).
En `CHANGELOG.md`, añadir entrada al inicio siguiendo el formato existente con las 4 novedades.

- [ ] **Step 5: Commit y push**

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump versión a 0.2.0 — novedades dashboard"
git push origin main
```
