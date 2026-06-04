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
