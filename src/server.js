/**
 * server.js
 *
 * Express completo en un único puerto 1337:
 * - Endpoints OTLP (/v1/*)
 * - API REST + SSE (/api/*)
 * - Archivos estáticos (dist/)
 * - SPA fallback (index.html)
 *
 * Export:
 *   startServer({ port }) → Promise<{ app, server, autoSaveInterval }>
 */

import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMetrics, parseEvents, parseTraces } from './otlp-parser.js'
import { processMetric, processEvent, processTrace, loadFromDisk, startAutoSave, saveSync } from './store.js'
import { createRouter, broadcast } from './api-routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Arranca el servidor Express.
 * @param {{ port?: number }} options
 * @returns {Promise<{ app: express.Application, server: import('node:http').Server, autoSaveInterval: NodeJS.Timeout }>}
 */
export async function startServer({ port = 1337 } = {}) {
  loadFromDisk()

  const app = express()
  app.use(express.json({ limit: '10mb' }))

  // ── Endpoints OTLP ──────────────────────────────────────────────────────────

  /**
   * POST /v1/metrics — recibe métricas en formato OTLP.
   * Siempre responde 200 { partialSuccess: {} } para que Claude Code no reintente.
   */
  app.post('/v1/metrics', (req, res) => {
    const points = parseMetrics(req.body)
    for (const point of points) {
      processMetric(point)
    }
    broadcast('metrics', { count: points.length })
    res.json({ partialSuccess: {} })
  })

  /**
   * POST /v1/logs — recibe eventos/logs en formato OTLP.
   * Siempre responde 200 { partialSuccess: {} }.
   */
  app.post('/v1/logs', (req, res) => {
    const events = parseEvents(req.body)
    for (const ev of events) {
      const stored = processEvent(ev)
      broadcast('event', stored)
    }
    res.json({ partialSuccess: {} })
  })

  /**
   * POST /v1/traces — recibe trazas en formato OTLP.
   * Siempre responde 200 { partialSuccess: {} }.
   */
  app.post('/v1/traces', (req, res) => {
    const spans = parseTraces(req.body)
    for (const span of spans) {
      processTrace(span)
    }
    broadcast('trace', { count: spans.length })
    res.json({ partialSuccess: {} })
  })

  /**
   * Middleware de error para endpoints OTLP /v1/*.
   * Si express.json() rechaza un body inválido (JSON malformado),
   * respondemos igualmente 200 { partialSuccess: {} } para que Claude Code no reintente.
   */
  // eslint-disable-next-line no-unused-vars
  app.use('/v1', (err, req, res, next) => {
    res.json({ partialSuccess: {} })
  })

  // ── API REST + SSE ──────────────────────────────────────────────────────────
  app.use(createRouter())

  // ── Archivos estáticos (web compilada) ──────────────────────────────────────
  // dist/ está en la raíz del proyecto (un nivel arriba de src/)
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))

  // SPA fallback: cualquier ruta no-API sirve index.html
  app.get(/^(?!\/api\/)/, (req, res) => {
    const indexPath = path.join(distPath, 'index.html')
    res.sendFile(indexPath, (err) => {
      if (err) res.status(404).send('Dashboard no disponible. Ejecuta: npm run build')
    })
  })

  // ── Autosave + señales de apagado ───────────────────────────────────────────
  const autoSaveInterval = startAutoSave()

  const shutdown = () => {
    clearInterval(autoSaveInterval)
    saveSync()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // ── Arrancar servidor ───────────────────────────────────────────────────────
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      resolve({ app, server, autoSaveInterval })
    })
  })
}
