import { useState, useEffect } from 'react'
import { api } from '../../api'
import { formatNumber, formatCost } from '../../utils/format'
import type { ModelStats } from '../../types'

interface ModelsTableProps {
  sseVersion: number
}

export function ModelsTable({ sseVersion }: ModelsTableProps) {
  const [models, setModels] = useState<ModelStats[]>([])

  useEffect(() => {
    api.models().then(setModels).catch(() => {})
  }, [sseVersion])

  if (models.length === 0) {
    return <div className="text-text-muted text-sm p-4">Sin datos de modelos</div>
  }

  const maxCost = Math.max(...models.map(m => m.cost), 0.000001)

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4">
      <div className="flex justify-between items-baseline mb-4">
        <h3 className="text-sm font-medium text-text-secondary">Coste por modelo</h3>
        <span className="text-xs text-text-muted">acumulado total</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-text-muted uppercase tracking-wider text-left">
            <th className="pb-2 font-medium">Modelo</th>
            <th className="pb-2 font-medium text-right">Requests</th>
            <th className="pb-2 font-medium text-right">Tokens In</th>
            <th className="pb-2 font-medium text-right">Tokens Out</th>
            <th className="pb-2 font-medium text-right">Coste</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
