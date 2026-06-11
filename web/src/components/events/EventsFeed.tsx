import { useState, useEffect } from 'react'
import { Pause, Play } from 'lucide-react'
import { api } from '../../api'
import { getPrices } from '../../utils/prices'
import { formatRelativeTime, formatNumber } from '../../utils/format'
import { TabStats } from '../stats/TabStats'
import type { Event, TimeRange } from '../../types'

type EventFilter = 'all' | 'api' | 'tools' | 'prompts' | 'errors'

const FILTERS: { id: EventFilter; label: string }[] = [
  { id: 'all',     label: 'Todos' },
  { id: 'api',     label: 'API' },
  { id: 'tools',   label: 'Tools' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'errors',  label: 'Errores' },
]

function formatCostEvent(n: number): string {
  if (n >= 1)    return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(3)}`
  return `$${n.toFixed(4)}`
}

function eventCost(ev: Event): number | null {
  const a = ev.attributes

  // Coste directo reportado en el atributo
  if (typeof a.cost === 'number' && a.cost > 0) return a.cost

  // Calcular desde tokens si están disponibles
  const input        = Number(a.input_tokens          ?? a['tokens.input']                  ?? 0)
  const output       = Number(a.output_tokens         ?? a['tokens.output']                 ?? 0)
  const cacheRead    = Number(a.cache_read_input_tokens    ?? a['tokens.cache_read']         ?? 0)
  const cacheWrite   = Number(a.cache_creation_input_tokens ?? a['tokens.cache_creation']   ?? 0)

  if (input === 0 && output === 0) return null

  const p = getPrices(ev.model)
  return (
    input      * p.input      / 1_000_000 +
    output     * p.output     / 1_000_000 +
    cacheRead  * p.cacheRead  / 1_000_000 +
    cacheWrite * p.cacheWrite / 1_000_000
  )
}

function eventColor(name: string): string {
  if (name.includes('error'))       return 'text-accent-orange'
  if (name === 'user_prompt')       return 'text-accent-blue'
  if (name === 'api_request')       return 'text-accent-green'
  if (name === 'tool_use')          return 'text-accent-teal'
  if (name.startsWith('hook_'))     return 'text-accent-yellow'
  return 'text-text-secondary'
}

function matchesFilter(ev: Event, filter: EventFilter): boolean {
  if (filter === 'all')     return true
  if (filter === 'api')     return ev.eventName.includes('api')
  if (filter === 'tools')   return ev.eventName.includes('tool')
  if (filter === 'prompts') return ev.eventName.includes('prompt')
  if (filter === 'errors')  return ev.eventName.includes('error')
  return true
}

export function EventsFeed({ timeRange, sseVersion }: { timeRange: TimeRange; sseVersion: number }) {
  const [events, setEvents] = useState<Event[]>([])
  const [filter, setFilter] = useState<EventFilter>('all')
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    api.events(500).then(setEvents).catch(() => {})
  }, [timeRange, sseVersion, paused])

  const filtered = events.filter(ev => matchesFilter(ev, filter))

  return (
    <>
      <TabStats stats={[
        { label: 'Eventos', value: formatNumber(events.length), accent: 'text-accent-cyan' },
        { label: 'Errores', value: String(events.filter(e => e.eventName.includes('error')).length), accent: 'text-accent-red' },
        { label: 'Último evento', value: events.length > 0 ? formatRelativeTime(events[0].timestamp) : '—', accent: 'text-accent-blue' },
      ]} />

      <div className="bg-bg-card border border-bg-border rounded-lg flex flex-col h-[600px]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-bg-border flex-wrap">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              filter === id
                ? 'bg-accent-cyan text-bg-base font-medium'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setPaused(p => !p)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary"
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
          <span>{paused ? 'Reanudar' : 'Pausar'}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
        {filtered.length === 0
          ? <span className="text-text-muted">Sin eventos</span>
          : filtered.map((ev, i) => {
            const cost = eventCost(ev)
            return (
              <div key={`${ev.sessionId ?? ''}-${ev.timestamp}-${ev.eventName}-${i}`} className="flex gap-2 hover:bg-bg-base px-1 rounded">
                <span className="text-text-muted shrink-0">
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
                <span className={`shrink-0 ${eventColor(ev.eventName)}`}>{ev.eventName}</span>
                {ev.sessionId && (
                  <span className="text-text-muted">{ev.sessionId.slice(0, 6)}…</span>
                )}
                {cost !== null && (
                  <span className="text-accent-purple ml-auto shrink-0">{formatCostEvent(cost)}</span>
                )}
              </div>
            )
          })
        }
      </div>
      </div>
    </>
  )
}
