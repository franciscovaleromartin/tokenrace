/**
 * otlp-parser.test.js
 * Tests para extractAttributes, parseMetrics, parseEvents y parseTraces.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  extractAttributes,
  parseMetrics,
  parseEvents,
  parseTraces
} from '../src/otlp-parser.js'

// ─── extractAttributes ────────────────────────────────────────────────────────

test('extractAttributes: convierte stringValue correctamente', () => {
  const attrs = [{ key: 'service.name', value: { stringValue: 'mi-servicio' } }]
  const result = extractAttributes(attrs)
  assert.equal(result['service.name'], 'mi-servicio')
})

test('extractAttributes: convierte intValue (string "42") a Number 42', () => {
  const attrs = [{ key: 'count', value: { intValue: '42' } }]
  const result = extractAttributes(attrs)
  assert.equal(result['count'], 42)
  assert.equal(typeof result['count'], 'number')
})

test('extractAttributes: convierte doubleValue correctamente', () => {
  const attrs = [{ key: 'cost', value: { doubleValue: 0.0012 } }]
  const result = extractAttributes(attrs)
  assert.equal(result['cost'], 0.0012)
})

test('extractAttributes: convierte boolValue correctamente', () => {
  const attrs = [{ key: 'success', value: { boolValue: true } }]
  const result = extractAttributes(attrs)
  assert.equal(result['success'], true)
})

test('extractAttributes: devuelve {} para array vacío', () => {
  assert.deepEqual(extractAttributes([]), {})
})

test('extractAttributes: devuelve {} para undefined', () => {
  assert.deepEqual(extractAttributes(undefined), {})
})

// ─── parseMetrics ─────────────────────────────────────────────────────────────

test('parseMetrics: parsea un punto sum con asInt como string', () => {
  const body = {
    resourceMetrics: [{
      resource: { attributes: [{ key: 'session.id', value: { stringValue: 'sess-1' } }] },
      scopeMetrics: [{
        metrics: [{
          name: 'claude_code.tokens.input',
          sum: {
            dataPoints: [{
              asInt: '1500',
              timeUnixNano: '1700000000000000000',
              attributes: []
            }]
          }
        }]
      }]
    }]
  }

  const result = parseMetrics(body)
  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'claude_code.tokens.input')
  assert.equal(result[0].value, 1500)
  assert.equal(typeof result[0].value, 'number')
})

test('parseMetrics: parsea un punto gauge con asDouble', () => {
  const body = {
    resourceMetrics: [{
      resource: { attributes: [] },
      scopeMetrics: [{
        metrics: [{
          name: 'claude_code.cost',
          gauge: {
            dataPoints: [{
              asDouble: 0.0045,
              timeUnixNano: '1700000000000000000',
              attributes: []
            }]
          }
        }]
      }]
    }]
  }

  const result = parseMetrics(body)
  assert.equal(result.length, 1)
  assert.equal(result[0].value, 0.0045)
})

test('parseMetrics: fusiona resource attrs y dataPoint attrs en labels', () => {
  const body = {
    resourceMetrics: [{
      resource: {
        attributes: [
          { key: 'session.id', value: { stringValue: 'sess-abc' } },
          { key: 'project',    value: { stringValue: 'mi-proyecto' } }
        ]
      },
      scopeMetrics: [{
        metrics: [{
          name: 'claude_code.tokens.input',
          sum: {
            dataPoints: [{
              asInt: 100,
              timeUnixNano: '1700000000000000000',
              attributes: [
                { key: 'model', value: { stringValue: 'claude-opus-4' } }
              ]
            }]
          }
        }]
      }]
    }]
  }

  const result = parseMetrics(body)
  assert.equal(result[0].labels['session.id'], 'sess-abc')
  assert.equal(result[0].labels['project'], 'mi-proyecto')
  assert.equal(result[0].labels['model'], 'claude-opus-4')
})

test('parseMetrics: convierte timeUnixNano a ms (dividir por 1_000_000)', () => {
  // 1700000000000 ms * 1_000_000 = 1700000000000000000 ns
  const nanos = '1700000000000000000'
  const expectedMs = 1700000000000

  const body = {
    resourceMetrics: [{
      resource: { attributes: [] },
      scopeMetrics: [{
        metrics: [{
          name: 'test.metric',
          sum: {
            dataPoints: [{
              asInt: 1,
              timeUnixNano: nanos,
              attributes: []
            }]
          }
        }]
      }]
    }]
  }

  const result = parseMetrics(body)
  assert.equal(result[0].timestamp, expectedMs)
})

test('parseMetrics: devuelve [] para body vacío {}', () => {
  const result = parseMetrics({})
  assert.deepEqual(result, [])
})

test('parseMetrics: no lanza excepción para body null', () => {
  const result = parseMetrics(null)
  assert.deepEqual(result, [])
})

test('parseMetrics: no lanza excepción para body undefined', () => {
  const result = parseMetrics(undefined)
  assert.deepEqual(result, [])
})

// ─── parseEvents ──────────────────────────────────────────────────────────────

test('parseEvents: parsea log record con event.name en attributes', () => {
  const body = {
    resourceLogs: [{
      resource: { attributes: [] },
      scopeLogs: [{
        logRecords: [{
          timeUnixNano: '1700000000000000000',
          severityText: 'INFO',
          attributes: [
            { key: 'event.name', value: { stringValue: 'api_request' } }
          ]
        }]
      }]
    }]
  }

  const result = parseEvents(body)
  assert.equal(result.length, 1)
  assert.equal(result[0].eventName, 'api_request')
  assert.equal(result[0].severity, 'INFO')
})

test('parseEvents: usa lr.body.stringValue como fallback para eventName', () => {
  const body = {
    resourceLogs: [{
      resource: { attributes: [] },
      scopeLogs: [{
        logRecords: [{
          timeUnixNano: '1700000000000000000',
          severityText: 'DEBUG',
          body: { stringValue: 'fallback_event' },
          attributes: []
        }]
      }]
    }]
  }

  const result = parseEvents(body)
  assert.equal(result[0].eventName, 'fallback_event')
})

test('parseEvents: usa "unknown" si no hay event.name ni body.stringValue', () => {
  const body = {
    resourceLogs: [{
      resource: { attributes: [] },
      scopeLogs: [{
        logRecords: [{
          timeUnixNano: '1700000000000000000',
          severityText: 'INFO',
          attributes: []
        }]
      }]
    }]
  }

  const result = parseEvents(body)
  assert.equal(result[0].eventName, 'unknown')
})

test('parseEvents: extrae sessionId desde resource attributes', () => {
  const body = {
    resourceLogs: [{
      resource: {
        attributes: [
          { key: 'session.id', value: { stringValue: 'sess-xyz' } }
        ]
      },
      scopeLogs: [{
        logRecords: [{
          timeUnixNano: '1700000000000000000',
          severityText: 'INFO',
          attributes: [
            { key: 'event.name', value: { stringValue: 'user_prompt' } }
          ]
        }]
      }]
    }]
  }

  const result = parseEvents(body)
  assert.equal(result[0].attributes['session.id'], 'sess-xyz')
})

// ─── parseTraces ──────────────────────────────────────────────────────────────

test('parseTraces: parsea un span con startTime y endTime en ms', () => {
  const body = {
    resourceSpans: [{
      resource: { attributes: [] },
      scopeSpans: [{
        spans: [{
          spanId:             'abc123',
          traceId:            'trace456',
          parentSpanId:       'parent789',
          name:               'mi-span',
          startTimeUnixNano:  '1700000000000000000',
          endTimeUnixNano:    '1700000001000000000',
          attributes:         [],
          status:             { code: 1 }
        }]
      }]
    }]
  }

  const result = parseTraces(body)
  assert.equal(result.length, 1)
  assert.equal(result[0].spanId, 'abc123')
  assert.equal(result[0].traceId, 'trace456')
  assert.equal(result[0].parentSpanId, 'parent789')
  assert.equal(result[0].name, 'mi-span')
  assert.equal(result[0].startTime, 1700000000000)
  assert.equal(result[0].endTime, 1700000001000)
  assert.deepEqual(result[0].status, { code: 1 })
})

test('parseTraces: parentSpanId es null si ausente', () => {
  const body = {
    resourceSpans: [{
      resource: { attributes: [] },
      scopeSpans: [{
        spans: [{
          spanId:            'span1',
          traceId:           'trace1',
          name:              'root-span',
          startTimeUnixNano: '1700000000000000000',
          endTimeUnixNano:   '1700000001000000000',
          attributes:        []
        }]
      }]
    }]
  }

  const result = parseTraces(body)
  assert.equal(result[0].parentSpanId, null)
})
