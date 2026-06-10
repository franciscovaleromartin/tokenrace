#!/usr/bin/env node
import { startServer } from '../src/server.js'
import { ensureEnvVars } from '../src/ensure-env-vars.js'
import open from 'open'

const PORT = process.env.TOKENRACE_PORT ? Number(process.env.TOKENRACE_PORT) : 1337

const { added, rcPath } = ensureEnvVars(PORT)

const { server } = await startServer({ port: PORT })

const envStatus = added
  ? `  ✓ Variables OTLP añadidas a ${rcPath}\n  ⚠ Abre una nueva terminal y ejecuta: claude`
  : `  ✓ Variables OTLP ya presentes en ${rcPath}`

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  tokenrace — monitor de Claude Code
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Dashboard  →  http://localhost:${PORT}

${envStatus}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

// Abrir el dashboard en el navegador predeterminado del sistema
openDashboard(PORT)

// ─── helpers ────────────────────────────────────────────────────────────────

/** Abre el dashboard en el navegador predeterminado del sistema. */
function openDashboard(port) {
  const url = `http://localhost:${port}`
  open(url).catch(() => {})
}
