import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import { api } from '../../api'
import { useState, useEffect } from 'react'
import type { TimeRange, TimeseriesPoint } from '../../types'

interface CostChartProps {
  timeRange: TimeRange
}

function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export function CostChart({ timeRange }: CostChartProps) {
  const [data, setData] = useState<TimeseriesPoint[]>([])

  useEffect(() => {
    api.timeseries('claude_code.cost', timeRange, '1d')
      .then(setData)
      .catch(() => {})
  }, [timeRange])

  const chartData = data.map(p => ({
    label: formatDay(p.timestamp),
    cost: Number(p.value.toFixed(4)),
  }))

  if (chartData.length === 0) {
    return (
      <div className="bg-bg-card border border-bg-border rounded-lg p-6 flex items-center justify-center h-48">
        <span className="text-text-muted text-sm">Sin datos de coste</span>
      </div>
    )
  }

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
            tickFormatter={(v: number) => `$${v.toFixed(3)}`}
          />
          <Tooltip
            contentStyle={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '6px' }}
            labelStyle={{ color: '#888888', fontSize: 12 }}
            formatter={(v: number) => [`$${v.toFixed(4)}`, 'Coste']}
          />
          <Bar dataKey="cost" fill="#a855f7" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
