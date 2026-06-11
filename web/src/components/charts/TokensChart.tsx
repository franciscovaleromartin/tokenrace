import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts'
import { api } from '../../api'
import { useState, useEffect } from 'react'
import type { TimeRange, TimeseriesPoint } from '../../types'
import { CHART_GRID, CHART_TICK, CHART_TOOLTIP_STYLE, COLOR_INPUT, COLOR_OUTPUT } from '../../utils/chartTheme'

interface TokensChartProps {
  timeRange: TimeRange
  sseVersion: number
}

function formatLabel(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleString('es', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
}

export function TokensChart({ timeRange, sseVersion }: TokensChartProps) {
  const [inputData, setInputData]   = useState<TimeseriesPoint[]>([])
  const [outputData, setOutputData] = useState<TimeseriesPoint[]>([])

  useEffect(() => {
    const bucket = timeRange === 'now-24h' ? '1h' : '1d'
    Promise.all([
      api.timeseries('claude_code.tokens.input',  timeRange, bucket),
      api.timeseries('claude_code.tokens.output', timeRange, bucket),
    ]).then(([input, output]) => {
      setInputData(input)
      setOutputData(output)
    }).catch(() => {})
  }, [timeRange, sseVersion])

  // Combinar timestamps
  const tsSet = new Set([
    ...inputData.map(p => p.timestamp),
    ...outputData.map(p => p.timestamp)
  ])
  const inputMap  = new Map(inputData.map(p  => [p.timestamp, p.value]))
  const outputMap = new Map(outputData.map(p => [p.timestamp, p.value]))

  const data = Array.from(tsSet).sort().map(ts => ({
    ts,
    label: formatLabel(ts),
    input:  inputMap.get(ts)  ?? 0,
    output: outputMap.get(ts) ?? 0,
  }))

  if (data.length === 0) {
    return (
      <div className="bg-bg-card border border-bg-border rounded-lg p-6 flex items-center justify-center h-48">
        <span className="text-text-muted text-sm">Sin datos de tokens</span>
      </div>
    )
  }

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-text-secondary mb-4">Tokens por período</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={COLOR_INPUT} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLOR_INPUT} stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={COLOR_OUTPUT} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLOR_OUTPUT} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
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
            tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={{ color: '#8fa3b0', fontSize: 12 }}
            itemStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#8fa3b0' }} />
          <Area
            type="monotone"
            dataKey="input"
            name="Input"
            stroke={COLOR_INPUT}
            fill="url(#colorInput)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="output"
            name="Output"
            stroke={COLOR_OUTPUT}
            fill="url(#colorOutput)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
