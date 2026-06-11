import { useState, useEffect, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { api } from '../../api'
import { formatNumber, formatCost } from '../../utils/format'
import { useSort } from '../../hooks/useSort'
import { TabStats } from '../stats/TabStats'
import type { Project, TimeRange } from '../../types'

interface ProjectsTableProps {
  timeRange: TimeRange
  sseVersion: number
}

export function ProjectsTable({ timeRange, sseVersion }: ProjectsTableProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [resetting, setResetting] = useState<string | null>(null)
  const { sorted, toggle, indicator } = useSort(projects, 'cost')

  const load = useCallback(() => {
    api.projects(timeRange).then(setProjects).catch(() => {})
  }, [timeRange])

  useEffect(() => { load() }, [load, sseVersion])

  const handleReset = async (project: string) => {
    if (!confirm(`¿Resetear todos los datos del proyecto "${project}"?`)) return
    setResetting(project)
    try {
      await api.resetProject(project)
      load()
    } finally {
      setResetting(null)
    }
  }

  if (projects.length === 0) {
    return <div className="text-text-muted text-sm p-4">Sin proyectos registrados</div>
  }

  const maxCost = Math.max(...projects.map(p => p.cost), 0.0001)

  return (
    <div className="flex flex-col gap-4">
      <TabStats stats={[
        { label: 'Proyectos', value: String(projects.length), accent: 'text-accent-cyan' },
        { label: 'Coste total', value: formatCost(projects.reduce((s, p) => s + p.cost, 0)), accent: 'text-accent-yellow' },
        { label: 'Más caro', value: projects.length > 0 ? [...projects].sort((a, b) => b.cost - a.cost)[0].project : '—', accent: 'text-accent-orange' },
      ]} />

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

      <div className="bg-bg-card border border-bg-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-bg-border">
              <th className="text-left px-3 py-2 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none" onClick={() => toggle('project')}>Proyecto{indicator('project')}</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none" onClick={() => toggle('sessions')}>Sesiones{indicator('sessions')}</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none" onClick={() => toggle('tokensInput')}>Input{indicator('tokensInput')}</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none" onClick={() => toggle('tokensOutput')}>Output{indicator('tokensOutput')}</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none" onClick={() => toggle('cacheHitRate')}>Caché %{indicator('cacheHitRate')}</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none" onClick={() => toggle('cost')}>Coste{indicator('cost')}</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none" onClick={() => toggle('commits')}>Commits{indicator('commits')}</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium">LOC +/-</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(p => (
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
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => handleReset(p.project)}
                    disabled={resetting === p.project}
                    title="Resetear proyecto"
                    className="p-1 rounded text-text-muted hover:text-accent-orange hover:bg-bg-base transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
