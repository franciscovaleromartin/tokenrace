import { useState, useCallback } from 'react'
import { Header } from './components/layout/Header'
import { TabBar } from './components/layout/TabBar'
import { StatsRow } from './components/stats/StatsRow'
import { TokensChart } from './components/charts/TokensChart'
import { CostChart } from './components/charts/CostChart'
import { useTimeRange } from './hooks/useTimeRange'
import { useMetrics } from './hooks/useMetrics'
import { api } from './api'
import type { TabId } from './types'

function TabPlaceholder({ tab }: { tab: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <span className="text-text-muted font-mono text-sm">Tab {tab} — próximamente</span>
    </div>
  )
}

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

      <main className="flex-1 p-4 max-w-screen-2xl mx-auto w-full">
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-4">
            {summary && <StatsRow summary={summary} />}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TokensChart timeRange={timeRange} />
              <CostChart timeRange={timeRange} />
            </div>
          </div>
        )}
        {activeTab !== 'overview' && <TabPlaceholder tab={activeTab} />}
      </main>
    </div>
  )
}
