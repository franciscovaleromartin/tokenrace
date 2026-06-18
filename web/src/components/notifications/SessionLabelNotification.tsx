import { useState, useEffect, useCallback } from 'react'
import { Check, X } from 'lucide-react'
import { api } from '../../api'
import type { UnlabeledSession } from '../../types'

interface SessionLabelNotificationProps {
  onLabeled: () => void
  sseVersion: number
}

interface NotifState {
  session: UnlabeledSession
  status: 'pending' | 'resolved' | 'ignored'
  resolvedProject?: string
}

function timeSince(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return `hace ${Math.floor(diff / 1000)}s`
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)}m`
  return `hace ${Math.floor(diff / 3_600_000)}h`
}

export function SessionLabelNotification({ onLabeled, sseVersion }: SessionLabelNotificationProps) {
  const [notifs, setNotifs] = useState<NotifState[]>([])
  const [knownProjects, setKnownProjects] = useState<string[]>([])
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({})
  const [showCustom, setShowCustom] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    try {
      const [unlabeled, projects] = await Promise.all([
        api.unlabeledSessions(),
        api.projects().catch(() => [] as Awaited<ReturnType<typeof api.projects>>),
      ])
      setNotifs(prev => {
        const unlabeledIds = new Set(unlabeled.map(s => s.sessionId))
        // Quitar notifs pendientes cuya sesión ya fue etiquetada (ej. por auto-detección)
        const filtered = prev.filter(n =>
          n.status !== 'pending' || unlabeledIds.has(n.session.sessionId)
        )
        const existingIds = new Set(filtered.map(n => n.session.sessionId))
        const newOnes = unlabeled
          .filter(s => !existingIds.has(s.sessionId))
          .map(s => ({ session: s, status: 'pending' as const }))
        return [...filtered, ...newOnes]
      })
      setKnownProjects(
        [...projects]
          .sort((a, b) => b.sessions - a.sessions)
          .map(p => p.project)
      )
    } catch {
      // ignorar errores de red
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, sseVersion])

  async function labelSession(sessionId: string, project: string) {
    await api.labelSession(sessionId, project).catch(() => {})
    setNotifs(prev => prev.map(n =>
      n.session.sessionId === sessionId
        ? { ...n, status: 'resolved', resolvedProject: project }
        : n
    ))
    onLabeled()
    // Auto-cerrar tras 3s
    setTimeout(() => {
      setNotifs(prev => prev.filter(n => n.session.sessionId !== sessionId))
    }, 3_000)
  }

  function ignoreSession(sessionId: string) {
    setNotifs(prev => prev.map(n =>
      n.session.sessionId === sessionId ? { ...n, status: 'ignored' } : n
    ))
    // Llamar al endpoint de ignore — si falla, simplemente ocultarlo
    fetch(`/api/sessions/${sessionId}/ignore`, { method: 'POST' }).catch(() => {})
    setTimeout(() => {
      setNotifs(prev => prev.filter(n => n.session.sessionId !== sessionId))
    }, 500)
  }

  const pendingNotifs = notifs.filter(n => n.status === 'pending' || n.status === 'resolved')
  if (pendingNotifs.length === 0) return null

  return (
    <div className="border-b border-bg-border bg-bg-subtle">
      {pendingNotifs.map(({ session, status, resolvedProject }) => (
        <div
          key={session.sessionId}
          className={`px-4 py-2 flex items-start gap-3 text-sm transition-all ${
            status === 'resolved' ? 'opacity-60' : ''
          }`}
        >
          {/* Indicador */}
          <span className={`mt-0.5 inline-block w-2 h-2 rounded-full shrink-0 ${
            status === 'resolved' ? 'bg-accent-green' : 'bg-accent-yellow animate-pulse'
          }`} />

          {/* Info */}
          <div className="flex-1 min-w-0">
            {status === 'resolved' ? (
              <span className="text-accent-green">
                ✓ Sesión etiquetada como <strong>{resolvedProject}</strong>
              </span>
            ) : (
              <>
                <div className="text-text-secondary">
                  <span className="font-medium text-text-primary">Nueva sesión sin proyecto</span>
                  <span className="text-text-muted ml-2">
                    {session.sessionId.slice(0, 8)}… · {session.model ?? 'modelo desconocido'} · {timeSince(session.timestamp)}
                  </span>
                </div>

                {/* Botones de proyectos conocidos */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {knownProjects.slice(0, 5).map(project => (
                    <button
                      key={project}
                      onClick={() => labelSession(session.sessionId, project)}
                      className="px-2 py-0.5 rounded text-xs bg-bg-card border border-bg-border text-text-secondary hover:border-accent-cyan hover:text-text-primary transition-colors"
                    >
                      {project}
                    </button>
                  ))}

                  {/* Nuevo proyecto */}
                  {showCustom[session.sessionId] ? (
                    <span className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={customInputs[session.sessionId] ?? ''}
                        onChange={e => setCustomInputs(prev => ({ ...prev, [session.sessionId]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && customInputs[session.sessionId]?.trim()) {
                            labelSession(session.sessionId, customInputs[session.sessionId].trim())
                          }
                          if (e.key === 'Escape') setShowCustom(prev => ({ ...prev, [session.sessionId]: false }))
                        }}
                        placeholder="nombre del proyecto"
                        className="bg-bg-base border border-bg-border rounded px-2 py-0.5 text-xs text-text-primary outline-none focus:border-accent-cyan w-32"
                      />
                      <button
                        onClick={() => {
                          const v = customInputs[session.sessionId]?.trim()
                          if (v) labelSession(session.sessionId, v)
                        }}
                        className="text-accent-green"
                      >
                        <Check size={12} />
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowCustom(prev => ({ ...prev, [session.sessionId]: true }))}
                      className="px-2 py-0.5 rounded text-xs bg-bg-card border border-bg-border text-text-secondary hover:border-accent-cyan transition-colors"
                    >
                      + Nuevo
                    </button>
                  )}

                  {/* Ignorar */}
                  <button
                    onClick={() => ignoreSession(session.sessionId)}
                    className="px-2 py-0.5 rounded text-xs text-text-muted hover:text-accent-red transition-colors flex items-center gap-1"
                  >
                    <X size={10} />
                    Ignorar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
