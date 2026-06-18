import { useMemo } from 'react'
import { formatCost } from '../../utils/format'
import { HubPanel } from './HubPanel'
import type { Project } from '../../types'

interface TopProjectsPanelProps {
  projects: Project[]
  onViewAll: () => void
}

export function TopProjectsPanel({ projects, onViewAll }: TopProjectsPanelProps) {
  const topProjects = useMemo(
    () => [...projects].sort((a, b) => b.cost - a.cost).slice(0, 3),
    [projects]
  )

  return (
    <HubPanel title="Top proyectos" onViewAll={onViewAll}>
      {topProjects.length === 0 ? (
        <span className="text-xs text-text-muted">Sin proyectos</span>
      ) : (
        <ul className="flex flex-col gap-2">
          {topProjects.map((p, i) => (
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
