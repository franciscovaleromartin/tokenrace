/**
 * git-detector.js
 *
 * Detecta el proyecto git a partir de un path hint (directorio o fichero).
 * Usa execFile (sin shell) para evitar inyección de comandos.
 *
 * Export:
 *   detectGitProject(pathHint) → Promise<{ name, remote }|null>
 */

import { execFile } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

function git(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, timeout: 5000 }, (err, stdout) => {
      if (err) reject(err)
      else resolve(stdout.trim())
    })
  })
}

/**
 * Detecta el nombre del proyecto git a partir de un path hint.
 * @param {string} pathHint - Directorio de trabajo o ruta de fichero
 * @returns {Promise<{ name: string, remote: string|null }|null>}
 */
export async function detectGitProject(pathHint) {
  if (!pathHint) return null

  try {
    // Si es un fichero, usar su directorio
    let dir = pathHint
    try {
      if (!fs.statSync(pathHint).isDirectory()) dir = path.dirname(pathHint)
    } catch {
      dir = path.dirname(pathHint)
    }

    // Obtener el root del repositorio git
    const root = await git(['rev-parse', '--show-toplevel'], dir)

    // Intentar obtener la URL del remote origin
    let remote = null
    try {
      remote = await git(['remote', 'get-url', 'origin'], root)
    } catch { /* sin remote — usaremos el nombre del directorio */ }

    // Extraer nombre del proyecto
    // https://github.com/user/repo.git → repo
    // git@github.com:user/repo.git     → repo
    const name = remote
      ? remote.replace(/\.git$/, '').split(/[/:]/g).pop()
      : path.basename(root)

    return { name, remote: remote ?? null }
  } catch {
    return null
  }
}

/**
 * Detecta el proyecto de una sesión leyendo los archivos JSONL de Claude Code en
 * ~/.claude/projects/<ruta-encodificada>/<sessionId>.jsonl.
 * Lee las primeras líneas hasta encontrar el campo `cwd`, luego usa detectGitProject.
 *
 * Acoplado al formato de disco de Claude Code: si Claude Code cambia su esquema,
 * esta función dejará de funcionar silenciosamente (retorna null).
 *
 * @param {string} sessionId - UUID de la sesión
 * @returns {Promise<{ name: string, remote: string|null }|null>}
 */
export async function detectProjectBySessionId(sessionId) {
  if (!sessionId) return null

  const projectsDir = path.join(os.homedir(), '.claude', 'projects')

  let dirs
  try {
    dirs = fs.readdirSync(projectsDir)
  } catch {
    return null
  }

  for (const dir of dirs) {
    const sessionFile = path.join(projectsDir, dir, `${sessionId}.jsonl`)
    try {
      fs.statSync(sessionFile)
    } catch {
      continue // no existe en este directorio
    }

    // Buscar campo `cwd` en las primeras 10 líneas del transcript
    let cwd = null
    try {
      const content = fs.readFileSync(sessionFile, 'utf8')
      for (const line of content.split('\n').slice(0, 10)) {
        if (!line.trim()) continue
        try {
          const record = JSON.parse(line)
          if (typeof record.cwd === 'string' && record.cwd) {
            cwd = record.cwd
            break
          }
        } catch { /* línea no es JSON válido */ }
      }
    } catch {
      return null
    }

    if (cwd) return detectGitProject(cwd)
    return null
  }

  return null
}
