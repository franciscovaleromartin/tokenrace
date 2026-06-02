/**
 * api.test.js
 *
 * Tests de integración para los endpoints HTTP de tokenrace.
 * Usa node:test, node:assert/strict y supertest.
 *
 * El test de SSE usa node:http.get crudo para evitar que supertest
 * cuelgue esperando el fin de una respuesta keep-alive infinita.
 */

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http, { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import supertest from 'supertest'
import { setDataPathForTesting } from '../src/store.js'
import { startServer } from '../src/server.js'

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

let app
let server
let autoSaveInterval
let testPort

/**
 * Obtiene un puerto libre en el sistema.
 */
function getFreePort() {
  return new Promise((resolve) => {
    const s = createServer()
    s.listen(0, () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
  })
}

before(async () => {
  // Redirigir datos a directorio temporal ANTES de arrancar el servidor
  const testDataDir = join(tmpdir(), `tokenrace-test-${Date.now()}`)
  mkdirSync(testDataDir, { recursive: true })
  setDataPathForTesting(join(testDataDir, 'data.json'))

  // Obtener puerto libre y arrancar servidor
  testPort = await getFreePort()
  const result = await startServer({ port: testPort })
  app = result.app
  server = result.server
  autoSaveInterval = result.autoSaveInterval
})

after(() => {
  // Limpiar interval de autosave y cerrar servidor
  clearInterval(autoSaveInterval)
  server.close()
})

// ─── Tests GET /api/status ────────────────────────────────────────────────────

test('GET /api/status devuelve estructura correcta', async () => {
  const res = await supertest(app).get('/api/status')
  assert.equal(res.status, 200)
  const body = res.body
  assert.ok('connected' in body, 'falta campo connected')
  assert.ok('lastSeen' in body, 'falta campo lastSeen')
  assert.ok('sessionCount' in body, 'falta campo sessionCount')
  assert.ok('totalEvents' in body, 'falta campo totalEvents')
  assert.ok('uptime' in body, 'falta campo uptime')
})

test('GET /api/status: connected es false cuando no hay datos', async () => {
  const res = await supertest(app).get('/api/status')
  assert.equal(res.status, 200)
  // Sin datos procesados, connected debe ser false
  assert.equal(res.body.connected, false)
})

// ─── Tests POST /v1/metrics ───────────────────────────────────────────────────

test('POST /v1/metrics responde 200 con { partialSuccess: {} }', async () => {
  const res = await supertest(app)
    .post('/v1/metrics')
    .send({ resourceMetrics: [] })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { partialSuccess: {} })
})

test('POST /v1/metrics con body malformado sigue respondiendo 200', async () => {
  const res = await supertest(app)
    .post('/v1/metrics')
    .set('Content-Type', 'application/json')
    .send('{ esto no es json valido <<<')
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { partialSuccess: {} })
})

// ─── Tests POST /v1/logs ──────────────────────────────────────────────────────

test('POST /v1/logs responde 200 con { partialSuccess: {} }', async () => {
  const res = await supertest(app)
    .post('/v1/logs')
    .send({ resourceLogs: [] })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { partialSuccess: {} })
})

// ─── Tests POST /v1/traces ────────────────────────────────────────────────────

test('POST /v1/traces responde 200 con { partialSuccess: {} }', async () => {
  const res = await supertest(app)
    .post('/v1/traces')
    .send({ resourceSpans: [] })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { partialSuccess: {} })
})

// ─── Tests GET /api/summary ───────────────────────────────────────────────────

test('GET /api/summary devuelve estructura con campos requeridos', async () => {
  const res = await supertest(app).get('/api/summary')
  assert.equal(res.status, 200)
  const body = res.body
  assert.ok('tokens' in body, 'falta campo tokens')
  assert.ok('cost' in body, 'falta campo cost')
  assert.ok('activeTimeMs' in body, 'falta campo activeTimeMs')
  assert.ok('sessions' in body, 'falta campo sessions')
})

// ─── Tests GET /api/sessions/unlabeled ───────────────────────────────────────

test('GET /api/sessions/unlabeled devuelve array', async () => {
  const res = await supertest(app).get('/api/sessions/unlabeled')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body), 'debería devolver un array')
})

test('GET /api/sessions/unlabeled no es confundida con /api/sessions/:sessionId', async () => {
  // Verificar que "unlabeled" no se trata como un :sessionId
  const res = await supertest(app).get('/api/sessions/unlabeled')
  assert.equal(res.status, 200)
  // Si fuera tratado como :sessionId/events, la ruta no coincidiría
  // y obtendríamos otro resultado. Verificamos que es un array plano.
  assert.ok(Array.isArray(res.body))
})

// ─── Tests GET /api/sessions ─────────────────────────────────────────────────

test('GET /api/sessions devuelve array', async () => {
  const res = await supertest(app).get('/api/sessions')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body))
})

test('GET /api/sessions acepta query param limit', async () => {
  const res = await supertest(app).get('/api/sessions?limit=5')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body))
  // Con estado vacío, el array tendrá 0 elementos (≤ 5)
  assert.ok(res.body.length <= 5)
})

// ─── Tests POST /api/sessions/:sessionId/label ────────────────────────────────

test('POST /api/sessions/:sessionId/label requiere body { project }', async () => {
  const res = await supertest(app)
    .post('/api/sessions/test-session-123/label')
    .send({})
  assert.equal(res.status, 400)
  assert.ok('error' in res.body)
})

test('POST /api/sessions/:sessionId/label responde { ok: true }', async () => {
  const res = await supertest(app)
    .post('/api/sessions/test-session-123/label')
    .send({ project: 'mi-proyecto' })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { ok: true })
})

test('POST /api/sessions/:sessionId/label error 400 si falta project', async () => {
  const res = await supertest(app)
    .post('/api/sessions/test-session-456/label')
    .send({ project: 123 }) // project no es string
  assert.equal(res.status, 400)
})

// ─── Tests POST /api/reset ────────────────────────────────────────────────────

test('POST /api/reset responde { ok: true }', async () => {
  const res = await supertest(app).post('/api/reset')
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { ok: true })
})

// ─── Tests GET /api/stream (SSE) ─────────────────────────────────────────────

test('GET /api/stream responde con Content-Type: text/event-stream', (t, done) => {
  // Usar node:http.request crudo para no bloquear esperando fin de respuesta
  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/stream',
      method: 'GET'
    },
    (res) => {
      assert.equal(res.statusCode, 200)
      const contentType = res.headers['content-type'] ?? ''
      assert.ok(
        contentType.includes('text/event-stream'),
        `Content-Type esperado text/event-stream, recibido: ${contentType}`
      )
      // Destruir la conexión para liberar el evento 'close' en el servidor
      req.destroy()
      done()
    }
  )
  req.on('error', (err) => {
    // Ignorar error ECONNRESET que ocurre al hacer destroy()
    if (err.code !== 'ECONNRESET') done(err)
  })
  req.end()
})
