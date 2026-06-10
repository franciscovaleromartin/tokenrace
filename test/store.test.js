/**
 * store.test.js
 * Tests para el store de tokenrace.
 *
 * Nota: reset(), ignoreSession() y labelSession() llaman a scheduleSave() (setTimeout 0)
 * que guarda en ~/.tokenrace/data.json. No llamamos startAutoSave() para evitar
 * que el proceso quede vivo tras los tests.
 */

import { test, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  processMetric,
  processEvent,
  labelSession,
  ignoreSession,
  reset,
  getStatus,
  getSummary,
  getTimeseries,
  getProjects,
  getSessions,
  getUnlabeledSessions,
  getSessionEvents,
  getEvents,
  getTools,
  getAgents,
  getModels,
  saveSync,
  loadFromDisk,
  setDataPathForTesting
} from '../src/store.js'

// Redirigir persistencia a directorio temporal para no tocar ~/.tokenrace/data.json
const testDataDir  = join(tmpdir(), `tokenrace-test-${process.pid}`)
const testDataFile = join(testDataDir, 'data.json')
mkdirSync(testDataDir, { recursive: true })
setDataPathForTesting(testDataFile)

// Resetear el estado antes de cada test para aislamiento
beforeEach(() => {
  reset()
})

after(() => {
  rmSync(testDataDir, { recursive: true, force: true })
})

// ─── getStatus ────────────────────────────────────────────────────────────────

test('getStatus: connected es false si lastSeen es null', () => {
  const status = getStatus()
  assert.equal(status.connected, false)
  assert.equal(status.lastSeen, null)
})

test('getStatus: connected es true tras processMetric', () => {
  processMetric({
    name: 'claude_code.tokens.input',
    value: 100,
    timestamp: Date.now(),
    labels: { 'session.id': 'sess-1', project: 'test' }
  })
  const status = getStatus()
  assert.equal(status.connected, true)
  assert.notEqual(status.lastSeen, null)
})

// ─── processMetric ────────────────────────────────────────────────────────────

test('processMetric: crea sesión si no existe', () => {
  const ts = Date.now()
  processMetric({
    name: 'claude_code.tokens.input',
    value: 500,
    timestamp: ts,
    labels: { 'session.id': 'sess-nueva', project: 'proj-a' }
  })
  const sessions = getSessions()
  assert.equal(sessions.length, 1)
  assert.equal(sessions[0].sessionId, 'sess-nueva')
})

test('processMetric: acumula tokensInput correctamente', () => {
  const ts = Date.now()
  processMetric({
    name: 'claude_code.tokens.input',
    value: 300,
    timestamp: ts,
    labels: { 'session.id': 'sess-acc', project: 'proj-a' }
  })
  processMetric({
    name: 'claude_code.tokens.input',
    value: 200,
    timestamp: ts + 1,
    labels: { 'session.id': 'sess-acc', project: 'proj-a' }
  })
  const sessions = getSessions()
  assert.equal(sessions[0].tokensInput, 500)
})

test('processMetric: acumula cost correctamente', () => {
  const ts = Date.now()
  processMetric({
    name: 'claude_code.cost',
    value: 0.0012,
    timestamp: ts,
    labels: { 'session.id': 'sess-cost', project: 'proj-b' }
  })
  processMetric({
    name: 'claude_code.cost',
    value: 0.0008,
    timestamp: ts + 1,
    labels: { 'session.id': 'sess-cost', project: 'proj-b' }
  })
  const sessions = getSessions()
  assert.ok(Math.abs(sessions[0].cost - 0.002) < 1e-9)
})

test('processMetric: crea entrada en projects con project de labels', () => {
  processMetric({
    name: 'claude_code.tokens.input',
    value: 100,
    timestamp: Date.now(),
    labels: { 'session.id': 'sess-p', project: 'mi-proyecto' }
  })
  const projects = getProjects('all')
  assert.equal(projects.length, 1)
  assert.equal(projects[0].project, 'mi-proyecto')
})

test('processMetric: ignora sesiones en ignoredSessions', () => {
  ignoreSession('sess-ignorada')
  processMetric({
    name: 'claude_code.tokens.input',
    value: 999,
    timestamp: Date.now(),
    labels: { 'session.id': 'sess-ignorada', project: 'proj-x' }
  })
  const sessions = getSessions()
  assert.equal(sessions.length, 0)
})

test('processMetric: normaliza claude_code.token.usage a tokens.input (delta acumulativo)', () => {
  const ts = Date.now()
  const labels = { 'session.id': 'sess-new', type: 'input', model: 'claude-haiku', query_source: 'main', project: 'p' }
  // Primer punto: cumulativo = 479 → delta = 479
  processMetric({ name: 'claude_code.token.usage', value: 479, timestamp: ts, labels })
  // Segundo punto: mismo acumulativo → delta = 0 (no nuevos tokens)
  processMetric({ name: 'claude_code.token.usage', value: 479, timestamp: ts + 1, labels })
  // Tercer punto: cumulativo crece → delta = 210
  processMetric({ name: 'claude_code.token.usage', value: 689, timestamp: ts + 2, labels })
  const sessions = getSessions()
  assert.equal(sessions[0].tokensInput, 689) // 479 + 0 + 210
})

test('processMetric: normaliza claude_code.cost.usage a cost (delta acumulativo)', () => {
  const ts = Date.now()
  const labels = { 'session.id': 'sess-cost-new', model: 'claude-haiku', query_source: 'main', project: 'p' }
  processMetric({ name: 'claude_code.cost.usage', value: 0.001, timestamp: ts, labels })
  processMetric({ name: 'claude_code.cost.usage', value: 0.001, timestamp: ts + 1, labels })
  processMetric({ name: 'claude_code.cost.usage', value: 0.003, timestamp: ts + 2, labels })
  const sessions = getSessions()
  assert.ok(Math.abs(sessions[0].cost - 0.003) < 1e-9) // 0.001 + 0 + 0.002
})

// ─── processEvent ─────────────────────────────────────────────────────────────

test('processEvent: añade evento al buffer', () => {
  const eventObj = {
    eventName: 'api_request',
    timestamp: Date.now(),
    severity: 'INFO',
    attributes: { 'session.id': 'sess-ev', project: 'proj-ev' }
  }
  processEvent(eventObj)
  const events = getEvents({ limit: 10 })
  assert.equal(events.length, 1)
  assert.equal(events[0].eventName, 'api_request')
})

test('processEvent: actualiza tool stats para tool_result events (formato Claude Code)', () => {
  processEvent({
    eventName: 'tool_result',
    timestamp: Date.now(),
    severity: 'INFO',
    attributes: {
      'session.id':    'sess-tool',
      'tool_name':     'Bash',
      'success':       'true',
      'duration_ms':   '150',
      'decision_type': 'accept'
    }
  })
  const tools = getTools('all')
  const bash = tools.usage.find(t => t.toolName === 'Bash')
  assert.ok(bash)
  assert.equal(bash.count, 1)
  assert.equal(bash.successRate, 1)
  assert.equal(bash.avgDurationMs, 150)
})

test('processEvent: devuelve el evento', () => {
  const returned = processEvent({
    eventName: 'user_prompt',
    timestamp: Date.now(),
    severity: 'INFO',
    attributes: { 'session.id': 'sess-ret', project: 'proj-ret' }
  })
  assert.equal(returned.eventName, 'user_prompt')
  assert.equal(returned.sessionId, 'sess-ret')
})

// ─── labelSession ─────────────────────────────────────────────────────────────

test('labelSession: actualiza sessionMappings', () => {
  // Crear sesión primero
  processMetric({
    name: 'claude_code.tokens.input',
    value: 100,
    timestamp: Date.now(),
    labels: { 'session.id': 'sess-label', project: null }
  })
  labelSession('sess-label', 'nuevo-proyecto')
  const sessions = getSessions()
  assert.equal(sessions[0].project, 'nuevo-proyecto')
})

test('labelSession: actualiza project en sesión existente', () => {
  const ts = Date.now()
  processMetric({
    name: 'claude_code.tokens.input',
    value: 50,
    timestamp: ts,
    labels: { 'session.id': 'sess-lbl2', project: null }
  })
  labelSession('sess-lbl2', 'proyecto-nuevo')
  const sessions = getSessions({ project: 'proyecto-nuevo' })
  assert.equal(sessions.length, 1)
  assert.equal(sessions[0].project, 'proyecto-nuevo')
})

test('labelSession: aplica retroactivamente — getProjects resuelve proyecto vía sessionMappings', () => {
  const ts = Date.now()
  // Insertar métrica sin proyecto
  processMetric({
    name: 'claude_code.tokens.input',
    value: 100,
    timestamp: ts,
    labels: { 'session.id': 'sess-retro' }
  })
  // Sin etiquetar, la sesión no aparece en ningún proyecto
  assert.equal(getProjects('all').length, 0)

  // Etiquetar — resolveProject() debe encontrar el proyecto vía sessionMappings
  labelSession('sess-retro', 'proyecto-retro')
  const projects = getProjects('all')
  assert.equal(projects.length, 1)
  assert.equal(projects[0].project, 'proyecto-retro')
})

// ─── getUnlabeledSessions ─────────────────────────────────────────────────────

test('getUnlabeledSessions: devuelve sesiones sin proyecto', () => {
  processMetric({
    name: 'claude_code.tokens.input',
    value: 100,
    timestamp: Date.now(),
    labels: { 'session.id': 'sess-sin-proj' }
  })
  const unlabeled = getUnlabeledSessions()
  assert.equal(unlabeled.length, 1)
  assert.equal(unlabeled[0].sessionId, 'sess-sin-proj')
})

test('getUnlabeledSessions: excluye sesiones ignoradas', () => {
  processMetric({
    name: 'claude_code.tokens.input',
    value: 100,
    timestamp: Date.now(),
    labels: { 'session.id': 'sess-ignorar' }
  })
  ignoreSession('sess-ignorar')
  const unlabeled = getUnlabeledSessions()
  assert.equal(unlabeled.length, 0)
})

// ─── getSummary ───────────────────────────────────────────────────────────────

test('getSummary: suma tokens de sesiones activas', () => {
  const ts = Date.now()
  processMetric({ name: 'claude_code.tokens.input',  value: 1000, timestamp: ts, labels: { 'session.id': 'sA' } })
  processMetric({ name: 'claude_code.tokens.output', value: 500,  timestamp: ts, labels: { 'session.id': 'sA' } })
  processMetric({ name: 'claude_code.tokens.input',  value: 200,  timestamp: ts, labels: { 'session.id': 'sB' } })

  const summary = getSummary('all')
  assert.equal(summary.tokens.input, 1200)
  assert.equal(summary.tokens.output, 500)
})

test('getSummary: filtra por rango de tiempo', () => {
  const oldTs = Date.now() - 10 * 86_400_000  // hace 10 días
  const newTs = Date.now()

  // Sesión antigua
  processMetric({ name: 'claude_code.tokens.input', value: 5000, timestamp: oldTs, labels: { 'session.id': 'sess-old' } })
  // Sesión reciente (lastSeen actualizado con newTs)
  processMetric({ name: 'claude_code.tokens.input', value: 100,  timestamp: newTs, labels: { 'session.id': 'sess-new' } })

  // Filtrar últimos 7 días — solo debe incluir sess-new
  const summary = getSummary('now-7d')
  assert.equal(summary.tokens.input, 100)
  assert.equal(summary.sessions, 1)
})

// ─── getTimeseries ────────────────────────────────────────────────────────────

test('getTimeseries: agrupa por bucket', () => {
  const baseTs = 1700000000000  // Timestamp fijo para reproducibilidad

  // Todos en el mismo bucket de 1h
  processMetric({ name: 'test.metric', value: 10, timestamp: baseTs,         labels: { 'session.id': 's1' } })
  processMetric({ name: 'test.metric', value: 20, timestamp: baseTs + 1000,  labels: { 'session.id': 's1' } })
  processMetric({ name: 'test.metric', value: 30, timestamp: baseTs + 2000,  labels: { 'session.id': 's1' } })

  const result = getTimeseries('test.metric', 'all', '1h')
  // Deben agruparse en un solo bucket
  assert.equal(result.length, 1)
  assert.equal(result[0].value, 60)
})

test('getTimeseries: ordena por timestamp', () => {
  const now = Date.now()
  const bucket1 = Math.floor(now / 3_600_000) * 3_600_000          // bucket actual
  const bucket2 = bucket1 - 3_600_000                              // bucket anterior

  processMetric({ name: 'ts.metric', value: 5,  timestamp: bucket1 + 100, labels: { 'session.id': 'sX' } })
  processMetric({ name: 'ts.metric', value: 10, timestamp: bucket2 + 100, labels: { 'session.id': 'sX' } })

  const result = getTimeseries('ts.metric', 'all', '1h')
  assert.ok(result.length >= 2)
  // Verificar orden ascendente
  for (let i = 1; i < result.length; i++) {
    assert.ok(result[i].timestamp > result[i - 1].timestamp)
  }
})

// ─── reset ────────────────────────────────────────────────────────────────────

test('reset: limpia todo el state', () => {
  processMetric({
    name: 'claude_code.tokens.input',
    value: 999,
    timestamp: Date.now(),
    labels: { 'session.id': 'sess-reset', project: 'proj-reset' }
  })
  processEvent({
    eventName: 'api_request',
    timestamp: Date.now(),
    severity: 'INFO',
    attributes: { 'session.id': 'sess-reset' }
  })

  reset()

  const status   = getStatus()
  const sessions = getSessions()
  const events   = getEvents()
  const summary  = getSummary('all')

  assert.equal(status.connected,    false)
  assert.equal(status.sessionCount, 0)
  assert.equal(status.totalEvents,  0)
  assert.equal(sessions.length,     0)
  assert.equal(events.length,       0)
  assert.equal(summary.tokens.input, 0)
})

// ─── ignoreSession filtra getters ─────────────────────────────────────────────

test('getSummary: excluye sesiones ignoradas con datos históricos', () => {
  const ts = Date.now()
  // Primero procesar métricas para que la sesión exista con datos
  processMetric({ name: 'claude_code.tokens.input',  value: 1000, timestamp: ts,     labels: { 'session.id': 'sess-ign-sum' } })
  processMetric({ name: 'claude_code.tokens.output', value: 500,  timestamp: ts + 1, labels: { 'session.id': 'sess-ign-sum' } })
  // Luego ignorar la sesión
  ignoreSession('sess-ign-sum')
  // getSummary debe devolver 0 tokens
  const summary = getSummary('all')
  assert.equal(summary.tokens.input,  0)
  assert.equal(summary.tokens.output, 0)
  assert.equal(summary.sessions,      0)
})

test('getStatus: sessionCount excluye sesiones ignoradas', () => {
  const ts = Date.now()
  processMetric({ name: 'claude_code.tokens.input', value: 100, timestamp: ts,     labels: { 'session.id': 'sess-a' } })
  processMetric({ name: 'claude_code.tokens.input', value: 100, timestamp: ts + 1, labels: { 'session.id': 'sess-b' } })
  assert.equal(getStatus().sessionCount, 2)

  ignoreSession('sess-a')
  assert.equal(getStatus().sessionCount, 1)
})

// ─── getAgents ─────────────────────────────────────────────────────────────────
// Claude Code no emite eventos/spans con identidad de agente: la actividad de
// subagentes (Task tool) llega como labels query_source: "subagent" + agent.name
// en las métricas de tokens y coste.

test('getAgents: agrega tokens y coste por agent.name desde métricas con query_source subagent', () => {
  const ts = Date.now()
  const labels = { 'session.id': 'sess-agents-1', model: 'claude-haiku', query_source: 'subagent', 'agent.name': 'Explore' }

  processMetric({ name: 'claude_code.tokens.input',  value: 1000, timestamp: ts,     labels })
  processMetric({ name: 'claude_code.tokens.output', value: 200,  timestamp: ts + 1, labels })
  processMetric({ name: 'claude_code.cost',          value: 0.05, timestamp: ts + 2, labels })

  // Actividad del hilo principal: no debe contar como agente
  processMetric({ name: 'claude_code.tokens.input', value: 5000, timestamp: ts + 3, labels: { 'session.id': 'sess-agents-1', query_source: 'main' } })

  const agents = getAgents()
  assert.equal(agents.length, 1)
  assert.deepEqual(agents[0], { name: 'Explore', tokensInput: 1000, tokensOutput: 200, cost: 0.05 })
})

test('getAgents: separa correctamente los deltas cumulativos de dos agent.name distintos en la misma sesión y modelo', () => {
  const ts = Date.now()
  const base = { 'session.id': 'sess-agents-2', model: 'claude-sonnet-4-6', query_source: 'subagent' }

  // Dos series cumulativas independientes (una por agente) que comparten sesión+modelo+query_source.
  // Sin agent.name en la clave de deduplicación, sus valores se mezclarían y los deltas saldrían mal.
  processMetric({ name: 'claude_code.token.usage', value: 300, timestamp: ts,     labels: { ...base, type: 'input', 'agent.name': 'programador' } })
  processMetric({ name: 'claude_code.token.usage', value: 700, timestamp: ts + 1, labels: { ...base, type: 'input', 'agent.name': 'general-purpose' } })
  processMetric({ name: 'claude_code.token.usage', value: 450, timestamp: ts + 2, labels: { ...base, type: 'input', 'agent.name': 'programador' } })
  processMetric({ name: 'claude_code.token.usage', value: 900, timestamp: ts + 3, labels: { ...base, type: 'input', 'agent.name': 'general-purpose' } })

  const agents = getAgents()
  const programador     = agents.find(a => a.name === 'programador')
  const generalPurpose  = agents.find(a => a.name === 'general-purpose')

  assert.equal(programador.tokensInput,    450) // 300 + (450 - 300)
  assert.equal(generalPurpose.tokensInput, 900) // 700 + (900 - 700)
})

test('getAgents: ordena por coste descendente', () => {
  const ts = Date.now()
  processMetric({ name: 'claude_code.cost', value: 0.01, timestamp: ts,     labels: { 'session.id': 's', query_source: 'subagent', 'agent.name': 'barato' } })
  processMetric({ name: 'claude_code.cost', value: 0.5,  timestamp: ts + 1, labels: { 'session.id': 's', query_source: 'subagent', 'agent.name': 'caro' } })

  const agents = getAgents()
  assert.deepEqual(agents.map(a => a.name), ['caro', 'barato'])
})

// ─── Persistencia de modelos ──────────────────────────────────────────────────

test('saveSync: persiste state.models en disco', () => {
  const ts = Date.now()
  processMetric({
    name: 'claude_code.tokens.input',
    value: 1000,
    timestamp: ts,
    labels: { 'session.id': 'sess-model', model: 'claude-fable-5' }
  })
  saveSync()

  const data = JSON.parse(readFileSync(testDataFile, 'utf8'))
  assert.ok(Array.isArray(data.models))
  const entry = data.models.find(([name]) => name === 'claude-fable-5')
  assert.ok(entry, 'el modelo debe estar en el archivo guardado')
  assert.equal(entry[1].tokensInput, 1000)
})

test('loadFromDisk: restaura modelos persistidos', () => {
  writeFileSync(testDataFile, JSON.stringify({
    models: [['claude-test-x', { tokensInput: 10, tokensOutput: 20, cost: 3, requests: 4 }]]
  }))
  loadFromDisk()

  const models = getModels()
  const m = models.find(x => x.model === 'claude-test-x')
  assert.ok(m, 'el modelo restaurado debe aparecer en getModels')
  assert.equal(m.cost, 3)
  assert.equal(m.requests, 4)
})

test('loadFromDisk: reconstruye modelos desde timeseries si el archivo no los trae', () => {
  writeFileSync(testDataFile, JSON.stringify({
    timeseries: [
      ['claude_code.tokens.input',  [{ ts: 1, value: 500, labels: { model: 'claude-legacy', 'session.id': 's1' } }]],
      ['claude_code.tokens.output', [{ ts: 2, value: 250, labels: { model: 'claude-legacy', 'session.id': 's1' } }]],
      ['claude_code.cost',          [{ ts: 3, value: 1.5, labels: { model: 'claude-legacy', 'session.id': 's1' } }]]
    ]
  }))
  loadFromDisk()

  const models = getModels()
  const m = models.find(x => x.model === 'claude-legacy')
  assert.ok(m, 'el modelo reconstruido debe aparecer en getModels')
  assert.equal(m.tokensInput, 500)
  assert.equal(m.tokensOutput, 250)
  assert.equal(m.cost, 1.5)
})

test('getModels: filtra por rango temporal desde timeseries', () => {
  const now = Date.now()
  const old = now - 10 * 86_400_000 // hace 10 días

  processMetric({ name: 'claude_code.tokens.input', value: 100, timestamp: old, labels: { 'session.id': 's-old', model: 'claude-viejo' } })
  processMetric({ name: 'claude_code.tokens.input', value: 200, timestamp: now, labels: { 'session.id': 's-new', model: 'claude-nuevo' } })

  // Sin rango: ambos modelos (acumulador global)
  const all = getModels()
  assert.ok(all.find(m => m.model === 'claude-viejo'))
  assert.ok(all.find(m => m.model === 'claude-nuevo'))

  // Últimas 24h: solo el modelo reciente
  const recent = getModels('now-24h')
  assert.equal(recent.find(m => m.model === 'claude-viejo'), undefined)
  const nuevo = recent.find(m => m.model === 'claude-nuevo')
  assert.ok(nuevo)
  assert.equal(nuevo.tokensInput, 200)
})
