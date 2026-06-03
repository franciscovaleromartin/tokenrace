/**
 * otlp-parser.js
 *
 * Parsea cuerpos JSON OTLP y devuelve arrays de objetos normalizados.
 * Sin estado. Sin efectos secundarios. Funciones puras.
 *
 * Claves de atributos se preservan verbatim (con puntos), ej: "session.id".
 */

/**
 * Convierte el array de atributos OTLP a un objeto plano { key: value }.
 * Los intValue pueden llegar como string — se convierten a Number.
 *
 * @param {Array|undefined} attrs - Array de { key, value: { stringValue|intValue|doubleValue|boolValue } }
 * @returns {Object} Objeto plano con las claves originales
 */
export function extractAttributes(attrs) {
  if (!attrs || attrs.length === 0) return {}

  const result = {}
  for (const attr of attrs) {
    const { key, value } = attr
    if (!key || !value) continue
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue

    if ('stringValue' in value) {
      result[key] = value.stringValue
    } else if ('intValue' in value) {
      // intValue puede llegar como string desde JSON
      result[key] = Number(value.intValue)
    } else if ('doubleValue' in value) {
      result[key] = value.doubleValue
    } else if ('boolValue' in value) {
      result[key] = value.boolValue
    }
  }
  return result
}

/**
 * Parsea el cuerpo OTLP de métricas.
 * Soporta tipos: sum, gauge, histogram.
 *
 * @param {Object} body - Cuerpo JSON del POST /v1/metrics
 * @returns {Array<{name, value, timestamp, labels}>}
 */
export function parseMetrics(body) {
  try {
    const result = []
    const resourceMetrics = body?.resourceMetrics ?? []

    for (const rm of resourceMetrics) {
      // Extraer atributos del recurso (service.name, session.id, etc.)
      const resourceAttrs = extractAttributes(rm.resource?.attributes)

      for (const sm of rm.scopeMetrics ?? []) {
        for (const metric of sm.metrics ?? []) {
          const metricName = metric.name

          // Determinar el array de dataPoints según el tipo de métrica
          let dataPoints = []
          if (metric.sum?.dataPoints) {
            dataPoints = metric.sum.dataPoints
          } else if (metric.gauge?.dataPoints) {
            dataPoints = metric.gauge.dataPoints
          } else if (metric.histogram?.dataPoints) {
            dataPoints = metric.histogram.dataPoints
          }

          for (const dp of dataPoints) {
            // Valor: preferir asInt → asDouble → sum (histogram) → 0
            let value = 0
            if ('asInt' in dp) {
              value = Number(dp.asInt)
            } else if ('asDouble' in dp) {
              value = dp.asDouble
            } else if ('sum' in dp) {
              value = dp.sum
            }

            // Timestamp en ms (timeUnixNano / 1_000_000)
            const timestamp = dp.timeUnixNano
              ? Number(dp.timeUnixNano) / 1_000_000
              : Date.now()

            // Fusionar atributos de recurso + atributos del dataPoint
            const labels = {
              ...resourceAttrs,
              ...extractAttributes(dp.attributes)
            }

            result.push({ name: metricName, value, timestamp, labels })
          }
        }
      }
    }

    return result
  } catch (err) {
    console.error('[otlp-parser] Error parseando métricas:', err.message)
    return []
  }
}

/**
 * Parsea el cuerpo OTLP de logs (eventos).
 *
 * @param {Object} body - Cuerpo JSON del POST /v1/logs
 * @returns {Array<{eventName, timestamp, severity, attributes}>}
 */
export function parseEvents(body) {
  try {
    const result = []
    const resourceLogs = body?.resourceLogs ?? []

    for (const rl of resourceLogs) {
      const resourceAttrs = extractAttributes(rl.resource?.attributes)

      for (const sl of rl.scopeLogs ?? []) {
        for (const lr of sl.logRecords ?? []) {
          const dpAttrs = extractAttributes(lr.attributes)

          // eventName: buscar en attributes["event.name"] → lr.body.stringValue → "unknown"
          const eventName = dpAttrs['event.name'] ?? lr.body?.stringValue ?? 'unknown'

          const timestamp = lr.timeUnixNano
            ? Number(lr.timeUnixNano) / 1_000_000
            : Date.now()

          const severity = lr.severityText ?? 'INFO'

          const attributes = {
            ...resourceAttrs,
            ...dpAttrs
          }

          result.push({ eventName, timestamp, severity, attributes })
        }
      }
    }

    return result
  } catch (err) {
    console.error('[otlp-parser] Error parseando eventos:', err.message)
    return []
  }
}

/**
 * Parsea el cuerpo OTLP de trazas (spans).
 *
 * @param {Object} body - Cuerpo JSON del POST /v1/traces
 * @returns {Array<{spanId, traceId, parentSpanId, name, startTime, endTime, attributes, status}>}
 */
export function parseTraces(body) {
  try {
    const result = []
    const resourceSpans = body?.resourceSpans ?? []

    for (const rs of resourceSpans) {
      const resourceAttrs = extractAttributes(rs.resource?.attributes)

      for (const ss of rs.scopeSpans ?? []) {
        for (const span of ss.spans ?? []) {
          const attributes = {
            ...resourceAttrs,
            ...extractAttributes(span.attributes)
          }

          result.push({
            spanId: span.spanId,
            traceId: span.traceId,
            // parentSpanId es null si está ausente o es string vacío
            parentSpanId: span.parentSpanId || null,
            name: span.name,
            startTime: span.startTimeUnixNano
              ? Number(span.startTimeUnixNano) / 1_000_000
              : 0,
            endTime: span.endTimeUnixNano
              ? Number(span.endTimeUnixNano) / 1_000_000
              : 0,
            attributes,
            status: span.status ?? {}
          })
        }
      }
    }

    return result
  } catch (err) {
    console.error('[otlp-parser] Error parseando trazas:', err.message)
    return []
  }
}
