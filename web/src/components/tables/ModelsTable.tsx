import { useState, useEffect } from 'react'
import { api } from '../../api'
import { formatNumber, formatCost } from '../../utils/format'
import { TabStats } from '../stats/TabStats'
import type { ModelStats, TimeRange } from '../../types'

interface ModelsTableProps {
  timeRange: TimeRange
  sseVersion: number
}

const RANGE_LABEL: Record<TimeRange, string> = {
  'now-24h': 'últimas 24 h',
  'now-7d':  'últimos 7 días',
  'now-30d': 'últimos 30 días',
  'all':     'acumulado total',
}

export function ModelsTable({ timeRange, sseVersion }: ModelsTableProps) {
  const [models, setModels] = useState<ModelStats[]>([])

  useEffect(() => {
    api.models(timeRange).then(setModels).catch(() => {})
  }, [timeRange, sseVersion])

  if (models.length === 0) {
    return <div className="text-text-muted text-sm p-4">Sin datos de modelos</div>
  }

  const maxCost   = Math.max(...models.map(m => m.cost), 0.000001)
  const totalCost = models.reduce((acc, m) => acc + m.cost, 0)

  return (
    <>
      <TabStats stats={[
        { label: 'Modelos', value: String(models.length), accent: 'text-accent-cyan' },
        { label: 'Coste total', value: formatCost(models.reduce((s, m) => s + m.cost, 0)), accent: 'text-accent-yellow' },
        { label: 'Dominante', value: models.length > 0 ? [...models].sort((a, b) => b.cost - a.cost)[0].model : '—', accent: 'text-accent-purple' },
      ]} />

      <div className="bg-bg-card border border-bg-border rounded-lg p-4">
      <div className="flex justify-between items-baseline mb-4">
        <h3 className="text-sm font-medium text-text-secondary">Coste por modelo</h3>
        <span className="text-xs text-text-muted">{RANGE_LABEL[timeRange]}</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-text-muted uppercase tracking-wider text-left">
            <th className="pb-2 font-medium">Modelo</th>
            <th className="pb-2 font-medium text-right">Requests</th>
            <th className="pb-2 font-medium text-right">Tokens In</th>
            <th className="pb-2 font-medium text-right">Tokens Out</th>
            <th className="pb-2 font-medium text-right">Coste</th>
            <th className="pb-2 font-medium text-right">% gasto</th>
          </tr>
        </thead>
        <tbody>
          {models.map(m => (
            <tr key={m.model} className="border-t border-bg-border">
              <td className="py-2 pr-4">
                <div className="font-mono text-text-primary">{m.model}</div>
                <div className="h-1.5 bg-bg-base rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-accent-purple rounded-full"
                    style={{ width: `${(m.cost / maxCost) * 100}%` }}
                  />
                </div>
              </td>
              <td className="py-2 text-right font-mono text-text-secondary">{m.requests}</td>
              <td className="py-2 text-right font-mono text-accent-blue">{formatNumber(m.tokensInput)}</td>
              <td className="py-2 text-right font-mono text-accent-green">{formatNumber(m.tokensOutput)}</td>
              <td className="py-2 text-right font-mono font-bold text-accent-purple">{formatCost(m.cost)}</td>
              <td className="py-2 text-right font-mono text-text-secondary">
                {totalCost > 0 ? `${((m.cost / totalCost) * 100).toFixed(1)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  )
}
