import { useState, useCallback } from 'react'
import { Header } from './components/layout/Header'
import { TabBar } from './components/layout/TabBar'
import { useTimeRange } from './hooks/useTimeRange'
import { useMetrics } from './hooks/useMetrics'
import { api } from './api'
import type { TabId } from './types'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const { timeRange, setTimeRange } = useTimeRange()
  const { status, summary, refetch } = useMetrics(timeRange)

  const handleReset = useCallback(async () => {
    await api.reset()
    refetch()
  }, [refetch])

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      <Header
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        connected={status.connected}
        lastSeen={status.lastSeen}
        onReset={handleReset}
      />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 p-4">
        {/* Contenido de cada tab — se rellenará en Fases 5-7 */}
        <div className="text-text-secondary text-sm font-mono">
          Tab: {activeTab} | Rango: {timeRange} | Sesiones: {status.sessionCount}
          {summary && (
            <div>Cost: ${summary.cost.toFixed(4)} | Tokens: {summary.tokens.input.toLocaleString()} in / {summary.tokens.output.toLocaleString()} out</div>
          )}
        </div>
      </main>
    </div>
  )
}
