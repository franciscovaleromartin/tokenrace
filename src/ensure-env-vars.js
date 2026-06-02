import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Añade las variables de entorno OTLP al archivo rc de la shell
 * si no están ya presentes.
 *
 * @param {number} port - Puerto en el que corre tokenrace
 * @param {string} [rcPathOverride] - Ruta override para tests
 * @returns {{ added: boolean, rcPath: string }}
 */
export function ensureEnvVars(port, rcPathOverride) {
  const shell = process.env.SHELL ?? ''
  const defaultRc = shell.includes('zsh')
    ? join(homedir(), '.zshrc')
    : join(homedir(), '.bashrc')
  const rcPath = rcPathOverride ?? defaultRc

  const marker = 'CLAUDE_CODE_ENABLE_TELEMETRY'
  const existing = existsSync(rcPath) ? readFileSync(rcPath, 'utf8') : ''

  if (existing.includes(marker)) {
    return { added: false, rcPath }
  }

  const block = `
# tokenrace — telemetría Claude Code
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:${port}
export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative
`
  writeFileSync(rcPath, existing + block, 'utf8')
  return { added: true, rcPath }
}
