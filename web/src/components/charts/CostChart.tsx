import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  ResponsiveContainer
} from 'recharts'
import { api } from '../../api'
import { useState, useEffect, useMemo } from 'react'
import type { TimeRange, TimeseriesByProjectPoint } from '../../types'
import { CHART_GRID, CHART_TEXT, CHART_TICK, PROJECT_COLORS } from '../../utils/chartTheme'

interface CostChartProps {
  timeRange: TimeRange
  sseVersion: number
  compact?: boolean
}

function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export function CostChart({ timeRange, sseVersion, compact = false }: CostChartProps) {
  const [data, setData] = useState<TimeseriesByProjectPoint[]>([])

  useEffect(() => {
    api.timeseriesByProject('claude_code.cost', timeRange, '1d')
      .then(setData)
      .catch(() => {})
  }, [timeRange, sseVersion])

  const projects = useMemo(() => {
    const set = new Set<string>()
    for (const p of data) Object.keys(p.projects).forEach(k => set.add(k))
    return Array.from(set).sort()
  }, [data])

  const chartData = useMemo(() => data.map(p => ({
    label: formatDay(p.timestamp),
    ...Object.fromEntries(
      projects.map(proj => [proj, Number((p.projects[proj] ?? 0).toFixed(4))])
    ),
  })), [data, projects])

  if (chartData.length === 0) {
    return (
      <div className={`bg-bg-card border border-bg-border rounded-lg p-6 flex items-center justify-center ${compact ? 'h-full min-h-[180px]' : 'h-48'}`}>
        <span className="text-text-muted text-sm">Sin datos de coste</span>
      </div>
    )
  }

  const total = (payload: Record<string, unknown>) =>
    projects.reduce((s, p) => s + Number(payload[p] ?? 0), 0)

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-text-secondary mb-4">Coste por día ($)</h3>
      <ResponsiveContainer width="100%" height={compact ? 140 : 220}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={CHART_TICK}
            tickLine={false}
            axisLine={{ stroke: CHART_GRID }}
          />
          <YAxis
            tick={CHART_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          />
          {!compact && (
            <Legend
              wrapperStyle={{ fontSize: 11, color: CHART_TEXT, paddingTop: 8 }}
              iconType="square"
              iconSize={8}
            />
          )}
          {projects.map((proj, i) => (
            <Bar
              key={proj}
              dataKey={proj}
              stackId="cost"
              fill={PROJECT_COLORS[i % PROJECT_COLORS.length]}
              radius={i === projects.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      {compact && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {projects.map((proj, i) => (
            <div key={proj} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: PROJECT_COLORS[i % PROJECT_COLORS.length] }}
              />
              <span className="text-xs text-text-muted truncate">{proj}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
