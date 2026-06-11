import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from '../../api'
import type { TimeRange, TimeseriesPoint } from '../../types'
import { CHART_GRID, CHART_TICK, CHART_TOOLTIP_STYLE, COLOR_INPUT } from '../../utils/chartTheme'

export function CacheChart({ timeRange, sseVersion }: { timeRange: TimeRange; sseVersion: number }) {
  const [readData, setReadData]     = useState<TimeseriesPoint[]>([])
  const [createData, setCreateData] = useState<TimeseriesPoint[]>([])

  useEffect(() => {
    const bucket = timeRange === 'now-24h' ? '1h' : '1d'
    Promise.all([
      api.timeseries('claude_code.tokens.cache.read',     timeRange, bucket),
      api.timeseries('claude_code.tokens.cache.creation', timeRange, bucket),
    ]).then(([read, create]) => { setReadData(read); setCreateData(create) }).catch(() => {})
  }, [timeRange, sseVersion])

  const tsSet = new Set([...readData.map(p => p.timestamp), ...createData.map(p => p.timestamp)])
  const readMap   = new Map(readData.map(p   => [p.timestamp, p.value]))
  const createMap = new Map(createData.map(p => [p.timestamp, p.value]))
  const data = Array.from(tsSet).sort().map(ts => ({
    label: new Date(ts).toLocaleString('es', { hour: '2-digit', day: 'numeric', month: 'short' }),
    read:   readMap.get(ts)   ?? 0,
    create: createMap.get(ts) ?? 0,
  }))

  if (data.length === 0) {
    return (
      <div className="bg-bg-card border border-bg-border rounded-lg p-6 flex items-center justify-center h-48">
        <span className="text-text-muted text-sm">Sin datos de caché</span>
      </div>
    )
  }

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-text-secondary mb-4">Tokens de caché</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey="label" tick={CHART_TICK} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
          <YAxis tick={CHART_TICK} tickLine={false} axisLine={false}
            tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#8fa3b0' }} />
          <Area type="monotone" dataKey="read"   name="Leído"  stroke="#00d4aa" fill="#00d4aa" fillOpacity={0.2} strokeWidth={2} />
          <Area type="monotone" dataKey="create" name="Creado" stroke={COLOR_INPUT} fill={COLOR_INPUT} fillOpacity={0.2} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
