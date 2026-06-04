import type {
  Status, Summary, TimeseriesPoint, Session, UnlabeledSession,
  Project, ToolsData, Event, Agent, ModelStats
} from './types'

const BASE = ''

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export const api = {
  status: () => get<Status>('/api/status'),

  summary: (from?: string) =>
    get<Summary>(`/api/summary${from ? `?from=${from}` : ''}`),

  timeseries: (metric: string, from?: string, bucket?: string) => {
    const params = new URLSearchParams({ metric })
    if (from) params.set('from', from)
    if (bucket) params.set('bucket', bucket)
    return get<TimeseriesPoint[]>(`/api/timeseries?${params}`)
  },

  projects: (from?: string) =>
    get<Project[]>(`/api/projects${from ? `?from=${from}` : ''}`),

  sessions: (limit = 50, project?: string) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (project) params.set('project', project)
    return get<Session[]>(`/api/sessions?${params}`)
  },

  unlabeledSessions: () => get<UnlabeledSession[]>('/api/sessions/unlabeled'),

  sessionEvents: (sessionId: string) =>
    get<Event[]>(`/api/sessions/${sessionId}/events`),

  events: (limit = 200, type?: string, project?: string) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (type) params.set('type', type)
    if (project) params.set('project', project)
    return get<Event[]>(`/api/events?${params}`)
  },

  tools: (from?: string) =>
    get<ToolsData>(`/api/tools${from ? `?from=${from}` : ''}`),

  agents: () => get<Agent[]>('/api/agents'),

  models: (from?: string) =>
    get<ModelStats[]>(`/api/models${from ? `?from=${from}` : ''}`),

  labelSession: (sessionId: string, project: string) =>
    fetch(`/api/sessions/${sessionId}/label`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project }),
    }).then(r => r.json()),

  reset: () =>
    fetch('/api/reset', { method: 'POST' }).then(r => r.json()),

  resetProject: (project: string) =>
    fetch(`/api/projects/${encodeURIComponent(project)}/reset`, { method: 'POST' }).then(r => r.json()),
}
