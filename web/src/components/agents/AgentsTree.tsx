import { useState, useEffect } from 'react'
import { api } from '../../api'
import { formatCost, formatNumber, formatDuration } from '../../utils/format'
import type { Agent } from '../../types'

export function AgentsTree({ sseVersion }: { sseVersion: number }) {
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    api.agents().then(setAgents).catch(() => {})
  }, [sseVersion])

  if (agents.length === 0) {
    return (
      <div className="bg-bg-card border border-bg-border rounded-lg p-8 flex items-center justify-center">
        <span className="text-text-muted text-sm">
          Sin datos de agentes. Aparece cuando hay múltiples agentes en trazas OTLP.
        </span>
      </div>
    )
  }

  const roots = agents.filter(a => !a.parentAgentId)
  const childrenOf = (id: string) => agents.filter(a => a.parentAgentId === id)

  function AgentNode({ agent, depth = 0 }: { agent: Agent; depth?: number }) {
    const children = childrenOf(agent.agentId)
    return (
      <div style={{ paddingLeft: `${depth * 16}px` }}>
        <div className="flex items-center gap-4 py-2 border-b border-bg-border text-sm hover:bg-bg-card-hover px-2">
          <span className="font-mono text-text-muted text-xs w-20 shrink-0">{agent.agentId.slice(0, 8)}…</span>
          <span className="font-mono text-accent-blue">{formatNumber(agent.tokensInput)}</span>
          <span className="font-mono text-accent-green">{formatNumber(agent.tokensOutput)}</span>
          <span className="font-mono text-accent-purple">{formatCost(agent.cost)}</span>
          <span className="text-text-secondary">{formatDuration(agent.durationMs)}</span>
          <span className="text-text-muted text-xs">{agent.toolCalls} tools</span>
        </div>
        {children.map(child => (
          <AgentNode key={child.agentId} agent={child} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-bg-border grid grid-cols-6 text-xs text-text-muted">
        <span>Agent ID</span><span>Input</span><span>Output</span>
        <span>Coste</span><span>Duración</span><span>Tools</span>
      </div>
      {roots.map(agent => <AgentNode key={agent.agentId} agent={agent} />)}
    </div>
  )
}
