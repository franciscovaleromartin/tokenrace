import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { api } from '../../api'
import type { TimeRange, TimeseriesPoint } from '../../types'

export function EfficiencyChart({ timeRange }: { timeRange: TimeRange }) {
  const [inputData, setInputData]   = useState<TimeseriesPoint[]>([])
  const [outputData, setOutputData] = useState<TimeseriesPoint[]>([])

  useEffect(() => {
    const bucket = timeRange === 'now-24h' ? '1h' : '1d'
    Promise.all([
      api.timeseries('claude_code.tokens.input',  timeRange, bucket),
      api.timeseries('claude_code.tokens.output', timeRange, bucket),
    ]).then(([input, output]) => { setInputData(input); setOutputData(output) }).catch(() => {})
  }, [timeRange])

  const tsSet    = new Set([...inputData.map(p => p.timestamp), ...outputData.map(p => p.timestamp)])
  const inputMap  = new Map(inputData.map(p  => [p.timestamp, p.value]))
  const outputMap = new Map(outputData.map(p => [p.timestamp, p.value]))
  const data = Array.from(tsSet).sort().map(ts => {
    const inp = inputMap.get(ts) ?? 0
    const out = outputMap.get(ts) ?? 0
    return {
      label: new Date(ts).toLocaleString('es', { hour: '2-digit', day: 'numeric', month: 'short' }),
      efficiency: inp > 0 ? Number((out / inp).toFixed(3)) : 0,
    }
  })

  if (data.length === 0) {
    return (
      <div className="bg-bg-card border border-bg-border rounded-lg p-6 flex items-center justify-center h-48">
        <span className="text-text-muted text-sm">Sin datos de eficiencia</span>
      </div>
    )
  }

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-text-secondary mb-4">Ratio output/input</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
          <XAxis dataKey="label" tick={{ fill: '#888888', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#1a1a1a' }} />
          <YAxis tick={{ fill: '#888888', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 'auto']} />
          <Tooltip
            contentStyle={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '6px' }}
            formatter={(v: number) => [v.toFixed(3), 'Eficiencia']}
          />
          <ReferenceLine y={0.5} stroke="#444444" strokeDasharray="4 4"
            label={{ value: '0.5', fill: '#666', fontSize: 10 }} />
          <Line type="monotone" dataKey="efficiency" stroke="#a855f7" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
