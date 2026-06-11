import { useState, useEffect } from 'react'
import { api } from '../../api'
import { formatNumber } from '../../utils/format'
import { TabStats } from '../stats/TabStats'
import type { ToolsData, TimeRange } from '../../types'

interface ToolsTableProps {
  timeRange: TimeRange
  sseVersion: number
}

export function ToolsTable({ timeRange, sseVersion }: ToolsTableProps) {
  const [data, setData] = useState<ToolsData | null>(null)

  useEffect(() => {
    api.tools(timeRange).then(setData).catch(() => {})
  }, [timeRange, sseVersion])

  if (!data || data.usage.length === 0) {
    return <div className="text-text-muted text-sm p-4">Sin datos de herramientas</div>
  }

  const maxCount = Math.max(...data.usage.map(t => t.count), 1)
  const total = data.decisionRate.approved + data.decisionRate.rejected
  const approvalRate = total > 0 ? (data.decisionRate.approved / total * 100).toFixed(1) : '—'

  return (
    <div className="flex flex-col gap-4">
      <TabStats stats={[
        { label: 'Herramientas', value: String(data.usage.length), accent: 'text-accent-cyan' },
        { label: 'Invocaciones', value: formatNumber(data.usage.reduce((s, t) => s + t.count, 0)), accent: 'text-accent-green' },
        { label: 'Más usada', value: data.usage.length > 0 ? [...data.usage].sort((a, b) => b.count - a.count)[0].toolName : '—', accent: 'text-accent-purple' },
      ]} />

      <div className="bg-bg-card border border-bg-border rounded-lg p-4">
        <span className="text-text-secondary text-sm">Tasa de aprobación: </span>
        <span className="text-accent-green font-mono font-bold">{approvalRate}%</span>
        <span className="text-text-muted text-xs ml-2">
          ({data.decisionRate.approved} aprobadas / {data.decisionRate.rejected} rechazadas)
        </span>
      </div>

      <div className="bg-bg-card border border-bg-border rounded-lg p-4 space-y-2">
        {data.usage.map(tool => (
          <div key={tool.toolName}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-mono text-text-primary">{tool.toolName}</span>
              <span className="text-text-secondary">
                {tool.count} usos · {(tool.successRate * 100).toFixed(0)}% éxito
              </span>
            </div>
            <div className="h-1.5 bg-bg-base rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-teal rounded-full"
                style={{ width: `${(tool.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
