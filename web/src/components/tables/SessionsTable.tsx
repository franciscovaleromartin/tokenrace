import { useState, useEffect, Fragment } from 'react'
import { ChevronDown, ChevronRight, Edit2, Check, X } from 'lucide-react'
import { api } from '../../api'
import { formatDuration, formatRelativeTime, formatNumber, formatCost } from '../../utils/format'
import { useSort } from '../../hooks/useSort'
import type { Session, Event, TimeRange } from '../../types'

interface SessionsTableProps {
  timeRange: TimeRange
  sseVersion: number
}

export function SessionsTable({ timeRange, sseVersion }: SessionsTableProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sessionEvents, setSessionEvents] = useState<Event[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [knownProjects, setKnownProjects] = useState<string[]>([])
  const { sorted, toggle, indicator } = useSort(sessions, 'startTime')

  useEffect(() => {
    api.sessions(50, projectFilter || undefined).then(setSessions).catch(() => {})
  }, [timeRange, sseVersion, projectFilter])

  useEffect(() => {
    api.projects(timeRange).then(ps => setKnownProjects(ps.map(p => p.project))).catch(() => {})
  }, [timeRange, sseVersion])

  function toggleExpand(sessionId: string) {
    if (expanded === sessionId) {
      setExpanded(null)
      setSessionEvents([])
    } else {
      setSessionEvents([])
      setExpanded(sessionId)
      api.sessionEvents(sessionId).then(setSessionEvents).catch(() => {})
    }
  }

  function startEdit(sessionId: string, currentProject: string | null, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(sessionId)
    setEditValue(currentProject ?? '')
  }

  async function confirmEdit(sessionId: string) {
    if (editValue.trim()) {
      await api.labelSession(sessionId, editValue.trim()).catch(() => {})
      setSessions(prev => prev.map(s =>
        s.sessionId === sessionId ? { ...s, project: editValue.trim() } : s
      ))
    }
    setEditingId(null)
  }

  if (sessions.length === 0 && !projectFilter) {
    return <div className="text-text-muted text-sm p-4">Sin sesiones registradas</div>
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filtro por proyecto */}
      {knownProjects.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted uppercase tracking-wider">Proyecto</span>
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="bg-bg-card border border-bg-border rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-green cursor-pointer"
          >
            <option value="">Todos</option>
            {knownProjects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-text-muted text-sm p-4">Sin sesiones para este proyecto</div>
      ) : (
    <div className="bg-bg-card border border-bg-border rounded-lg">
      <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[720px] whitespace-nowrap">
        <thead>
          <tr className="border-b border-bg-border">
            <th className="w-6 px-3 py-2" />
            <th className="text-left px-3 py-2 text-text-muted font-medium">ID</th>
            <th className="text-left px-3 py-2 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none" onClick={() => toggle('project')}>Proyecto{indicator('project')}</th>
            <th className="text-left px-3 py-2 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none" onClick={() => toggle('model')}>Modelo{indicator('model')}</th>
            <th className="text-left px-3 py-2 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none" onClick={() => toggle('startTime')}>Inicio{indicator('startTime')}</th>
            <th className="text-right px-3 py-2 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none" onClick={() => toggle('durationActiveMs')}>Duración{indicator('durationActiveMs')}</th>
            <th className="text-right px-3 py-2 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none" onClick={() => toggle('tokensInput')}>Input{indicator('tokensInput')}</th>
            <th className="text-right px-3 py-2 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none" onClick={() => toggle('tokensOutput')}>Output{indicator('tokensOutput')}</th>
            <th className="text-right px-3 py-2 text-text-muted font-medium cursor-pointer hover:text-text-secondary select-none" onClick={() => toggle('cost')}>Coste{indicator('cost')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(session => (
            <Fragment key={session.sessionId}>
              <tr
                className="border-b border-bg-border hover:bg-bg-card-hover cursor-pointer"
                onClick={() => toggleExpand(session.sessionId)}
              >
                <td className="px-3 py-2 text-text-muted">
                  {expanded === session.sessionId ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </td>
                <td className="px-3 py-2 font-mono text-text-secondary text-xs">
                  {session.sessionId.slice(0, 8)}…
                </td>
                <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                  {editingId === session.sessionId ? (
                    <span className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmEdit(session.sessionId)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="bg-bg-base border border-bg-border rounded px-1 py-0.5 text-xs text-text-primary w-24 outline-none focus:border-accent-green"
                      />
                      <button onClick={() => confirmEdit(session.sessionId)} className="text-accent-green"><Check size={12} /></button>
                      <button onClick={() => setEditingId(null)} className="text-accent-orange"><X size={12} /></button>
                    </span>
                  ) : (
                    <span
                      onClick={e => startEdit(session.sessionId, session.project, e)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-bg-base border border-bg-border text-text-secondary hover:border-accent-green cursor-pointer transition-colors"
                    >
                      {session.project ?? '—'}
                      <Edit2 size={10} className="opacity-50" />
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-text-secondary font-mono text-xs">{session.model ?? '—'}</td>
                <td className="px-3 py-2 text-text-secondary">{formatRelativeTime(session.startTime)}</td>
                <td className="px-3 py-2 text-right font-mono text-text-secondary">{formatDuration(session.durationActiveMs)}</td>
                <td className="px-3 py-2 text-right font-mono text-accent-blue">{formatNumber(session.tokensInput)}</td>
                <td className="px-3 py-2 text-right font-mono text-accent-green">{formatNumber(session.tokensOutput)}</td>
                <td className="px-3 py-2 text-right font-mono text-accent-purple">{formatCost(session.cost)}</td>
              </tr>
              {expanded === session.sessionId && (
                <tr>
                  <td colSpan={9} className="bg-bg-subtle px-6 py-3">
                    <div className="text-xs font-mono space-y-0.5 max-h-40 overflow-y-auto">
                      {sessionEvents.length === 0
                        ? <span className="text-text-muted">Sin eventos</span>
                        : sessionEvents.slice(-20).map((ev, i) => (
                          <div key={`${ev.timestamp}-${ev.eventName}-${i}`} className="flex gap-2 text-text-secondary">
                            <span className="text-text-muted shrink-0">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                            <span className="text-accent-teal">{ev.eventName}</span>
                          </div>
                        ))
                      }
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      </div>
    </div>
      )}
    </div>
  )
}
