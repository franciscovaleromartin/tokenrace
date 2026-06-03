#!/usr/bin/env node
import { startServer } from '../src/server.js'
import { ensureEnvVars } from '../src/ensure-env-vars.js'
import open from 'open'
import { spawn } from 'node:child_process'

const PORT = process.env.TOKENRACE_PORT ? Number(process.env.TOKENRACE_PORT) : 1337
const CWD  = process.cwd()

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

// Abrir el dashboard como ventana independiente (modo app sin barra de navegación)
openDashboard(PORT)

// Abrir una nueva ventana de terminal en el directorio donde se ejecutó npx
openTerminalHere(CWD)

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Abre el dashboard en modo app (sin barra de navegación ni pestañas).
 * Intenta Chrome en macOS; si no está disponible usa el navegador por defecto.
 */
function openDashboard(port) {
  const url = `http://localhost:${port}`

  if (process.platform === 'darwin') {
    // macOS: intentar Chrome en modo app (ventana sin chrome de navegador)
    const chrome = spawn(
      'open', ['-na', 'Google Chrome', '--args', `--app=${url}`, '--new-window'],
      { detached: true, stdio: 'ignore' }
    )
    let fallbackDone = false
    const fallback = () => {
      if (fallbackDone) return
      fallbackDone = true
      // Chrome no disponible — abrir en nueva ventana del navegador por defecto
      open(url, { newInstance: true }).catch(() => open(url).catch(() => {}))
    }
    chrome.on('close', (code) => { if (code !== 0) fallback() })
    chrome.on('error', fallback)
    chrome.unref()
  } else {
    open(url, { newInstance: true }).catch(() => open(url).catch(() => {}))
  }
}

/**
 * Abre una nueva ventana de terminal en el directorio indicado.
 * Compatible con macOS, Linux (varios emuladores) y Windows.
 */
function openTerminalHere(dir) {
  try {
    if (process.platform === 'darwin') {
      // macOS: abrir Terminal.app con cd al directorio de trabajo
      // "quoted form of theDir" maneja espacios y caracteres especiales en el path
      spawn('osascript', [
        '-e', `set theDir to "${dir.replace(/\\/g, '/').replace(/"/g, '\\"')}"`,
        '-e', `tell application "Terminal" to do script "cd " & quoted form of theDir`,
      ], { detached: true, stdio: 'ignore' }).unref()

    } else if (process.platform === 'linux') {
      tryLinuxTerminal(dir, [
        ['gnome-terminal', [`--working-directory=${dir}`]],
        ['konsole',        ['--workdir', dir]],
        ['xfce4-terminal', [`--working-directory=${dir}`]],
        ['xterm',          ['-e', `bash -c "cd '${dir.replace(/'/g, "'\\''")}'; exec bash"`]],
      ])

    } else if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', 'cmd', '/K', `cd /d "${dir}"`],
        { detached: true, stdio: 'ignore', shell: true }).unref()
    }
  } catch {
    // silencioso — no bloquear el arranque si no se puede abrir la terminal
  }
}

function tryLinuxTerminal(dir, emulators, i = 0) {
  if (i >= emulators.length) return
  const [cmd, args] = emulators[i]
  const p = spawn(cmd, args, { detached: true, stdio: 'ignore' })
  p.on('error', () => tryLinuxTerminal(dir, emulators, i + 1))
  p.unref()
}
