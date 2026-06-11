import { useState, useEffect } from 'react'
import { api } from '../../api'
import { formatRelativeTime } from '../../utils/format'
import { HubPanel } from './HubPanel'
import type { Event } from '../../types'

interface RecentEventsPanelProps {
  sseVersion: number
  onViewAll: () => void
}

function eventColor(name: string): string {
  if (name.includes('error'))   return 'text-accent-red'
  if (name === 'user_prompt')   return 'text-accent-blue'
  if (name === 'api_request')   return 'text-accent-green'
  if (name === 'tool_use')      return 'text-accent-teal'
  if (name.startsWith('hook_')) return 'text-accent-yellow'
  return 'text-text-secondary'
}

export function RecentEventsPanel({ sseVersion, onViewAll }: RecentEventsPanelProps) {
  const [events, setEvents] = useState<Event[]>([])

  useEffect(() => {
    api.events(3).then(setEvents).catch(() => {})
  }, [sseVersion])

  return (
    <HubPanel title="Eventos recientes" onViewAll={onViewAll}>
      {events.length === 0 ? (
        <span className="text-xs text-text-muted">Sin eventos</span>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((ev, i) => (
            <li key={`${ev.timestamp}-${i}`} className="flex items-baseline justify-between gap-2 text-xs">
              <span className={`truncate ${eventColor(ev.eventName)}`}>● {ev.eventName}</span>
              <span className="text-text-muted whitespace-nowrap">{formatRelativeTime(ev.timestamp)}</span>
            </li>
          ))}
        </ul>
      )}
    </HubPanel>
  )
}
