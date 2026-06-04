/**
 * store.js
 *
 * Estado en memoria del servidor, getters para la API REST,
 * y persistencia en ~/.tokenrace/data.json.
 *
 * Reglas:
 * - Nunca lanzar excepción — si falla escribir a disco, loguearlo y continuar.
 * - Sin estado global mutable excepto el objeto `state` local.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { estimateCost } from './prices.js'

// ─── Cola de auto-detección de proyecto vía git ──────────────────────────────

const _pendingAutoDetect  = []   // { sessionId }[]
const _autoDetectQueued   = new Set() // sessionIds con detección en cola ahora mismo

/**
 * Encola una sesión sin proyecto para auto-detección leyendo ~/.claude/projects/.
 * No re-encola si ya está en cola o si la sesión ya tiene proyecto.
 */
function maybeQueueAutoDetect(sessionId) {
  if (_autoDetectQueued.has(sessionId)) return
  const session = state.sessions.get(sessionId)
  if (!session || resolveProject(sessionId, session.project) !== null) return
  _autoDetectQueued.add(sessionId)
  _pendingAutoDetect.push({ sessionId })
}

/**
 * Devuelve y vacía la cola de sesiones pendientes de auto-detección.
 * Al drenarla, las sessionIds vuelven a estar disponibles para future re-colas
 * (permite reintentar si la primera detección falló).
 */
export function drainAutoDetectQueue() {
  const items = _pendingAutoDetect.splice(0)
  for (const { sessionId } of items) _autoDetectQueued.delete(sessionId)
  return items
}

// ─── Ruta de persistencia ───────────────────────────────────────────────────

const HOME_DATA_DIR = path.join(os.homedir(), '.tokenrace')
let dataDir  = HOME_DATA_DIR
let dataFile = path.join(HOME_DATA_DIR, 'data.json')

// Solo para tests — redirige la ruta de datos a un directorio temporal
export function setDataPathForTesting(newPath) {
  dataFile = newPath
  dataDir  = path.dirname(newPath)
}

// ─── Estado en memoria ───────────────────────────────────────────────────────

const state = {
  timeseries:       new Map(),  // metricName → [{ ts, value, labels }]
  sessions:         new Map(),  // sessionId  → SessionData
  sessionMappings:  new Map(),  // sessionId  → projectName
  ignoredSessions:  new Set(),  // sessionIds ignorados
  events:           [],         // buffer circular, max 1000
  eventIndex:       0,
  projects:         new Map(),  // projectName → ProjectAggregates
  tools:            new Map(),  // toolName    → ToolStats
  agents:           new Map(),  // agentId     → AgentData
  models:           new Map(),  // modelName   → ModelStats
  cumulativeValues: new Map(),  // clave → último valor acumulativo (no persiste)
  lastSeen:         null,
  startTime:        Date.now(),
  totalEvents:      0
}

// ─── Helpers internos ────────────────────────────────────────────────────────

/**
 * Convierte un valor acumulativo en un delta desde la última lectura.
 * Se usa para métricas que Claude Code exporta con temporalidad cumulativa.
 */
function cumulativeDelta(key, newValue) {
  const last = state.cumulativeValues.get(key) ?? 0
  const delta = Math.max(0, newValue - last)
  state.cumulativeValues.set(key, newValue)
  return delta
}

/**
 * Normaliza los nombres de métricas nuevos de Claude Code a los nombres
 * canónicos que usa el store, convirtiendo valores cumulativos a deltas.
 * Devuelve { name, value } normalizado, o null para ignorar la métrica.
 */
function normalizeIncoming(name, value, labels) {
  const sid = labels['session.id'] ?? ''

  switch (name) {
    case 'claude_code.token.usage': {
      const type = labels.type
      const key  = `token:${sid}:${type}:${labels.model ?? ''}:${labels.query_source ?? ''}`
      const delta = cumulativeDelta(key, value)
      const nameMap = {
        'input':         'claude_code.tokens.input',
        'output':        'claude_code.tokens.output',
        'cacheRead':     'claude_code.tokens.cache.read',
        'cacheCreation': 'claude_code.tokens.cache.creation',
      }
      const canonical = nameMap[type]
      return canonical ? { name: canonical, value: delta } : null
    }

    case 'claude_code.cost.usage': {
      const key   = `cost:${sid}:${labels.model ?? ''}:${labels.query_source ?? ''}:${labels.effort ?? ''}`
      const delta = cumulativeDelta(key, value)
      return { name: 'claude_code.cost', value: delta }
    }

    case 'claude_code.lines_of_code.count': {
      const type  = labels.type
      const key   = `lines:${sid}:${type}`
      const delta = cumulativeDelta(key, value)
      if (type === 'added')   return { name: 'claude_code.lines_added',   value: delta }
      if (type === 'removed') return { name: 'claude_code.lines_removed', value: delta }
      return null
    }

    case 'claude_code.commit.count': {
      const key   = `commit:${sid}`
      const delta = cumulativeDelta(key, value)
      return { name: 'claude_code.commits', value: delta }
    }

    // Métricas que no necesitamos agregar (activo ya se calcula desde eventos)
    case 'claude_code.session.count':
    case 'claude_code.active_time.total':
    case 'claude_code.code_edit_tool.decision':
      return null

    default:
      return { name, value }
  }
}

/**
 * Resuelve el proyecto de una sesión.
 * Prioridad: mapping manual > resource project > null
 */
function resolveProject(sessionId, resourceProject) {
  return state.sessionMappings.get(sessionId) ?? resourceProject ?? null
}

const TIME_MULTIPLIERS = { d: 86_400_000, h: 3_600_000, m: 60_000 }

/**
 * Parsea un rango temporal "now-Xd", "now-Xh", "now-Xm", "all" o falsy.
 * Devuelve el timestamp mínimo (ms) a incluir.
 */
function parseTimeRange(from) {
  if (!from || from === 'all') return 0

  const match = /^now-(\d+)([dhm])$/.exec(from)
  if (!match) return 0

  return Date.now() - Number(match[1]) * TIME_MULTIPLIERS[match[2]]
}

/**
 * Parsea un tamaño de bucket ("1h", "1d", "5m") a ms.
 * Default: 1 hora.
 */
function parseBucket(bucket) {
  if (!bucket) return 3_600_000
  const match = /^(\d+)([dhm])$/.exec(bucket)
  if (!match) return 3_600_000
  return Number(match[1]) * TIME_MULTIPLIERS[match[2]]
}

/**
 * Reconstruye state.projects desde cero usando state.sessions y state.timeseries.
 */
function rebuildProjectAggregates() {
  state.projects.clear()

  // Reconstruir desde sesiones
  for (const session of state.sessions.values()) {
    const project = resolveProject(session.sessionId, session.project)
    if (!project) continue

    if (!state.projects.has(project)) {
      state.projects.set(project, {
        sessions: new Set(),
        commits: 0, linesAdded: 0, linesRemoved: 0
      })
    }
    const proj = state.projects.get(project)
    proj.sessions.add(session.sessionId)
  }

  // Reconstruir commits y líneas desde timeseries
  const commitMetrics  = ['claude_code.commits']
  const linesAddedM    = ['claude_code.lines_added']
  const linesRemovedM  = ['claude_code.lines_removed']

  for (const [metricName, points] of state.timeseries.entries()) {
    let field = null
    if (commitMetrics.includes(metricName))  field = 'commits'
    if (linesAddedM.includes(metricName))    field = 'linesAdded'
    if (linesRemovedM.includes(metricName))  field = 'linesRemoved'
    if (!field) continue

    for (const point of points) {
      const project = resolveProject(point.labels['session.id'], point.labels.project)
      if (!project) continue
      if (!state.projects.has(project)) {
        state.projects.set(project, {
          sessions: new Set(),
          commits: 0, linesAdded: 0, linesRemoved: 0
        })
      }
      state.projects.get(project)[field] += point.value
    }
  }
}

/** Debounce: guarda a disco en el siguiente tick */
function scheduleSave() {
  setTimeout(() => saveSync(), 0)
}

// ─── Mutaciones ──────────────────────────────────────────────────────────────

/**
 * Procesa un punto de métrica normalizado.
 * @param {{ name, value, timestamp, labels }} metric
 */
export function processMetric(raw) {
  const normalized = normalizeIncoming(raw.name, raw.value, raw.labels)
  if (!normalized) return

  const { name, value } = normalized
  const { timestamp, labels } = raw
  const sessionId = labels['session.id']

  // Saltar sesiones ignoradas
  if (sessionId && state.ignoredSessions.has(sessionId)) return

  const project = resolveProject(sessionId, labels.project)
  const model   = labels.model ?? null

  // ── Timeseries ──
  if (!state.timeseries.has(name)) state.timeseries.set(name, [])
  const tsPoints = state.timeseries.get(name)
  tsPoints.push({ ts: timestamp, value, labels })
  // Cap por métrica para prevenir DoS por agotamiento de memoria
  if (tsPoints.length > 10_000) tsPoints.splice(0, tsPoints.length - 10_000)

  // ── Sesiones ──
  if (sessionId) {
    if (!state.sessions.has(sessionId)) {
      state.sessions.set(sessionId, {
        sessionId,
        project,
        feature:         labels.feature ?? null,
        model,
        startTime:       timestamp,
        lastSeen:        timestamp,
        durationActiveMs: 0,
        tokensInput:     0,
        tokensOutput:    0,
        tokensCache:     0,
        cost:            0,
        apiRequests:     0,
        toolCalls:       0,
        cwd:             null
      })
    }

    const session = state.sessions.get(sessionId)
    session.lastSeen = Math.max(session.lastSeen, timestamp)
    if (model && !session.model) session.model = model

    // Encolar auto-detección si la sesión aún no tiene proyecto
    if (resolveProject(sessionId, session.project) === null) {
      maybeQueueAutoDetect(sessionId)
    }

    switch (name) {
      case 'claude_code.tokens.input':
        session.tokensInput += value; break
      case 'claude_code.tokens.output':
        session.tokensOutput += value; break
      case 'claude_code.tokens.cache.read':
      case 'claude_code.tokens.cache.creation':
        session.tokensCache += value; break
      case 'claude_code.cost':
        session.cost += value; break
      case 'claude_code.active_time':
        session.durationActiveMs += value; break
      case 'claude_code.api_requests':
        session.apiRequests += value; break
    }
  }

  // ── Proyectos ──
  if (project) {
    if (!state.projects.has(project)) {
      state.projects.set(project, {
        sessions: new Set(),
        commits: 0, linesAdded: 0, linesRemoved: 0
      })
    }
    const proj = state.projects.get(project)
    if (sessionId) proj.sessions.add(sessionId)

    switch (name) {
      case 'claude_code.commits':
        proj.commits += value; break
      case 'claude_code.lines_added':
        proj.linesAdded += value; break
      case 'claude_code.lines_removed':
        proj.linesRemoved += value; break
    }
  }

  // ── Modelos ──
  if (model) {
    if (!state.models.has(model)) {
      state.models.set(model, {
        tokensInput: 0, tokensOutput: 0, cost: 0, requests: 0
      })
    }
    const modelStats = state.models.get(model)
    switch (name) {
      case 'claude_code.tokens.input':
        modelStats.tokensInput += value; break
      case 'claude_code.tokens.output':
        modelStats.tokensOutput += value; break
      case 'claude_code.cost':
        modelStats.cost += value; break
      case 'claude_code.api_requests':
        modelStats.requests += value; break
    }
  }

  state.lastSeen = timestamp
  state.totalEvents++
}

/**
 * Procesa un evento normalizado.
 * @param {{ eventName, timestamp, severity, attributes }} event
 * @returns {Object} El evento procesado (para broadcast SSE)
 */
export function processEvent({ eventName, timestamp, severity, attributes }) {
  const sessionId = attributes['session.id']
  const project   = resolveProject(sessionId, attributes.project)
  const model     = attributes.model ?? null

  const eventObj = {
    timestamp,
    eventName,
    sessionId,
    project,
    model,
    attributes
  }

  // Buffer circular — sobreescribir cuando alcanza 1000
  if (state.events.length < 1000) {
    state.events.push(eventObj)
  } else {
    state.events[state.eventIndex % 1000] = eventObj
  }
  state.eventIndex++

  // ── Asegurar que la sesión existe (puede llegar un evento antes que una métrica) ──
  if (sessionId && !state.sessions.has(sessionId)) {
    state.sessions.set(sessionId, {
      sessionId,
      project,
      feature:          attributes.feature ?? null,
      model,
      startTime:        timestamp,
      lastSeen:         timestamp,
      durationActiveMs: 0,
      tokensInput:      0,
      tokensOutput:     0,
      tokensCache:      0,
      cost:             0,
      apiRequests:      0,
      toolCalls:        0
    })
  }

  if (sessionId && state.sessions.has(sessionId)) {
    const session = state.sessions.get(sessionId)
    session.lastSeen = Math.max(session.lastSeen, timestamp)
    if (model && !session.model) session.model = model

    // Encolar auto-detección si la sesión aún no tiene proyecto
    if (resolveProject(sessionId, session.project) === null) {
      maybeQueueAutoDetect(sessionId)
    }

    // ── Tiempo activo desde eventos api_request (duration_ms) ──
    if (eventName === 'api_request') {
      const dur = Number(attributes['duration_ms'] ?? 0)
      if (dur > 0) session.durationActiveMs += dur
      session.apiRequests++
    }

    // ── Tool stats ──
    if (eventName === 'tool_use') {
      session.toolCalls++
    }
  }

  // ── Tool stats globales ──
  if (eventName === 'tool_use') {
    const toolName = attributes['tool.name'] ?? attributes.tool ?? 'unknown'

    if (!state.tools.has(toolName)) {
      state.tools.set(toolName, { count: 0, successes: 0, totalDurationMs: 0 })
    }
    const tool = state.tools.get(toolName)
    tool.count++

    if (attributes.success === true || attributes['tool.success'] === true) {
      tool.successes++
    }
    if (attributes['tool.duration_ms'] !== undefined) {
      tool.totalDurationMs += Number(attributes['tool.duration_ms'])
    }
  }

  state.lastSeen   = timestamp
  state.totalEvents++

  return eventObj
}

/**
 * Procesa un span normalizado.
 * Solo actúa si el span tiene agentId.
 * @param {Object} span
 */
export function processTrace(span) {
  const attrs   = span.attributes
  const agentId = attrs['agent.id'] ?? attrs['gen_ai.agent.id'] ?? null
  if (!agentId) return

  if (!state.agents.has(agentId)) {
    state.agents.set(agentId, {
      agentId,
      parentAgentId: attrs['agent.parent_id'] ?? null,
      tokensInput:  0,
      tokensOutput: 0,
      cost:         0,
      toolCalls:    0,
      durationMs:   0
    })
  }

  const agent    = state.agents.get(agentId)
  const duration = span.endTime - span.startTime
  if (duration > 0) agent.durationMs += duration
}

/**
 * Asigna un proyecto a una sesión, con aplicación retroactiva.
 * @param {string} sessionId
 * @param {string} project
 */
export function labelSession(sessionId, project) {
  state.sessionMappings.set(sessionId, project)

  // Aplicar en sesión existente
  if (state.sessions.has(sessionId)) {
    state.sessions.get(sessionId).project = project
  }

  // No es necesario propagar retroactivamente a los labels de timeseries:
  // resolveProject() consulta sessionMappings primero, por lo que todos los
  // lectores de labels.project ya obtendrán el valor correcto.
  rebuildProjectAggregates()
  scheduleSave()
}

/**
 * Marca una sesión como ignorada.
 * @param {string} sessionId
 */
export function ignoreSession(sessionId) {
  state.ignoredSessions.add(sessionId)
  scheduleSave()
}

/**
 * Resetea todo el estado en memoria y guarda el estado vacío a disco.
 */
export function reset() {
  state.timeseries.clear()
  state.sessions.clear()
  state.sessionMappings.clear()
  state.ignoredSessions.clear()
  state.events.length = 0
  state.eventIndex    = 0
  state.projects.clear()
  state.tools.clear()
  state.agents.clear()
  state.models.clear()
  state.cumulativeValues.clear()
  state.lastSeen    = null
  state.startTime   = Date.now()
  state.totalEvents = 0

  saveSync()
}

/**
 * Resetea los datos de un proyecto concreto eliminando sus sesiones y sus
 * puntos de timeseries, eventos y entradas cumulativas asociadas.
 * @param {string} projectName
 */
export function resetProject(projectName) {
  // Recoger los sessionIds del proyecto
  const sessionIds = new Set()
  for (const session of state.sessions.values()) {
    if (resolveProject(session.sessionId, session.project) === projectName) {
      sessionIds.add(session.sessionId)
    }
  }

  // Eliminar sesiones y sus entradas auxiliares
  for (const sid of sessionIds) {
    state.sessions.delete(sid)
    state.sessionMappings.delete(sid)
    state.ignoredSessions.delete(sid)

    // Limpiar baselines de métricas cumulativas para esta sesión
    for (const key of state.cumulativeValues.keys()) {
      if (key.includes(`:${sid}:`)) state.cumulativeValues.delete(key)
    }
  }

  // Filtrar timeseries: eliminar puntos de las sesiones del proyecto
  for (const [metric, points] of state.timeseries.entries()) {
    const filtered = points.filter(p => !sessionIds.has(p.labels['session.id']))
    if (filtered.length !== points.length) state.timeseries.set(metric, filtered)
  }

  // Filtrar buffer de eventos
  const remaining = state.events.filter(e => !sessionIds.has(e.sessionId))
  state.events.length = 0
  state.events.push(...remaining)

  // Eliminar el proyecto del mapa
  state.projects.delete(projectName)

  scheduleSave()
}

// ─── Getters ─────────────────────────────────────────────────────────────────

/**
 * Estado de conexión del servidor.
 */
export function getStatus() {
  let sessionCount = 0
  for (const id of state.sessions.keys()) {
    if (!state.ignoredSessions.has(id)) sessionCount++
  }
  return {
    connected:   state.lastSeen !== null,
    lastSeen:    state.lastSeen,
    sessionCount,
    totalEvents: state.totalEvents,
    uptime:      Date.now() - state.startTime
  }
}

/**
 * Resumen agregado filtrado por rango temporal.
 * @param {string} from - Rango temporal ("now-7d", "now-24h", "all")
 */
export function getSummary(from) {
  const minTs = parseTimeRange(from)

  let tokensInput   = 0
  let tokensOutput  = 0
  let tokensCache   = 0
  let cost          = 0
  let activeTimeMs  = 0
  const sessionSet  = new Set()

  // Coste desde timeseries: filtrado por timestamp exacto, sin doble conteo
  const sessionsWithCost = new Set()
  for (const point of state.timeseries.get('claude_code.cost') ?? []) {
    if (point.ts < minTs) continue
    const sid = point.labels['session.id']
    if (sid && state.ignoredSessions.has(sid)) continue
    cost += point.value
    if (sid) sessionsWithCost.add(sid)
  }

  for (const session of state.sessions.values()) {
    if (state.ignoredSessions.has(session.sessionId)) continue
    if (session.lastSeen < minTs) continue
    tokensInput  += session.tokensInput
    tokensOutput += session.tokensOutput
    tokensCache  += session.tokensCache
    activeTimeMs += session.durationActiveMs
    sessionSet.add(session.sessionId)

    // Estimar solo si no llegaron métricas de coste reales para esta sesión
    if (!sessionsWithCost.has(session.sessionId)) {
      cost += estimateCost(session.model, session.tokensInput, session.tokensOutput, session.tokensCache)
    }
  }

  // Commits, PRs y líneas desde timeseries
  let commits      = 0
  let pullRequests = 0
  let linesAdded   = 0
  let linesRemoved = 0

  const tsMap = {
    'claude_code.commits':       (v) => { commits += v },
    'claude_code.pull_requests': (v) => { pullRequests += v },
    'claude_code.lines_added':   (v) => { linesAdded += v },
    'claude_code.lines_removed': (v) => { linesRemoved += v }
  }

  for (const [metric, accum] of Object.entries(tsMap)) {
    for (const point of state.timeseries.get(metric) ?? []) {
      if (point.ts >= minTs) accum(point.value)
    }
  }

  const efficiency = tokensInput > 0 ? tokensOutput / tokensInput : 0

  // Proyecto más reciente con nombre asignado dentro del rango
  let currentProject = null
  let latestProjectTs = -1
  for (const session of state.sessions.values()) {
    if (state.ignoredSessions.has(session.sessionId)) continue
    if (session.lastSeen < minTs) continue
    const proj = resolveProject(session.sessionId, session.project)
    if (proj && session.lastSeen > latestProjectTs) {
      latestProjectTs = session.lastSeen
      currentProject = proj
    }
  }

  return {
    tokens: { input: tokensInput, output: tokensOutput, cache: tokensCache },
    cost,
    activeTimeMs,
    sessions:     sessionSet.size,
    commits,
    pullRequests,
    linesAdded,
    linesRemoved,
    efficiency,
    currentProject
  }
}

/**
 * Serie temporal de una métrica, agrupada en buckets.
 * @param {string} metric
 * @param {string} from
 * @param {string} bucket
 * @returns {Array<{timestamp, value}>}
 */
export function getTimeseries(metric, from, bucket) {
  const minTs    = parseTimeRange(from)
  const bucketMs = parseBucket(bucket)
  const points   = state.timeseries.get(metric) ?? []

  const buckets = new Map()
  for (const point of points) {
    if (point.ts < minTs) continue
    const key = Math.floor(point.ts / bucketMs) * bucketMs
    buckets.set(key, (buckets.get(key) ?? 0) + point.value)
  }

  return Array.from(buckets.entries())
    .map(([timestamp, value]) => ({ timestamp, value }))
    .sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Proyectos con sus métricas agregadas filtradas por rango temporal.
 * @param {string} from
 */
/**
 * Serie temporal de una métrica desglosada por proyecto.
 * Devuelve [{ timestamp, projects: { [projectName]: value } }]
 */
export function getTimeseriesByProject(metric, from, bucket) {
  const minTs    = parseTimeRange(from)
  const bucketMs = parseBucket(bucket)
  const points   = state.timeseries.get(metric) ?? []

  // Map: bucketKey → Map<projectName, value>
  const buckets = new Map()
  for (const point of points) {
    if (point.ts < minTs) continue
    const sid = point.labels['session.id']
    if (sid && state.ignoredSessions.has(sid)) continue
    const proj = resolveProject(sid, point.labels.project) ?? '(sin proyecto)'
    const key  = Math.floor(point.ts / bucketMs) * bucketMs
    if (!buckets.has(key)) buckets.set(key, new Map())
    const byProj = buckets.get(key)
    byProj.set(proj, (byProj.get(proj) ?? 0) + point.value)
  }

  return Array.from(buckets.entries())
    .map(([timestamp, byProj]) => ({
      timestamp,
      projects: Object.fromEntries(byProj),
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
}

export function getProjects(from) {
  const minTs  = parseTimeRange(from)
  const result = []

  // Pre-agregar commits/líneas desde timeseries en un único recorrido O(puntos)
  // en lugar de O(proyectos × puntos)
  const tsAgg = new Map() // projectName → { commits, linesAdded, linesRemoved }
  for (const [metric, field] of [
    ['claude_code.commits',       'commits'],
    ['claude_code.lines_added',   'linesAdded'],
    ['claude_code.lines_removed', 'linesRemoved'],
  ]) {
    for (const point of state.timeseries.get(metric) ?? []) {
      if (point.ts < minTs) continue
      const proj = resolveProject(point.labels['session.id'], point.labels.project)
      if (!proj) continue
      if (!tsAgg.has(proj)) tsAgg.set(proj, { commits: 0, linesAdded: 0, linesRemoved: 0 })
      tsAgg.get(proj)[field] += point.value
    }
  }

  // Coste por proyecto desde timeseries (filtrado por timestamp)
  const projectCostTs  = new Map() // projectName → cost acumulado en timeseries
  const sessionHasCost = new Set() // sessionIds con coste real en el rango

  for (const point of state.timeseries.get('claude_code.cost') ?? []) {
    if (point.ts < minTs) continue
    const sid = point.labels['session.id']
    if (sid && state.ignoredSessions.has(sid)) continue
    const proj = resolveProject(sid, point.labels.project)
    if (!proj) continue
    projectCostTs.set(proj, (projectCostTs.get(proj) ?? 0) + point.value)
    if (sid) sessionHasCost.add(sid)
  }

  for (const [project, proj] of state.projects.entries()) {
    const activeSessions = new Set()
    let cost = projectCostTs.get(project) ?? 0
    let tokensInput = 0, tokensOutput = 0, tokensCache = 0

    for (const sessionId of proj.sessions) {
      const session = state.sessions.get(sessionId)
      if (!session || session.lastSeen < minTs) continue
      activeSessions.add(sessionId)
      tokensInput  += session.tokensInput
      tokensOutput += session.tokensOutput
      tokensCache  += session.tokensCache

      // Estimar solo si no llegaron métricas de coste reales para esta sesión
      if (!sessionHasCost.has(sessionId)) {
        cost += estimateCost(session.model, session.tokensInput, session.tokensOutput, session.tokensCache)
      }
    }

    if (activeSessions.size === 0 && minTs > 0) continue

    const { commits, linesAdded, linesRemoved } = tsAgg.get(project) ?? { commits: 0, linesAdded: 0, linesRemoved: 0 }
    const cacheHitRate = tokensInput > 0 ? tokensCache / tokensInput : 0

    result.push({
      project,
      cost,
      tokensInput,
      tokensOutput,
      cacheHitRate,
      sessions:    activeSessions.size,
      commits,
      linesAdded,
      linesRemoved
    })
  }

  return result.sort((a, b) => b.cost - a.cost)
}

/**
 * Lista de sesiones, opcionalmente filtradas por proyecto.
 * @param {{ limit?, project? }} options
 */
export function getSessions({ limit = 50, project = null } = {}) {
  let sessions = Array.from(state.sessions.values())
    .filter(s => !state.ignoredSessions.has(s.sessionId))

  if (project) {
    sessions = sessions.filter(s => resolveProject(s.sessionId, s.project) === project)
  }

  sessions.sort((a, b) => b.startTime - a.startTime)

  return sessions.slice(0, limit).map(s => ({
    ...s,
    project: resolveProject(s.sessionId, s.project),
    cost: s.cost > 0
      ? s.cost
      : estimateCost(s.model, s.tokensInput, s.tokensOutput, s.tokensCache)
  }))
}

/**
 * Sesiones sin proyecto asignado y que no están ignoradas.
 */
export function getUnlabeledSessions() {
  const result = []
  for (const session of state.sessions.values()) {
    if (state.ignoredSessions.has(session.sessionId)) continue
    if (resolveProject(session.sessionId, session.project) !== null) continue
    result.push({
      sessionId:   session.sessionId,
      model:       session.model,
      timestamp:   session.startTime,
      tokensInput: session.tokensInput
    })
  }
  return result
}

/**
 * Últimos N eventos de una sesión.
 * @param {string} sessionId
 * @param {number} limit
 */
export function getSessionEvents(sessionId, limit = 100) {
  return getEvents({ limit, sessionId })
}

/**
 * Lista de eventos filtrados y ordenados cronológicamente (más recientes primero).
 * @param {{ limit?, type?, project?, sessionId? }} options
 */
export function getEvents({ limit = 200, type = null, project = null, sessionId = null } = {}) {
  // Ordenar el buffer circular por timestamp (más reciente primero)
  let events = state.events
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)

  if (type) {
    events = events.filter(e => e.eventName === type || e.eventName.includes(type))
  }
  if (project) {
    events = events.filter(e => e.project === project)
  }
  if (sessionId) {
    events = events.filter(e => e.sessionId === sessionId)
  }

  return events.slice(0, limit)
}

/**
 * Estadísticas de uso de herramientas.
 * @param {string} from
 */
export function getTools(from) {
  const minTs = parseTimeRange(from)

  const usage = Array.from(state.tools.entries()).map(([toolName, stats]) => ({
    toolName,
    count:          stats.count,
    successRate:    stats.count > 0 ? stats.successes / stats.count : 0,
    avgDurationMs:  stats.count > 0 ? stats.totalDurationMs / stats.count : 0
  })).sort((a, b) => b.count - a.count)

  // Tasa de aprobación/rechazo desde eventos en el rango
  let approved = 0
  let rejected = 0
  for (const event of state.events) {
    if (event.timestamp < minTs) continue
    if (event.eventName !== 'tool_use' && !event.eventName.includes('tool')) continue
    if (event.attributes.approved === true)  approved++
    if (event.attributes.approved === false) rejected++
  }

  return { usage, decisionRate: { approved, rejected } }
}

/**
 * Lista de agentes registrados.
 */
export function getAgents() {
  return Array.from(state.agents.values())
}

/**
 * Estadísticas por modelo ordenadas por coste descendente.
 * @param {string} from
 */
export function getModels(from) {
  return Array.from(state.models.entries())
    .map(([model, stats]) => {
      const cost = stats.cost > 0
        ? stats.cost
        : estimateCost(model, stats.tokensInput, stats.tokensOutput)
      return {
        model,
        requests:     stats.requests,
        tokensInput:  stats.tokensInput,
        tokensOutput: stats.tokensOutput,
        cost,
        avgLatencyMs: 0,
        avgTtftMs:    0
      }
    })
    .sort((a, b) => b.cost - a.cost)
}

// ─── Persistencia ─────────────────────────────────────────────────────────────

/**
 * Guarda el estado completo en disco de forma síncrona.
 * Nunca lanza excepción.
 */
export function saveSync() {
  try {
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 })

    const data = {
      timeseries:       Array.from(state.timeseries.entries()),
      sessions:         Array.from(state.sessions.values()),
      sessionMappings:  Array.from(state.sessionMappings.entries()),
      ignoredSessions:  Array.from(state.ignoredSessions),
      cumulativeValues: Array.from(state.cumulativeValues.entries()),
      events:           state.events,
      eventIndex:       state.eventIndex,
      totalEvents:      state.totalEvents,
      startTime:        state.startTime
    }

    fs.writeFileSync(dataFile, JSON.stringify(data), { mode: 0o600 })
    // Forzar permisos en archivos ya existentes (mode en writeFileSync
    // solo aplica al crear el archivo, no al sobreescribirlo)
    try { fs.chmodSync(dataDir,  0o700) } catch {}
    try { fs.chmodSync(dataFile, 0o600) } catch {}
  } catch (err) {
    console.error('[store] Error guardando datos en disco:', err.message)
  }
}

/**
 * Carga el estado desde disco al arrancar.
 * Si el archivo no existe o está corrupto, continúa con estado vacío.
 */
export function loadFromDisk() {
  try {
    const raw  = fs.readFileSync(dataFile, 'utf8')
    const data = JSON.parse(raw)

    // Restaurar timeseries (Map de arrays)
    if (Array.isArray(data.timeseries)) {
      for (const [key, points] of data.timeseries) {
        state.timeseries.set(key, points)
      }
    }

    // Restaurar sesiones
    if (Array.isArray(data.sessions)) {
      for (const session of data.sessions) {
        state.sessions.set(session.sessionId, session)
      }
    }

    // Restaurar session mappings
    if (Array.isArray(data.sessionMappings)) {
      for (const [k, v] of data.sessionMappings) {
        state.sessionMappings.set(k, v)
      }
    }

    // Restaurar sesiones ignoradas
    if (Array.isArray(data.ignoredSessions)) {
      for (const id of data.ignoredSessions) {
        state.ignoredSessions.add(id)
      }
    }

    // Restaurar baselines de métricas cumulativas (evita doble conteo al reiniciar)
    if (Array.isArray(data.cumulativeValues)) {
      for (const [k, v] of data.cumulativeValues) {
        state.cumulativeValues.set(k, v)
      }
    }

    // Restaurar buffer de eventos
    if (Array.isArray(data.events)) {
      state.events.push(...data.events)
    }
    if (typeof data.eventIndex === 'number') {
      state.eventIndex = data.eventIndex
    }
    if (typeof data.totalEvents === 'number') {
      state.totalEvents = data.totalEvents
    }
    if (typeof data.startTime === 'number') {
      state.startTime = data.startTime
    }

    // Re-aplicar mappings a sesiones (timeseries no necesitan propagación:
    // resolveProject() consulta sessionMappings primero en todos los lectores)
    for (const [sessionId, project] of state.sessionMappings.entries()) {
      if (state.sessions.has(sessionId)) {
        state.sessions.get(sessionId).project = project
      }
    }

    rebuildProjectAggregates()
  } catch (err) {
    // Archivo no existe o corrupto — arrancar limpio
    if (err.code !== 'ENOENT') {
      console.error('[store] Error cargando datos desde disco:', err.message)
    }
  }
}

/**
 * Inicia el guardado automático cada 60 segundos.
 * @returns {NodeJS.Timeout} Interval ID para cancelar si es necesario
 */
export function startAutoSave() {
  return setInterval(saveSync, 60_000)
}
