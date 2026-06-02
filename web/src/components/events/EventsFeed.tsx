import { useState, useEffect, useRef } from 'react'
import { Pause, Play } from 'lucide-react'
import { api } from '../../api'
import type { Event } from '../../types'

type EventFilter = 'all' | 'api' | 'tools' | 'prompts' | 'errors'

const FILTERS: { id: EventFilter; label: string }[] = [
  { id: 'all',     label: 'Todos' },
  { id: 'api',     label: 'API' },
  { id: 'tools',   label: 'Tools' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'errors',  label: 'Errores' },
]

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

export function EventsFeed({ timeRange: _timeRange }: { timeRange: string }) {
  const [events, setEvents] = useState<Event[]>([])
  const [filter, setFilter] = useState<EventFilter>('all')
  const [paused, setPaused] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.events(500).then(setEvents).catch(() => {})
  }, [])

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events, paused])

  const filtered = events.filter(ev => matchesFilter(ev, filter))

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg flex flex-col h-[600px]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-bg-border flex-wrap">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              filter === id
                ? 'bg-accent-green text-black font-medium'
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
          : filtered.map((ev, i) => (
            <div key={i} className="flex gap-2 hover:bg-bg-base px-1 rounded">
              <span className="text-text-muted shrink-0">
                {new Date(ev.timestamp).toLocaleTimeString()}
              </span>
              <span className={`shrink-0 ${eventColor(ev.eventName)}`}>{ev.eventName}</span>
              {ev.sessionId && (
                <span className="text-text-muted">{ev.sessionId.slice(0, 6)}…</span>
              )}
            </div>
          ))
        }
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
