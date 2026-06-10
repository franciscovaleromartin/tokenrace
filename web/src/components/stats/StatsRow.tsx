import { useState, useEffect } from 'react'
import { StatCard } from './StatCard'
import { formatNumber, formatCost, formatDuration } from '../../utils/format'
import { api } from '../../api'
import type { Summary, Project, TimeRange, TimeseriesPoint } from '../../types'

interface StatsRowProps {
  summary: Summary
  selectedProjectData: Project | null
  timeRange: TimeRange
  sseVersion: number
}

interface Trends {
  input?: number
  output?: number
  total?: number
  cost?: number
}

// Ventana doble para comparar con el período anterior equivalente.
// "all" no tiene período anterior, así que no lleva delta.
const PREV_WINDOW: Partial<Record<TimeRange, { from: string; bucket: string; ms: number }>> = {
  'now-24h': { from: 'now-48h', bucket: '1h', ms: 86_400_000 },
  'now-7d':  { from: 'now-14d', bucket: '1d', ms: 7 * 86_400_000 },
  'now-30d': { from: 'now-60d', bucket: '1d', ms: 30 * 86_400_000 },
}

function splitSums(points: TimeseriesPoint[], boundary: number): [number, number] {
  let prev = 0
  let cur = 0
  for (const p of points) {
    if (p.timestamp >= boundary) cur += p.value
    else prev += p.value
  }
  return [prev, cur]
}

function pctChange(prev: number, cur: number): number | undefined {
  if (prev <= 0) return undefined
  return ((cur - prev) / prev) * 100
}

export function StatsRow({ summary, selectedProjectData, timeRange, sseVersion }: StatsRowProps) {
  const [trends, setTrends] = useState<Trends>({})

  useEffect(() => {
    const win = PREV_WINDOW[timeRange]
    if (!win) {
      setTrends({})
      return
    }
    const boundary = Date.now() - win.ms
    Promise.all([
      api.timeseries('claude_code.tokens.input',  win.from, win.bucket),
      api.timeseries('claude_code.tokens.output', win.from, win.bucket),
      api.timeseries('claude_code.cost',          win.from, win.bucket),
    ]).then(([input, output, cost]) => {
      const [pi, ci] = splitSums(input, boundary)
      const [po, co] = splitSums(output, boundary)
      const [pc, cc] = splitSums(cost, boundary)
      setTrends({
        input:  pctChange(pi, ci),
        output: pctChange(po, co),
        total:  pctChange(pi + po, ci + co),
        cost:   pctChange(pc, cc),
      })
    }).catch(() => setTrends({}))
  }, [timeRange, sseVersion])

  const inputTokens  = selectedProjectData?.tokensInput  ?? summary.tokens.input
  const outputTokens = selectedProjectData?.tokensOutput ?? summary.tokens.output
  const totalTokens  = summary.tokens.input + summary.tokens.output

  const stats = [
    {
      label: 'Tokens Input',
      value: formatNumber(inputTokens),
      accent: 'text-accent-blue',
      delta: trends.input,
      sublabel: selectedProjectData
        ? `hit rate: ${(selectedProjectData.cacheHitRate * 100).toFixed(1)}%`
        : `caché: ${formatNumber(summary.tokens.cache)}`
    },
    {
      label: 'Tokens Output',
      value: formatNumber(outputTokens),
      accent: 'text-accent-green',
      delta: trends.output,
      sublabel: `eficiencia: ${(summary.efficiency * 100).toFixed(1)}%`
    },
    {
      label: 'Token total',
      value: formatNumber(totalTokens),
      accent: 'text-accent-teal',
      delta: trends.total,
      sublabel: `i: ${formatNumber(summary.tokens.input)} / o: ${formatNumber(summary.tokens.output)}`
    },
    {
      label: 'Coste de proyecto',
      value: selectedProjectData ? formatCost(selectedProjectData.cost) : '—',
      accent: 'text-accent-orange',
    },
    {
      label: 'Coste Total',
      value: formatCost(summary.cost),
      accent: 'text-accent-purple',
      delta: trends.cost,
    },
    {
      label: 'Tiempo Activo',
      value: formatDuration(summary.activeTimeMs),
      accent: 'text-text-secondary',
    },
    {
      label: 'Sesiones',
      value: String(summary.sessions),
      accent: 'text-text-primary',
    },
    {
      label: 'Commits',
      value: String(summary.commits),
      accent: 'text-accent-yellow',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(stat => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}
