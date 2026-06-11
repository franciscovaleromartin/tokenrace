import { useState, useEffect } from 'react'
import { api } from '../../api'
import { formatCost, formatNumber } from '../../utils/format'
import { HubPanel } from './HubPanel'
import type { Session } from '../../types'

interface RecentSessionsPanelProps {
  sseVersion: number
  onViewAll: () => void
}

export function RecentSessionsPanel({ sseVersion, onViewAll }: RecentSessionsPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    api.sessions(3).then(setSessions).catch(() => {})
  }, [sseVersion])

  return (
    <HubPanel title="Sesiones recientes" onViewAll={onViewAll}>
      {sessions.length === 0 ? (
        <span className="text-xs text-text-muted">Sin sesiones</span>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map(s => (
            <li key={s.sessionId} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-text-primary truncate">
                <span className="text-accent-cyan">●</span> {s.project ?? 'sin proyecto'}
              </span>
              <span className="font-mono text-text-secondary whitespace-nowrap">
                {formatCost(s.cost)} · {formatNumber(s.tokensInput + s.tokensOutput)} tok
              </span>
            </li>
          ))}
        </ul>
      )}
    </HubPanel>
  )
}
