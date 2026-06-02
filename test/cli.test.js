import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Importamos desde src/ensure-env-vars.js, NO desde bin/cli.js,
// porque bin/cli.js tiene await startServer() a nivel de módulo.
import { ensureEnvVars } from '../src/ensure-env-vars.js'

function makeTmpRc() {
  const dir = join(tmpdir(), `tokenrace-test-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return join(dir, '.zshrc')
}

test('ensureEnvVars añade las vars si el archivo rc está vacío', () => {
  const rcPath = makeTmpRc()
  writeFileSync(rcPath, '', 'utf8')

  const result = ensureEnvVars(1337, rcPath)

  assert.equal(result.added, true)
  const content = readFileSync(rcPath, 'utf8')
  assert.ok(content.includes('CLAUDE_CODE_ENABLE_TELEMETRY=1'))
  assert.ok(content.includes('OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:1337'))
})

test('ensureEnvVars no duplica si las vars ya están presentes', () => {
  const rcPath = makeTmpRc()
  writeFileSync(rcPath, 'export CLAUDE_CODE_ENABLE_TELEMETRY=1\n', 'utf8')

  const result = ensureEnvVars(1337, rcPath)

  assert.equal(result.added, false)
  const content = readFileSync(rcPath, 'utf8')
  const matches = content.match(/CLAUDE_CODE_ENABLE_TELEMETRY/g)
  assert.equal(matches?.length, 1)
})

test('ensureEnvVars crea el archivo si no existe', () => {
  const rcPath = makeTmpRc() + '_nuevo'

  const result = ensureEnvVars(1337, rcPath)

  assert.equal(result.added, true)
  const content = readFileSync(rcPath, 'utf8')
  assert.ok(content.includes('CLAUDE_CODE_ENABLE_TELEMETRY=1'))
})

test('ensureEnvVars usa el puerto correcto en el endpoint', () => {
  const rcPath = makeTmpRc()
  writeFileSync(rcPath, '', 'utf8')

  ensureEnvVars(4242, rcPath)

  const content = readFileSync(rcPath, 'utf8')
  assert.ok(content.includes('http://localhost:4242'))
  assert.ok(!content.includes('localhost:1337'))
})
