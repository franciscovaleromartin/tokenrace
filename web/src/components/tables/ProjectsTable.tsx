import { useState, useEffect } from 'react'
import { api } from '../../api'
import { formatNumber, formatCost } from '../../utils/format'
import type { Project, TimeRange } from '../../types'

interface ProjectsTableProps {
  timeRange: TimeRange
}

export function ProjectsTable({ timeRange }: ProjectsTableProps) {
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    api.projects(timeRange).then(setProjects).catch(() => {})
  }, [timeRange])

  if (projects.length === 0) {
    return <div className="text-text-muted text-sm p-4">Sin proyectos registrados</div>
  }

  const maxCost = Math.max(...projects.map(p => p.cost), 0.0001)

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-bg-card border border-bg-border rounded-lg p-4 space-y-3">
        {projects.map(p => (
          <div key={p.project}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-primary font-medium">{p.project}</span>
              <span className="text-accent-purple font-mono">{formatCost(p.cost)}</span>
            </div>
            <div className="h-2 bg-bg-base rounded-full overflow-hidden">
              <div className="h-full bg-accent-purple rounded-full" style={{ width: `${(p.cost / maxCost) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-bg-card border border-bg-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border">
              <th className="text-left px-3 py-2 text-text-muted font-medium">Proyecto</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium">Sesiones</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium">Input</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium">Output</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium">Caché %</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium">Coste</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium">Commits</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium">LOC +/-</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.project} className="border-b border-bg-border hover:bg-bg-card-hover">
                <td className="px-3 py-2 text-text-primary font-medium">{p.project}</td>
                <td className="px-3 py-2 text-right text-text-secondary">{p.sessions}</td>
                <td className="px-3 py-2 text-right font-mono text-accent-blue">{formatNumber(p.tokensInput)}</td>
                <td className="px-3 py-2 text-right font-mono text-accent-green">{formatNumber(p.tokensOutput)}</td>
                <td className="px-3 py-2 text-right font-mono text-accent-teal">{(p.cacheHitRate * 100).toFixed(1)}%</td>
                <td className="px-3 py-2 text-right font-mono text-accent-purple">{formatCost(p.cost)}</td>
                <td className="px-3 py-2 text-right text-text-secondary">{p.commits}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  <span className="text-accent-green">+{p.linesAdded}</span>
                  <span className="text-text-muted"> / </span>
                  <span className="text-accent-orange">-{p.linesRemoved}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
