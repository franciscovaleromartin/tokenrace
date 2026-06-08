import { useState, useEffect } from 'react'
import { api } from '../../api'
import { formatCost, formatNumber } from '../../utils/format'
import type { Agent } from '../../types'

export function AgentsList({ sseVersion }: { sseVersion: number }) {
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    api.agents().then(setAgents).catch(() => {})
  }, [sseVersion])

  if (agents.length === 0) {
    return (
      <div className="bg-bg-card border border-bg-border rounded-lg p-8 flex items-center justify-center">
        <span className="text-text-muted text-sm">
          Sin datos de agentes. Aparece cuando Claude Code delega tareas a subagentes (herramienta Task).
        </span>
      </div>
    )
  }

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-bg-border grid grid-cols-4 text-xs text-text-muted">
        <span>Agente</span><span>Input</span><span>Output</span><span>Coste</span>
      </div>
      {agents.map(agent => (
        <div key={agent.name} className="grid grid-cols-4 items-center py-2 border-b border-bg-border text-sm hover:bg-bg-card-hover px-3">
          <span className="text-text-secondary">{agent.name}</span>
          <span className="font-mono text-accent-blue">{formatNumber(agent.tokensInput)}</span>
          <span className="font-mono text-accent-green">{formatNumber(agent.tokensOutput)}</span>
          <span className="font-mono text-accent-purple">{formatCost(agent.cost)}</span>
        </div>
      ))}
    </div>
  )
}
