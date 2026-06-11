# Rediseño visual estilo "Dynatrace denso" — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retematizar el frontend de tokenrace (`web/`) al estilo Dynatrace: paleta azul-marino con acento cian, sidebar de iconos (lateral en desktop, inferior en móvil), Overview como hub 3×2 con paneles "Ver todo →", y mini-KPIs en cada pestaña.

**Architecture:** Retematización por capas: (1) cambiar design tokens en `index.css` + `tailwind.config.ts`; (2) componentes nuevos de navegación y hub (`Sidebar`, `HubPanel`, paneles de lista, `TabStats`); (3) restyle de los componentes existentes (gráficas recharts solo cambian colores, tablas heredan los tokens). Sin tocar el servidor (`src/`) ni añadir dependencias.

**Tech Stack:** React 19, Vite, Tailwind CSS 3, recharts, lucide-react. Sin framework de tests frontend: la verificación por tarea es `npm run build` (tsc + vite) y la verificación final es visual contra el build servido en el puerto 1338.

**Spec:** `docs/superpowers/specs/2026-06-11-rediseno-dynatrace-design.md`

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `web/src/index.css` | Modificar | Variables CSS de la paleta nueva |
| `web/tailwind.config.ts` | Modificar | Tokens de color Tailwind |
| `web/src/utils/chartTheme.ts` | Crear | Constantes de estilo compartidas para recharts (DRY) |
| `web/src/components/layout/Sidebar.tsx` | Crear | Navegación por iconos (desktop lateral + móvil inferior) |
| `web/src/components/layout/TabBar.tsx` | Eliminar | Sustituido por Sidebar |
| `web/src/components/layout/Header.tsx` | Modificar | Título de sección, LIVE en rojo, rango activo en cian |
| `web/src/components/overview/HubPanel.tsx` | Crear | Contenedor de panel del hub con título y "Ver todo →" |
| `web/src/components/overview/RecentSessionsPanel.tsx` | Crear | Top 3 sesiones recientes |
| `web/src/components/overview/TopProjectsPanel.tsx` | Crear | Top 3 proyectos por coste |
| `web/src/components/overview/RecentEventsPanel.tsx` | Crear | Últimos 3 eventos |
| `web/src/components/overview/CacheSavingsPanel.tsx` | Crear | Cifra grande de ahorro de caché |
| `web/src/components/stats/StatCard.tsx` | Modificar | Soporte de onClick (KPIs clicables) |
| `web/src/components/stats/StatsRow.tsx` | Modificar | Reducir a 6 KPIs con navegación |
| `web/src/components/stats/TabStats.tsx` | Crear | Mini-fila de KPIs reutilizable por pestaña |
| `web/src/components/charts/*.tsx` (5) | Modificar | Colores de la paleta nueva; `compact` en Tokens/Cost |
| `web/src/components/tables/*.tsx` (4) | Modificar | Añadir TabStats arriba |
| `web/src/components/agents/AgentsList.tsx` | Modificar | Añadir TabStats arriba |
| `web/src/components/events/EventsFeed.tsx` | Modificar | Añadir TabStats arriba |
| `web/src/App.tsx` | Modificar | Layout sidebar+main, Overview hub, títulos de sección |

**Comando de verificación por tarea** (desde la raíz del repo):

```bash
cd web && npm run build
```

Expected: termina sin errores de TypeScript ni de Vite (`✓ built in …`).

---

### Task 1: Design tokens

**Files:**
- Modify: `web/tailwind.config.ts`
- Modify: `web/src/index.css`

- [ ] **Step 1: Sustituir los colores de `web/tailwind.config.ts`**

Reemplazar el bloque `colors` completo (líneas 7-22) por:

```ts
      colors: {
        'bg-base':       '#0b1218',
        'bg-card':       '#141d26',
        'bg-card-hover': '#18222d',
        'bg-border':     '#2a3947',
        'bg-subtle':     '#141d26',
        'bg-sidebar':    '#080d12',
        'text-primary':  '#c8d6dd',
        'text-secondary':'#8fa3b0',
        'text-muted':    '#5a6e7a',
        'accent-cyan':   '#00a8e8',
        'accent-green':  '#6bcb77',
        'accent-blue':   '#74cff7',
        'accent-purple': '#c592f0',
        'accent-orange': '#ff8266',
        'accent-teal':   '#00d4aa',
        'accent-yellow': '#f5d36b',
        'accent-red':    '#ff5e5e',
        'link-subtle':   '#3b82a8',
      },
```

Nota: `accent-green` pasa de naranja (bug de nombre histórico) a verde real; los componentes que lo usaban como "color de marca" (logo, LIVE, pestaña activa) se corrigen en las tareas 2-4.

- [ ] **Step 2: Sustituir las variables CSS y colores base de `web/src/index.css`**

Reemplazar el bloque `:root` (líneas 5-20) por:

```css
:root {
  --bg-base: #0b1218;
  --bg-card: #141d26;
  --bg-card-hover: #18222d;
  --bg-border: #2a3947;
  --bg-subtle: #141d26;
  --bg-sidebar: #080d12;
  --text-primary: #c8d6dd;
  --text-secondary: #8fa3b0;
  --text-muted: #5a6e7a;
  --accent-cyan: #00a8e8;
  --accent-green: #6bcb77;
  --accent-blue: #74cff7;
  --accent-purple: #c592f0;
  --accent-orange: #ff8266;
  --accent-teal: #00d4aa;
  --accent-yellow: #f5d36b;
  --accent-red: #ff5e5e;
  --link-subtle: #3b82a8;
}
```

En el bloque `html, body, #root` cambiar `background-color: #14191F` → `#0b1218` y `color: #ffffff` → `#c8d6dd`.

Reemplazar el bloque de scrollbar por:

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #0b1218; }
::-webkit-scrollbar-thumb { background: #2a3947; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #3b4d5e; }
```

- [ ] **Step 3: Verificar build**

Run: `cd web && npm run build` — Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add web/tailwind.config.ts web/src/index.css
git commit -m "feat: paleta Dynatrace — design tokens azul-marino con acento cian"
```

---

### Task 2: Componente Sidebar

**Files:**
- Create: `web/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Crear `Sidebar.tsx`**

```tsx
import { LayoutDashboard, List, FolderGit2, Wrench, Bot, Cpu, Zap, DollarSign } from 'lucide-react'
import type { TabId } from '../../types'

const NAV: { id: TabId; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'sessions', label: 'Sessions', Icon: List },
  { id: 'projects', label: 'Projects', Icon: FolderGit2 },
  { id: 'tools',    label: 'Tools',    Icon: Wrench },
  { id: 'agents',   label: 'Agents',   Icon: Bot },
  { id: 'models',   label: 'Models',   Icon: Cpu },
  { id: 'events',   label: 'Events',   Icon: Zap },
  { id: 'costs',    label: 'Costs',    Icon: DollarSign },
]

interface SidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <>
      {/* Desktop: barra lateral fija a la izquierda */}
      <nav className="hidden md:flex flex-col items-center w-[52px] shrink-0 bg-bg-sidebar border-r border-bg-border sticky top-0 h-screen z-50">
        <div className="py-4 text-accent-cyan font-mono font-bold text-sm">&lt;/&gt;</div>
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            title={label}
            onClick={() => onTabChange(id)}
            className={`w-full flex justify-center py-3 border-l-2 transition-colors ${
              activeTab === id
                ? 'border-accent-cyan bg-bg-card text-accent-cyan'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={18} />
          </button>
        ))}
      </nav>

      {/* Móvil: barra inferior fija */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex bg-bg-sidebar border-t border-bg-border z-50">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            title={label}
            onClick={() => onTabChange(id)}
            className={`flex-1 flex justify-center py-3 border-t-2 transition-colors ${
              activeTab === id
                ? 'border-accent-cyan text-accent-cyan'
                : 'border-transparent text-text-secondary'
            }`}
          >
            <Icon size={18} />
          </button>
        ))}
      </nav>
    </>
  )
}
```

- [ ] **Step 2: Verificar build**

Run: `cd web && npm run build` — Expected: sin errores (el componente aún no se usa; no debe romper nada).

- [ ] **Step 3: Commit**

```bash
git add web/src/components/layout/Sidebar.tsx
git commit -m "feat: Sidebar de iconos — lateral en desktop, barra inferior en móvil"
```

---

### Task 3: Header simplificado

**Files:**
- Modify: `web/src/components/layout/Header.tsx`

- [ ] **Step 1: Añadir prop `sectionTitle` y sustituir el logo por el título de sección**

En `HeaderProps` añadir:

```ts
  sectionTitle: string
```

Actualizar la firma:

```tsx
export function Header({ sectionTitle, timeRange, onTimeRangeChange, connected, lastSeen, onReset, liveRate }: HeaderProps) {
```

Reemplazar el bloque del logo (líneas 34-38, el `<div>` con `&lt;/&gt; tokenrace`) por:

```tsx
      {/* Título de sección (el logo vive en el Sidebar; en móvil se muestra aquí) */}
      <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <span className="md:hidden text-accent-cyan font-mono">&lt;/&gt;</span>
        <span>{sectionTitle}</span>
      </div>
```

- [ ] **Step 2: Corregir colores de LIVE y del selector de rango**

En el indicador LIVE, reemplazar:

```tsx
          className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-accent-green animate-pulse' : 'bg-text-muted'}`}
```

por:

```tsx
          className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-accent-red animate-pulse' : 'bg-text-muted'}`}
```

y:

```tsx
        <span className={connected ? 'text-accent-green' : 'text-text-muted'}>
```

por:

```tsx
        <span className={connected ? 'text-accent-red' : 'text-text-muted'}>
```

En el selector de rango, reemplazar la clase del botón activo:

```tsx
                  ? 'bg-accent-green text-black font-semibold'
```

por:

```tsx
                  ? 'bg-accent-cyan text-bg-base font-semibold'
```

En el velocímetro live, cambiar `text-accent-orange` → `text-accent-cyan` (el ⚡ tok/min pasa a cian; el coste/h se queda en `text-accent-purple`).

- [ ] **Step 3: Verificar build (fallará en App.tsx por la prop nueva — esperado)**

Run: `cd web && npm run build`
Expected: FAIL con error TS en `App.tsx` (falta `sectionTitle` en los dos usos de `<Header>`). Es la señal para la tarea 4. **No commitear todavía.**

---

### Task 4: Layout de App con Sidebar

**Files:**
- Modify: `web/src/App.tsx`
- Delete: `web/src/components/layout/TabBar.tsx`

- [ ] **Step 1: Sustituir TabBar por Sidebar y añadir títulos de sección**

En los imports de `App.tsx`, reemplazar:

```tsx
import { TabBar } from './components/layout/TabBar'
```

por:

```tsx
import { Sidebar } from './components/layout/Sidebar'
```

Añadir tras los imports (antes de `interface ProjectSelectorProps`):

```tsx
const SECTION_TITLES: Record<TabId, string> = {
  overview: 'Overview',
  sessions: 'Sessions',
  projects: 'Projects',
  tools:    'Tools',
  agents:   'Agents',
  models:   'Models',
  events:   'Events',
  costs:    'Costs',
}
```

- [ ] **Step 2: Reestructurar el JSX principal**

En la rama de SetupGuide (cuando no hay datos), añadir la prop al Header:

```tsx
        <Header
          sectionTitle="Setup"
          timeRange={timeRange}
          ...resto igual
        />
```

En el return principal, reemplazar la estructura:

```tsx
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      <Header ... />
      <SessionLabelNotification onLabeled={refetch} />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 p-4 max-w-screen-2xl mx-auto w-full">
```

por:

```tsx
    <div className="min-h-screen bg-bg-base text-text-primary flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0 pb-14 md:pb-0">
        <Header
          sectionTitle={SECTION_TITLES[activeTab]}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          connected={status.connected}
          lastSeen={status.lastSeen}
          onReset={handleReset}
          liveRate={liveRate}
        />
        <SessionLabelNotification onLabeled={refetch} />
        <main className="flex-1 p-4 max-w-screen-2xl mx-auto w-full">
```

y cerrar el `<div>` extra antes del cierre del contenedor raíz (el `</main>` pasa a ir seguido de `</div></div>`). El `pb-14 md:pb-0` evita que la barra inferior móvil tape el contenido.

- [ ] **Step 3: Eliminar TabBar**

```bash
rm web/src/components/layout/TabBar.tsx
```

- [ ] **Step 4: Verificar build**

Run: `cd web && npm run build` — Expected: sin errores.

- [ ] **Step 5: Commit (incluye los cambios de Header de la tarea 3)**

```bash
git add web/src/App.tsx web/src/components/layout/Header.tsx web/src/components/layout/TabBar.tsx web/src/components/layout/Sidebar.tsx
git commit -m "feat: layout con Sidebar y Header con título de sección — sustituye al TabBar"
```

---

### Task 5: Tema compartido de gráficas y restyle de las 5 gráficas

**Files:**
- Create: `web/src/utils/chartTheme.ts`
- Modify: `web/src/components/charts/TokensChart.tsx`
- Modify: `web/src/components/charts/CostChart.tsx`
- Modify: `web/src/components/charts/CacheChart.tsx`
- Modify: `web/src/components/charts/EfficiencyChart.tsx`
- Modify: `web/src/components/charts/ActivityHeatmap.tsx`

- [ ] **Step 1: Crear `web/src/utils/chartTheme.ts`**

```ts
/** Estilos compartidos para las gráficas recharts — paleta Dynatrace */
export const CHART_GRID = '#2a3947'
export const CHART_TICK = { fill: '#8fa3b0', fontSize: 11 }
export const CHART_TOOLTIP_STYLE = {
  background: '#141d26',
  border: '1px solid #2a3947',
  borderRadius: '6px',
} as const

export const COLOR_INPUT  = '#00a8e8'
export const COLOR_OUTPUT = '#6bcb77'

export const PROJECT_COLORS = [
  '#c592f0', '#00a8e8', '#6bcb77', '#f5d36b', '#ff5e5e',
  '#74cff7', '#ff8266', '#84cc16', '#ec4899', '#8b5cf6',
]
```

- [ ] **Step 2: Restyle `TokensChart.tsx`**

Importar el tema:

```tsx
import { CHART_GRID, CHART_TICK, CHART_TOOLTIP_STYLE, COLOR_INPUT, COLOR_OUTPUT } from '../../utils/chartTheme'
```

Reemplazos exactos dentro del JSX:
- En los dos `linearGradient`: `#4da6ff` → `{COLOR_INPUT}` y `#00ff88` → `{COLOR_OUTPUT}` (usar `stopColor={COLOR_INPUT}` etc.)
- `<CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />` → `stroke={CHART_GRID}`
- Ambos ejes: `tick={{ fill: '#888888', fontSize: 11 }}` → `tick={CHART_TICK}`; `axisLine={{ stroke: '#1a1a1a' }}` → `axisLine={{ stroke: CHART_GRID }}`
- `Tooltip contentStyle={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '6px' }}` → `contentStyle={CHART_TOOLTIP_STYLE}`; `labelStyle={{ color: '#888888', fontSize: 12 }}` → `labelStyle={{ color: '#8fa3b0', fontSize: 12 }}`
- `Legend wrapperStyle={{ fontSize: 12, color: '#888888' }}` → `color: '#8fa3b0'`
- En las dos `<Area>`: `stroke="#4da6ff"` → `stroke={COLOR_INPUT}`, `stroke="#00ff88"` → `stroke={COLOR_OUTPUT}`

- [ ] **Step 3: Restyle `CostChart.tsx`**

Importar `CHART_GRID, CHART_TICK, PROJECT_COLORS` desde `../../utils/chartTheme` y **eliminar** la constante local `PROJECT_COLORS` (líneas 14-17). Aplicar los mismos reemplazos de grid/ticks/ejes/legend que en el paso 2.

- [ ] **Step 4: Restyle `CacheChart.tsx` y `EfficiencyChart.tsx`**

Mismos reemplazos de grid (`#1a1a1a` → `CHART_GRID`), ticks (`#888888` → `CHART_TICK`), tooltip (`#0d0d0d`/`#1a1a1a` → `CHART_TOOLTIP_STYLE`) y legend. Además:
- `CacheChart`: `stroke="#00d4aa"` se mantiene (teal sigue en paleta); `stroke="#4da6ff" fill="#4da6ff"` → `"#00a8e8"`.
- `EfficiencyChart`: `ReferenceLine stroke="#444444"` → `"#3b4d5e"`; `label fill: '#666'` → `'#5a6e7a'`; `Line stroke="#a855f7"` → `"#c592f0"`.

- [ ] **Step 5: Restyle `ActivityHeatmap.tsx`**

Reemplazar la escala naranja:

```ts
const LEVEL_COLORS = ['#2a1d15', '#5c3a22', '#a05a2c', '#e07b39', '#ff8c4a']
```

por la escala cian:

```ts
const LEVEL_COLORS = ['#11202c', '#16384c', '#1b5675', '#0e7fb0', '#00a8e8']
```

Y el tooltip (líneas ~193-194): `background: '#0d0d0d'` → `'#141d26'`, `border: '1px solid #1a1a1a'` → `'1px solid #2a3947'`.

- [ ] **Step 6: Comprobar que no quedan colores del tema viejo en gráficas**

Run: `grep -rn "#1a1a1a\|#888888\|#0d0d0d\|#4da6ff\|#00ff88\|#a855f7" web/src/components/charts/`
Expected: sin resultados.

- [ ] **Step 7: Verificar build**

Run: `cd web && npm run build` — Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add web/src/utils/chartTheme.ts web/src/components/charts/
git commit -m "feat: gráficas con paleta Dynatrace — tema recharts compartido (DRY)"
```

---

### Task 6: Modo compacto para TokensChart y CostChart

**Files:**
- Modify: `web/src/components/charts/TokensChart.tsx`
- Modify: `web/src/components/charts/CostChart.tsx`

- [ ] **Step 1: Añadir prop `compact` a `TokensChart`**

```tsx
interface TokensChartProps {
  timeRange: TimeRange
  sseVersion: number
  compact?: boolean
}

export function TokensChart({ timeRange, sseVersion, compact = false }: TokensChartProps) {
```

En el JSX: `<ResponsiveContainer width="100%" height={220}>` → `height={compact ? 140 : 220}`, y renderizar la leyenda solo en modo normal: `{!compact && <Legend wrapperStyle={{ fontSize: 12, color: '#8fa3b0' }} />}`. En el estado vacío, `h-48` → `` className={`bg-bg-card border border-bg-border rounded-lg p-6 flex items-center justify-center ${compact ? 'h-full min-h-[180px]' : 'h-48'}`} ``.

- [ ] **Step 2: Mismo cambio en `CostChart`** (prop `compact`, altura `compact ? 140 : 220`, leyenda condicional, estado vacío igual que el paso 1).

- [ ] **Step 3: Verificar build**

Run: `cd web && npm run build` — Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/charts/TokensChart.tsx web/src/components/charts/CostChart.tsx
git commit -m "feat: modo compact en TokensChart y CostChart para el hub del Overview"
```

---

### Task 7: Paneles del hub (HubPanel + 4 paneles)

**Files:**
- Create: `web/src/components/overview/HubPanel.tsx`
- Create: `web/src/components/overview/RecentSessionsPanel.tsx`
- Create: `web/src/components/overview/TopProjectsPanel.tsx`
- Create: `web/src/components/overview/RecentEventsPanel.tsx`
- Create: `web/src/components/overview/CacheSavingsPanel.tsx`

- [ ] **Step 1: Crear `HubPanel.tsx`**

```tsx
import type { ReactNode } from 'react'

interface HubPanelProps {
  title: string
  onViewAll?: () => void
  children: ReactNode
}

export function HubPanel({ title, onViewAll, children }: HubPanelProps) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4 flex flex-col">
      <h3 className="text-sm font-medium text-text-secondary mb-3">{title}</h3>
      <div className="flex-1">{children}</div>
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="self-start mt-3 text-xs text-link-subtle hover:text-accent-cyan transition-colors"
        >
          Ver todo →
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Crear `RecentSessionsPanel.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { api } from '../../api'
import { formatCost, formatNumber } from '../../utils/format'
import { HubPanel } from './HubPanel'
import type { Session } from '../../types'

interface RecentSessionsPanelProps {
  sseVersion: number
  onViewAll: () => void
}

export function RecentSessionsPanel({ sseVersion, onViewAll }: RecentSessionsPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    api.sessions(3).then(setSessions).catch(() => {})
  }, [sseVersion])

  return (
    <HubPanel title="Sesiones recientes" onViewAll={onViewAll}>
      {sessions.length === 0 ? (
        <span className="text-xs text-text-muted">Sin sesiones</span>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map(s => (
            <li key={s.sessionId} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-text-primary truncate">
                <span className="text-accent-cyan">●</span> {s.project ?? 'sin proyecto'}
              </span>
              <span className="font-mono text-text-secondary whitespace-nowrap">
                {formatCost(s.cost)} · {formatNumber(s.tokensInput + s.tokensOutput)} tok
              </span>
            </li>
          ))}
        </ul>
      )}
    </HubPanel>
  )
}
```

- [ ] **Step 3: Crear `TopProjectsPanel.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { api } from '../../api'
import { formatCost } from '../../utils/format'
import { HubPanel } from './HubPanel'
import type { Project, TimeRange } from '../../types'

interface TopProjectsPanelProps {
  timeRange: TimeRange
  sseVersion: number
  onViewAll: () => void
}

export function TopProjectsPanel({ timeRange, sseVersion, onViewAll }: TopProjectsPanelProps) {
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    api.projects(timeRange)
      .then(ps => setProjects([...ps].sort((a, b) => b.cost - a.cost).slice(0, 3)))
      .catch(() => {})
  }, [timeRange, sseVersion])

  return (
    <HubPanel title="Top proyectos" onViewAll={onViewAll}>
      {projects.length === 0 ? (
        <span className="text-xs text-text-muted">Sin proyectos</span>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((p, i) => (
            <li key={p.project} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-text-primary truncate">
                <span className="text-text-muted">{i + 1}.</span> {p.project}
              </span>
              <span className="font-mono text-accent-yellow whitespace-nowrap">{formatCost(p.cost)}</span>
            </li>
          ))}
        </ul>
      )}
    </HubPanel>
  )
}
```

- [ ] **Step 4: Crear `RecentEventsPanel.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { api } from '../../api'
import { formatRelativeTime } from '../../utils/format'
import { HubPanel } from './HubPanel'
import type { Event } from '../../types'

interface RecentEventsPanelProps {
  sseVersion: number
  onViewAll: () => void
}

function eventColor(name: string): string {
  if (name.includes('error'))  return 'text-accent-red'
  if (name === 'user_prompt')  return 'text-accent-blue'
  if (name === 'api_request')  return 'text-accent-green'
  if (name === 'tool_use')     return 'text-accent-teal'
  if (name.startsWith('hook_')) return 'text-accent-yellow'
  return 'text-text-secondary'
}

export function RecentEventsPanel({ sseVersion, onViewAll }: RecentEventsPanelProps) {
  const [events, setEvents] = useState<Event[]>([])

  useEffect(() => {
    api.events(3).then(setEvents).catch(() => {})
  }, [sseVersion])

  return (
    <HubPanel title="Eventos recientes" onViewAll={onViewAll}>
      {events.length === 0 ? (
        <span className="text-xs text-text-muted">Sin eventos</span>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((ev, i) => (
            <li key={`${ev.timestamp}-${i}`} className="flex items-baseline justify-between gap-2 text-xs">
              <span className={`truncate ${eventColor(ev.eventName)}`}>● {ev.eventName}</span>
              <span className="text-text-muted whitespace-nowrap">{formatRelativeTime(ev.timestamp)}</span>
            </li>
          ))}
        </ul>
      )}
    </HubPanel>
  )
}
```

- [ ] **Step 5: Crear `CacheSavingsPanel.tsx`**

```tsx
import { formatCost, formatNumber } from '../../utils/format'
import { estimateCacheSavings } from '../../utils/prices'
import { HubPanel } from './HubPanel'
import type { Summary } from '../../types'

export function CacheSavingsPanel({ summary }: { summary: Summary }) {
  return (
    <HubPanel title="Ahorro caché">
      <div className="flex flex-col justify-center h-full gap-1">
        <span className="text-3xl font-mono font-bold text-accent-green">
          {formatCost(estimateCacheSavings(summary.tokens.cache))}
        </span>
        <span className="text-xs text-text-muted">
          est. período · {formatNumber(summary.tokens.cache)} tokens de caché
        </span>
      </div>
    </HubPanel>
  )
}
```

- [ ] **Step 6: Verificar build**

Run: `cd web && npm run build` — Expected: sin errores (componentes aún no usados).

- [ ] **Step 7: Commit**

```bash
git add web/src/components/overview/
git commit -m "feat: paneles del hub del Overview — HubPanel, sesiones, proyectos, eventos, ahorro caché"
```

---

### Task 8: KPIs clicables (StatCard + StatsRow a 6 KPIs)

**Files:**
- Modify: `web/src/components/stats/StatCard.tsx`
- Modify: `web/src/components/stats/StatsRow.tsx`

- [ ] **Step 1: Añadir `onClick` a `StatCard.tsx`**

Reemplazar el componente completo por:

```tsx
interface StatCardProps {
  label: string
  value: string
  accent: string
  sublabel?: string
  delta?: number
  onClick?: () => void
}

export function StatCard({ label, value, accent, sublabel, delta, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-bg-card border border-bg-border rounded-lg p-4 flex flex-col gap-1 ${
        onClick ? 'cursor-pointer hover:bg-bg-card-hover hover:border-accent-cyan/40 transition-colors' : ''
      }`}
    >
      <span className="text-xs text-text-secondary uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-mono font-bold ${accent}`}>{value}</span>
      <div className="flex items-baseline gap-2">
        {delta !== undefined && (
          <span className={`text-xs font-mono ${delta >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {delta >= 0 ? '▲ +' : '▼ '}{delta.toFixed(1)}%
          </span>
        )}
        {sublabel && <span className="text-xs text-text-muted">{sublabel}</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Reducir `StatsRow.tsx` a 6 KPIs con navegación**

Añadir `TabId` al import de tipos y la prop:

```ts
import type { Summary, Project, TimeRange, TimeseriesPoint, TabId } from '../../types'

interface StatsRowProps {
  summary: Summary
  selectedProjectData: Project | null
  timeRange: TimeRange
  sseVersion: number
  onNavigate: (tab: TabId) => void
}
```

En `Trends`, eliminar el campo `total` (y su cálculo en el `useEffect`: quitar la línea `total: pctChange(...)` y la variable `totalTokens`).

Reemplazar el array `stats` completo por (firma con `onNavigate` en el destructuring del componente):

```tsx
  const stats = [
    {
      label: 'Tokens Input',
      value: formatNumber(inputTokens),
      accent: 'text-accent-cyan',
      delta: trends.input,
      sublabel: selectedProjectData
        ? `hit rate: ${(selectedProjectData.cacheHitRate * 100).toFixed(1)}%`
        : `caché: ${formatNumber(summary.tokens.cache)}`,
      onClick: () => onNavigate('costs'),
    },
    {
      label: 'Tokens Output',
      value: formatNumber(outputTokens),
      accent: 'text-accent-green',
      delta: trends.output,
      sublabel: `eficiencia: ${(summary.efficiency * 100).toFixed(1)}%`,
      onClick: () => onNavigate('costs'),
    },
    {
      label: 'Coste Total',
      value: formatCost(summary.cost),
      accent: 'text-accent-yellow',
      delta: trends.cost,
      sublabel: selectedProjectData ? `proyecto: ${formatCost(selectedProjectData.cost)}` : undefined,
      onClick: () => onNavigate('costs'),
    },
    {
      label: 'Sesiones',
      value: String(summary.sessions),
      accent: 'text-accent-purple',
      onClick: () => onNavigate('sessions'),
    },
    {
      label: 'Tiempo Activo',
      value: formatDuration(summary.activeTimeMs),
      accent: 'text-accent-blue',
      onClick: () => onNavigate('sessions'),
    },
    {
      label: 'Commits',
      value: String(summary.commits),
      accent: 'text-accent-orange',
      onClick: () => onNavigate('events'),
    },
  ]
```

Y el grid contenedor:

```tsx
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
```

- [ ] **Step 3: Verificar build (fallará en App.tsx por `onNavigate` — esperado)**

Run: `cd web && npm run build`
Expected: FAIL con error TS en `App.tsx` (falta `onNavigate` en `<StatsRow>`). Se resuelve en la tarea 9. **No commitear todavía.**

---

### Task 9: Overview como hub en App.tsx

**Files:**
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Importar los paneles del hub**

```tsx
import { RecentSessionsPanel } from './components/overview/RecentSessionsPanel'
import { TopProjectsPanel } from './components/overview/TopProjectsPanel'
import { RecentEventsPanel } from './components/overview/RecentEventsPanel'
import { CacheSavingsPanel } from './components/overview/CacheSavingsPanel'
```

- [ ] **Step 2: Reemplazar el bloque del Overview**

Sustituir el contenido de `{activeTab === 'overview' && (...)}` por:

```tsx
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-4">
            <ProjectSelector
              autoDetected={summary?.currentProject ?? null}
              userSelected={userSelectedProject}
              knownProjects={knownProjects}
              onChange={setUserSelectedProject}
            />
            {summary && (
              <StatsRow
                summary={summary}
                selectedProjectData={selectedProjectData}
                timeRange={timeRange}
                sseVersion={sseVersion}
                onNavigate={setActiveTab}
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <TokensChart compact timeRange={timeRange} sseVersion={sseVersion} />
              <CostChart compact timeRange={timeRange} sseVersion={sseVersion} />
              {summary && <CacheSavingsPanel summary={summary} />}
              <RecentSessionsPanel sseVersion={sseVersion} onViewAll={() => setActiveTab('sessions')} />
              <TopProjectsPanel timeRange={timeRange} sseVersion={sseVersion} onViewAll={() => setActiveTab('projects')} />
              <RecentEventsPanel sseVersion={sseVersion} onViewAll={() => setActiveTab('events')} />
            </div>
            <ActivityHeatmap sseVersion={sseVersion} />
          </div>
        )}
```

(El heatmap de actividad se conserva a ancho completo bajo el grid — no estaba en el grid 3×2 de la spec pero es funcionalidad existente que no se elimina.)

- [ ] **Step 3: Verificar build**

Run: `cd web && npm run build` — Expected: sin errores.

- [ ] **Step 4: Commit (incluye los cambios de stats de la tarea 8)**

```bash
git add web/src/App.tsx web/src/components/stats/StatCard.tsx web/src/components/stats/StatsRow.tsx
git commit -m "feat: Overview como hub — 6 KPIs clicables + grid 3x2 con paneles Ver todo"
```

---

### Task 10: Mini-KPIs por pestaña (TabStats)

**Files:**
- Create: `web/src/components/stats/TabStats.tsx`
- Modify: `web/src/components/tables/SessionsTable.tsx`
- Modify: `web/src/components/tables/ProjectsTable.tsx`
- Modify: `web/src/components/tables/ToolsTable.tsx`
- Modify: `web/src/components/tables/ModelsTable.tsx`
- Modify: `web/src/components/agents/AgentsList.tsx`
- Modify: `web/src/components/events/EventsFeed.tsx`

- [ ] **Step 1: Crear `TabStats.tsx`**

```tsx
export interface TabStat {
  label: string
  value: string
  accent?: string
}

export function TabStats({ stats }: { stats: TabStat[] }) {
  if (stats.length === 0) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
      {stats.map(s => (
        <div key={s.label} className="bg-bg-card border border-bg-border rounded-lg px-4 py-3">
          <div className="text-xs text-text-secondary uppercase tracking-wider mb-1">{s.label}</div>
          <div className={`text-xl font-mono font-bold ${s.accent ?? 'text-text-primary'}`}>{s.value}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: SessionsTable — añadir mini-KPIs**

Importar `TabStats` y, justo antes del `return` principal del componente, calcular:

```tsx
  const totalCost = sessions.reduce((s, x) => s + x.cost, 0)
  const avgDuration = sessions.length > 0
    ? sessions.reduce((s, x) => s + x.durationActiveMs, 0) / sessions.length
    : 0
```

Envolver el JSX del return principal en un fragment `<>...</>` con esto delante de la tabla:

```tsx
      <TabStats stats={[
        { label: 'Sesiones', value: String(sessions.length), accent: 'text-accent-purple' },
        { label: 'Coste total', value: formatCost(totalCost), accent: 'text-accent-yellow' },
        { label: 'Duración media', value: formatDuration(avgDuration), accent: 'text-accent-blue' },
      ]} />
```

- [ ] **Step 3: ProjectsTable — añadir mini-KPIs**

Mismo patrón con el estado `projects` (importar `TabStats`, y `formatCost` si no está importado):

```tsx
      <TabStats stats={[
        { label: 'Proyectos', value: String(projects.length), accent: 'text-accent-cyan' },
        { label: 'Coste total', value: formatCost(projects.reduce((s, p) => s + p.cost, 0)), accent: 'text-accent-yellow' },
        { label: 'Más caro', value: projects.length > 0 ? [...projects].sort((a, b) => b.cost - a.cost)[0].project : '—', accent: 'text-accent-orange' },
      ]} />
```

- [ ] **Step 4: ToolsTable — añadir mini-KPIs**

El estado es `data: ToolsData | null`. Tras el guard de datos vacíos:

```tsx
      <TabStats stats={[
        { label: 'Herramientas', value: String(data.usage.length), accent: 'text-accent-cyan' },
        { label: 'Invocaciones', value: formatNumber(data.usage.reduce((s, t) => s + t.count, 0)), accent: 'text-accent-green' },
        { label: 'Más usada', value: data.usage.length > 0 ? [...data.usage].sort((a, b) => b.count - a.count)[0].toolName : '—', accent: 'text-accent-purple' },
      ]} />
```

- [ ] **Step 5: ModelsTable — añadir mini-KPIs**

Con el estado `models`:

```tsx
      <TabStats stats={[
        { label: 'Modelos', value: String(models.length), accent: 'text-accent-cyan' },
        { label: 'Coste total', value: formatCost(models.reduce((s, m) => s + m.cost, 0)), accent: 'text-accent-yellow' },
        { label: 'Dominante', value: models.length > 0 ? [...models].sort((a, b) => b.cost - a.cost)[0].model : '—', accent: 'text-accent-purple' },
      ]} />
```

- [ ] **Step 6: AgentsList — añadir mini-KPIs**

Con el estado `agents`:

```tsx
      <TabStats stats={[
        { label: 'Agentes', value: String(agents.length), accent: 'text-accent-cyan' },
        { label: 'Tokens totales', value: formatNumber(agents.reduce((s, a) => s + a.tokensInput + a.tokensOutput, 0)), accent: 'text-accent-green' },
        { label: 'Más activo', value: agents.length > 0 ? [...agents].sort((a, b) => (b.tokensInput + b.tokensOutput) - (a.tokensInput + a.tokensOutput))[0].name : '—', accent: 'text-accent-purple' },
      ]} />
```

- [ ] **Step 7: EventsFeed — añadir mini-KPIs**

Con el estado `events` (sin filtrar) y `formatRelativeTime` importado de `../../utils/format`:

```tsx
      <TabStats stats={[
        { label: 'Eventos', value: formatNumber(events.length), accent: 'text-accent-cyan' },
        { label: 'Errores', value: String(events.filter(e => e.eventName.includes('error')).length), accent: 'text-accent-red' },
        { label: 'Último evento', value: events.length > 0 ? formatRelativeTime(events[0].timestamp) : '—', accent: 'text-accent-blue' },
      ]} />
```

Nota: en cada componente, si el return principal ya es un único `<div>`, envolver en `<>...</>` con TabStats delante. En todos los casos importar lo que falte de `../../utils/format`.

- [ ] **Step 8: Verificar build**

Run: `cd web && npm run build` — Expected: sin errores.

- [ ] **Step 9: Commit**

```bash
git add web/src/components/stats/TabStats.tsx web/src/components/tables/ web/src/components/agents/AgentsList.tsx web/src/components/events/EventsFeed.tsx
git commit -m "feat: mini-fila de KPIs propios en cada pestaña (TabStats)"
```

---

### Task 11: Auditoría de restos del tema viejo

**Files:**
- Modify: los que aparezcan en la auditoría (esperados: ninguno o pocos)

- [ ] **Step 1: Buscar colores hardcodeados del tema viejo en todo `web/src`**

Run: `grep -rn "#14191F\|#21262B\|#272d33\|#1a1a1a\|#888888\|#444444\|#ff6b35\|#0d0d0d\|#4da6ff\|#a855f7\|#fbbf24\|#00ff88" web/src/ --include="*.tsx" --include="*.ts" --include="*.css"`
Expected: sin resultados. Si aparece alguno, sustituirlo por el token equivalente de la paleta nueva (tabla de la tarea 1).

- [ ] **Step 2: Revisar clases de acento con semántica cambiada**

Run: `grep -rn "accent-green\|accent-orange" web/src/components/setup/ web/src/components/notifications/`
Revisar manualmente: donde `accent-green` se usaba como "color de marca naranja" (p. ej. CTAs del SetupGuide), decidir si queda mejor `accent-cyan`; donde indicaba éxito/positivo, dejar `accent-green`. Aplicar los cambios.

- [ ] **Step 3: Verificar build + commit (solo si hubo cambios)**

```bash
cd web && npm run build
git add web/src && git commit -m "fix: restos del tema viejo tras la auditoría de colores"
```

---

### Task 12: Verificación final, captura, CHANGELOG y versión

**Files:**
- Modify: `package.json` (versión)
- Modify: `CHANGELOG.md`
- Modify: `screenshots/tokenrace-dashboard.png`

- [ ] **Step 1: Build completo desde la raíz**

Run: `npm run build` (raíz del repo; compila `web/` hacia `dist/`)
Expected: sin errores.

- [ ] **Step 2: Servir el build local en el puerto 1338**

Run (en background): `TOKENRACE_PORT=1338 node bin/cli.js`
Expected: `Dashboard → http://localhost:1338`. (El 1337 lo ocupa la versión npm instalada — no usarlo.)

- [ ] **Step 3: Revisión visual de las 8 secciones (desktop)**

Abrir `http://localhost:1338` y verificar:
1. Sidebar lateral con 8 iconos, activo en cian con borde izquierdo
2. Overview: 6 KPIs clicables (navegan a Costs/Sessions/Events) + grid 3×2 + heatmap
3. "Ver todo →" de los 3 paneles de lista navega a su sección
4. Las 7 pestañas restantes: mini-KPIs arriba + contenido con la paleta nueva
5. Sin restos visuales del tema viejo (fondos negros puros, naranjas de marca)

- [ ] **Step 4: Revisión responsive (móvil)**

Con DevTools en viewport 390×844: barra inferior de iconos visible y funcional, grid del hub en 1 columna, KPIs en 2 columnas, contenido no tapado por la barra inferior.

- [ ] **Step 5: Captura actualizada**

Captura del Overview en desktop y guardarla como `screenshots/tokenrace-dashboard.png` (el usuario puede hacerla, o usar la herramienta de captura disponible).

- [ ] **Step 6: Versión y CHANGELOG**

En `package.json` (raíz): `"version": "0.2.3"` → `"0.3.0"` (cambio de aspecto mayor, sin breaking).
En `CHANGELOG.md`, añadir arriba:

```markdown
## 0.3.0 — 2026-06-11

- Rediseño visual completo estilo Dynatrace: paleta azul-marino con acento cian
- Sidebar de iconos (lateral en desktop, barra inferior en móvil) sustituye a las pestañas
- Overview como hub: 6 KPIs clicables + grid 3×2 con paneles "Ver todo →"
- Mini-fila de KPIs propios en cada pestaña
- Gráficas recharts con tema compartido de la paleta nueva
```

- [ ] **Step 7: Tests del servidor (regresión)**

Run: `npm test` (raíz)
Expected: PASS (el rediseño no toca `src/`, pero se verifica igualmente).

- [ ] **Step 8: Commit final y push**

```bash
git add package.json CHANGELOG.md screenshots/tokenrace-dashboard.png
git commit -m "chore: bump versión a 0.3.0 — rediseño visual estilo Dynatrace"
git push origin main
```

- [ ] **Step 9: Parar el servidor de prueba del puerto 1338**
