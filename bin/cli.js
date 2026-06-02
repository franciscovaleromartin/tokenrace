#!/usr/bin/env node
import { startServer } from '../src/server.js'
import open from 'open'

const PORT = process.env.TOKENDASH_PORT ? Number(process.env.TOKENDASH_PORT) : 1337

const { server } = await startServer({ port: PORT })

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  tokendash — monitor de Claude Code
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Dashboard  →  http://localhost:${PORT}

  Activa la telemetría en Claude Code:

  export CLAUDE_CODE_ENABLE_TELEMETRY=1
  export OTEL_METRICS_EXPORTER=otlp
  export OTEL_LOGS_EXPORTER=otlp
  export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
  export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:${PORT}
  export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative

  Etiqueta tu sesión (opcional — puedes hacerlo desde la web):
  export OTEL_RESOURCE_ATTRIBUTES="project=mi-proyecto"

  Luego: claude

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

// Abrir el browser (no bloqueante — si falla, el servidor sigue corriendo)
open(`http://localhost:${PORT}`).catch(() => {})
