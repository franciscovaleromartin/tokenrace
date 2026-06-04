import { useState, useCallback, useEffect } from 'react'
import { Header } from './components/layout/Header'
import { TabBar } from './components/layout/TabBar'
import { SetupGuide } from './components/setup/SetupGuide'
import { SessionLabelNotification } from './components/notifications/SessionLabelNotification'
import { StatsRow } from './components/stats/StatsRow'
import { TokensChart } from './components/charts/TokensChart'
import { CostChart } from './components/charts/CostChart'
import { CacheChart } from './components/charts/CacheChart'
import { EfficiencyChart } from './components/charts/EfficiencyChart'
import { SessionsTable } from './components/tables/SessionsTable'
import { ProjectsTable } from './components/tables/ProjectsTable'
import { ToolsTable } from './components/tables/ToolsTable'
import { EventsFeed } from './components/events/EventsFeed'
import { AgentsTree } from './components/agents/AgentsTree'
import { useTimeRange } from './hooks/useTimeRange'
import { useMetrics } from './hooks/useMetrics'
import { api } from './api'
import { formatCost, formatNumber } from './utils/format'
import { estimateCacheSavings } from './utils/prices'
import type { TabId } from './types'

interface ProjectSelectorProps {
  autoDetected: string | null
  userSelected: string | null
  knownProjects: string[]
  onChange: (project: string | null) => void
}

function ProjectSelector({ autoDetected, userSelected, knownProjects, onChange }: ProjectSelectorProps) {
  const effective = userSelected ?? autoDetected
  if (!effective && knownProjects.length === 0) return null

  // Opciones únicas: proyectos conocidos + el efectivo si no está en la lista
  const options = [...new Set([...knownProjects, ...(effective ? [effective] : [])])]
  if (options.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted uppercase tracking-wider">Proyecto</span>
      <select
        value={effective ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="bg-bg-card border border-bg-border rounded px-2 py-0.5 text-lg font-semibold text-text-primary outline-none focus:border-accent-green cursor-pointer"
      >
        {options.map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      {userSelected && userSelected !== autoDetected && (
        <button
          onClick={() => onChange(null)}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          title="Volver al proyecto auto-detectado"
        >
          ↩ auto
        </button>
      )}
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const { timeRange, setTimeRange } = useTimeRange()
  const { status, summary, refetch, sseVersion } = useMetrics(timeRange)
  const [userSelectedProject, setUserSelectedProject] = useState<string | null>(null)
  const [knownProjects, setKnownProjects] = useState<string[]>([])

  useEffect(() => {
    api.projects().then(ps => setKnownProjects(ps.map(p => p.project))).catch(() => {})
  }, [sseVersion])

  const handleReset = useCallback(async () => {
    await api.reset()
    refetch()
  }, [refetch])

  // Si nunca han llegado datos, mostrar SetupGuide
  if (!status.connected && status.totalEvents === 0) {
    return (
      <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
        <Header
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          connected={false}
          lastSeen={null}
          onReset={handleReset}
        />
        <SetupGuide />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      <Header
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        connected={status.connected}
        lastSeen={status.lastSeen}
        onReset={handleReset}
      />

      {/* Zona de notificaciones — solo aparece si hay sesiones sin etiquetar */}
      <SessionLabelNotification onLabeled={refetch} />

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 p-4 max-w-screen-2xl mx-auto w-full">

        {activeTab === 'overview' && (
          <div className="flex flex-col gap-4">
            <ProjectSelector
              autoDetected={summary?.currentProject ?? null}
              userSelected={userSelectedProject}
              knownProjects={knownProjects}
              onChange={setUserSelectedProject}
            />
            {summary && <StatsRow summary={summary} />}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TokensChart timeRange={timeRange} sseVersion={sseVersion} />
              <CostChart timeRange={timeRange} sseVersion={sseVersion} />
            </div>
          </div>
        )}

        {activeTab === 'sessions' && <SessionsTable timeRange={timeRange} sseVersion={sseVersion} />}
        {activeTab === 'projects' && <ProjectsTable timeRange={timeRange} sseVersion={sseVersion} />}
        {activeTab === 'tools'    && <ToolsTable timeRange={timeRange} sseVersion={sseVersion} />}
        {activeTab === 'agents'   && <AgentsTree sseVersion={sseVersion} />}
        {activeTab === 'events'   && <EventsFeed timeRange={timeRange} sseVersion={sseVersion} />}

        {activeTab === 'costs' && (
          <div className="flex flex-col gap-4">
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-bg-card border border-bg-border rounded-lg p-4">
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Coste período</div>
                  <div className="text-2xl font-mono font-bold text-accent-purple">{formatCost(summary.cost)}</div>
                </div>
                <div className="bg-bg-card border border-bg-border rounded-lg p-4">
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Eficiencia</div>
                  <div className="text-2xl font-mono font-bold text-accent-green">{(summary.efficiency * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-bg-card border border-bg-border rounded-lg p-4">
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Tokens caché</div>
                  <div className="text-2xl font-mono font-bold text-accent-teal">{formatNumber(summary.tokens.cache)}</div>
                </div>
                <div className="bg-bg-card border border-bg-border rounded-lg p-4">
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Ahorro caché est.</div>
                  <div className="text-2xl font-mono font-bold text-accent-yellow">{formatCost(estimateCacheSavings(summary.tokens.cache))}</div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CacheChart timeRange={timeRange} sseVersion={sseVersion} />
              <EfficiencyChart timeRange={timeRange} sseVersion={sseVersion} />
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
