export interface Status {
  connected: boolean
  lastSeen: number | null
  sessionCount: number
  totalEvents: number
  uptime: number
}

export interface Summary {
  tokens: { input: number; output: number; cache: number }
  cost: number
  activeTimeMs: number
  sessions: number
  commits: number
  pullRequests: number
  linesAdded: number
  linesRemoved: number
  efficiency: number
}

export interface TimeseriesPoint {
  timestamp: number
  value: number
}

export interface Session {
  sessionId: string
  project: string | null
  feature: string | null
  model: string | null
  startTime: number
  lastSeen: number
  durationActiveMs: number
  tokensInput: number
  tokensOutput: number
  tokensCache: number
  cost: number
  apiRequests: number
  toolCalls: number
}

export interface UnlabeledSession {
  sessionId: string
  model: string | null
  timestamp: number
  tokensInput: number
}

export interface Project {
  project: string
  cost: number
  tokensInput: number
  tokensOutput: number
  cacheHitRate: number
  sessions: number
  commits: number
  linesAdded: number
  linesRemoved: number
}

export interface ToolUsage {
  toolName: string
  count: number
  successRate: number
  avgDurationMs: number
}

export interface ToolsData {
  usage: ToolUsage[]
  decisionRate: { approved: number; rejected: number }
}

export interface Event {
  timestamp: number
  eventName: string
  sessionId: string | null
  project: string | null
  model: string | null
  attributes: Record<string, unknown>
}

export interface Agent {
  agentId: string
  parentAgentId: string | null
  tokensInput: number
  tokensOutput: number
  cost: number
  toolCalls: number
  durationMs: number
}

export interface ModelStats {
  model: string
  requests: number
  tokensInput: number
  tokensOutput: number
  cost: number
  avgLatencyMs: number
  avgTtftMs: number
}

export type TimeRange = 'now-24h' | 'now-7d' | 'now-30d' | 'all'

export type TabId = 'overview' | 'sessions' | 'projects' | 'tools' | 'agents' | 'events' | 'costs'
