/**
 * api-routes.js
 *
 * Router Express con todos los endpoints REST, SSE y la función broadcast()
 * para emitir eventos a los clientes conectados.
 *
 * Exports:
 *   createRouter() → Express Router con todas las rutas /api/*
 *   broadcast(type, payload) → emite evento SSE a todos los clientes conectados
 */

import { Router } from 'express'
import {
  getStatus, getSummary, getTimeseries, getProjects,
  getSessions, getUnlabeledSessions, getSessionEvents,
  getEvents, getTools, getAgents, getModels,
  labelSession, ignoreSession, reset, resetProject
} from './store.js'

// ─── Clientes SSE activos ────────────────────────────────────────────────────
// Mapa de clientes SSE activos: clientId → res
const sseClients = new Map()
let _nextClientId = 0

// ─── Broadcast ───────────────────────────────────────────────────────────────

/**
 * Emite un evento SSE a todos los clientes conectados.
 * @param {string} type - Tipo de evento
 * @param {*} payload - Datos a enviar
 */
export function broadcast(type, payload) {
  const message = `data: ${JSON.stringify({ type, payload })}\n\n`
  for (const [, res] of sseClients) {
    try { res.write(message) } catch { /* cliente desconectado */ }
  }
}

// ─── Router ──────────────────────────────────────────────────────────────────

/**
 * Crea y devuelve el router Express con todas las rutas /api/*.
 * @param {{ port?: number }} options
 * @returns {Router}
 */
export function createRouter({ port = 1337 } = {}) {
  const router = Router()

  // Solo se permiten solicitudes del propio dashboard (mismo origen)
  const allowedOrigins = new Set([
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ])

  // CORS: responder solo al origen del dashboard, nunca con wildcard
  router.use((req, res, next) => {
    const origin = req.headers.origin
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }
    next()
  })

  // Guard CSRF: bloquea POST con Origin presente pero no permitido.
  // Requests sin Origin (CLI, tests, curl) pasan sin restricción.
  function requireSafeOrigin(req, res, next) {
    const origin = req.headers.origin
    if (origin && !allowedOrigins.has(origin)) {
      return res.status(403).json({ error: 'origen no permitido' })
    }
    return next()
  }

  // ── SSE ────────────────────────────────────────────────────────────────────

  /**
   * GET /api/stream
   * Endpoint SSE para recibir actualizaciones en tiempo real.
   */
  router.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const clientId = ++_nextClientId
    sseClients.set(clientId, res)

    // Heartbeat cada 15 segundos
    const heartbeat = setInterval(() => {
      try { res.write('data: {"type":"ping"}\n\n') } catch { /* ignorar */ }
    }, 15_000)

    req.on('close', () => {
      clearInterval(heartbeat)
      sseClients.delete(clientId)
    })
  })

  // ── Endpoints REST ─────────────────────────────────────────────────────────

  /** GET /api/status — estado de conexión del servidor */
  router.get('/api/status', (req, res) => {
    res.json(getStatus())
  })

  /** GET /api/summary — resumen agregado, acepta query param ?from */
  router.get('/api/summary', (req, res) => {
    res.json(getSummary(req.query.from))
  })

  /** GET /api/timeseries — serie temporal, acepta ?metric, ?from, ?bucket */
  router.get('/api/timeseries', (req, res) => {
    res.json(getTimeseries(req.query.metric, req.query.from, req.query.bucket))
  })

  /** GET /api/projects — proyectos con métricas, acepta ?from */
  router.get('/api/projects', (req, res) => {
    res.json(getProjects(req.query.from))
  })

  /**
   * GET /api/sessions/unlabeled — sesiones sin proyecto asignado.
   * ⚠️ REGISTRAR ANTES de /api/sessions/:sessionId para evitar colisiones.
   */
  router.get('/api/sessions/unlabeled', (req, res) => {
    res.json(getUnlabeledSessions())
  })

  /** GET /api/sessions — lista de sesiones, acepta ?limit, ?project */
  router.get('/api/sessions', (req, res) => {
    res.json(getSessions({
      limit: Math.min(Number(req.query.limit) || 50, 500),
      project: req.query.project || null
    }))
  })

  /** GET /api/sessions/:sessionId/events — eventos de una sesión */
  router.get('/api/sessions/:sessionId/events', (req, res) => {
    res.json(getSessionEvents(req.params.sessionId))
  })

  /** GET /api/events — eventos filtrados, acepta ?limit, ?type, ?project */
  router.get('/api/events', (req, res) => {
    res.json(getEvents({
      limit: Math.min(Number(req.query.limit) || 200, 500),
      type: req.query.type || null,
      project: req.query.project || null
    }))
  })

  /** GET /api/tools — estadísticas de herramientas, acepta ?from */
  router.get('/api/tools', (req, res) => {
    res.json(getTools(req.query.from))
  })

  /** GET /api/agents — lista de agentes registrados */
  router.get('/api/agents', (req, res) => {
    res.json(getAgents())
  })

  /** GET /api/models — estadísticas por modelo, acepta ?from */
  router.get('/api/models', (req, res) => {
    res.json(getModels(req.query.from))
  })

  /**
   * POST /api/sessions/:sessionId/label
   * Asigna un proyecto a una sesión.
   * Body: { project: string }
   */
  router.post('/api/sessions/:sessionId/label', requireSafeOrigin, (req, res) => {
    const { project } = req.body
    if (!project || typeof project !== 'string' || project.length > 200) {
      return res.status(400).json({ error: 'project inválido' })
    }
    labelSession(req.params.sessionId, project)
    broadcast('label_updated', { sessionId: req.params.sessionId, project })
    res.json({ ok: true })
  })

  /**
   * POST /api/sessions/:sessionId/ignore
   * Marca una sesión como ignorada (no aparecerá en notificaciones ni en métricas).
   */
  router.post('/api/sessions/:sessionId/ignore', requireSafeOrigin, (req, res) => {
    ignoreSession(req.params.sessionId)
    res.json({ ok: true })
  })

  /** POST /api/reset — resetea todo el estado en memoria */
  router.post('/api/reset', requireSafeOrigin, (req, res) => {
    reset()
    res.json({ ok: true })
  })

  /** POST /api/projects/:project/reset — resetea los datos de un proyecto */
  router.post('/api/projects/:project/reset', requireSafeOrigin, (req, res) => {
    const projectName = decodeURIComponent(req.params.project)
    resetProject(projectName)
    broadcast('project_reset', { project: projectName })
    res.json({ ok: true })
  })

  return router
}

