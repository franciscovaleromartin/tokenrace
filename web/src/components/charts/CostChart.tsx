import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { api } from '../../api'
import { useState, useEffect, useMemo } from 'react'
import type { TimeRange, TimeseriesByProjectPoint } from '../../types'

interface CostChartProps {
  timeRange: TimeRange
  sseVersion: number
}

const PROJECT_COLORS = [
  '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#8b5cf6',
]

function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export function CostChart({ timeRange, sseVersion }: CostChartProps) {
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

  const chartData = data.map(p => ({
    label: formatDay(p.timestamp),
    ...Object.fromEntries(
      projects.map(proj => [proj, Number((p.projects[proj] ?? 0).toFixed(4))])
    ),
  }))

  if (chartData.length === 0) {
    return (
      <div className="bg-bg-card border border-bg-border rounded-lg p-6 flex items-center justify-center h-48">
        <span className="text-text-muted text-sm">Sin datos de coste</span>
      </div>
    )
  }

  const total = (payload: Record<string, unknown>) =>
    projects.reduce((s, p) => s + Number(payload[p] ?? 0), 0)

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-text-secondary mb-4">Coste por día ($)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#888888', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#1a1a1a' }}
          />
          <YAxis
            tick={{ fill: '#888888', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '6px' }}
            labelStyle={{ color: '#888888', fontSize: 12 }}
            formatter={(v: number, name: string) => [`$${v.toFixed(4)}`, name]}
            itemSorter={(item) => -(item.value as number)}
          />
          {projects.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#888888', paddingTop: 8 }}
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
    </div>
  )
}
