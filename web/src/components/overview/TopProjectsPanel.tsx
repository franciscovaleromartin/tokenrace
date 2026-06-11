import { useState, useEffect } from 'react'
import { api } from '../../api'
import { formatCost } from '../../utils/format'
import { HubPanel } from './HubPanel'
import type { Project, TimeRange } from '../../types'

interface TopProjectsPanelProps {
  timeRange: TimeRange
  sseVersion: number
  onViewAll: () => void
}

export function TopProjectsPanel({ timeRange, sseVersion, onViewAll }: TopProjectsPanelProps) {
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    api.projects(timeRange)
      .then(ps => setProjects([...ps].sort((a, b) => b.cost - a.cost).slice(0, 3)))
      .catch(() => {})
  }, [timeRange, sseVersion])

  return (
    <HubPanel title="Top proyectos" onViewAll={onViewAll}>
      {projects.length === 0 ? (
        <span className="text-xs text-text-muted">Sin proyectos</span>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((p, i) => (
            <li key={p.project} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-text-primary truncate">
                <span className="text-text-muted">{i + 1}.</span> {p.project}
              </span>
              <span className="font-mono text-accent-yellow whitespace-nowrap">{formatCost(p.cost)}</span>
            </li>
          ))}
        </ul>
      )}
    </HubPanel>
  )
}
