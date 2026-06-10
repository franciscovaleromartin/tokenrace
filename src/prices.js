/**
 * prices.js — Tabla de precios de modelos Claude (USD por millón de tokens).
 */

export const MODEL_PRICES = {
  'claude-fable-5':    { input: 10.00, output: 50.00, cacheWrite: 12.50, cacheRead: 1.00 },
  'claude-opus-4-8':   { input:  5.00, output: 25.00, cacheWrite:  6.25, cacheRead: 0.50 },
  'claude-sonnet-4-6': { input:  3.00, output: 15.00, cacheWrite:  3.75, cacheRead: 0.30 },
  'claude-haiku-4-5':  { input:  1.00, output:  5.00, cacheWrite:  1.25, cacheRead: 0.10 },
}

const DEFAULT_PRICES = MODEL_PRICES['claude-sonnet-4-6']

/**
 * Devuelve los precios para un nombre de modelo dado.
 * Usa pattern matching por si el nombre incluye fecha (ej: claude-sonnet-4-6-20251022).
 */
export function getPrices(modelName) {
  if (!modelName) return DEFAULT_PRICES
  const lower = modelName.toLowerCase()
  if (lower.includes('fable'))  return MODEL_PRICES['claude-fable-5']
  if (lower.includes('opus'))   return MODEL_PRICES['claude-opus-4-8']
  if (lower.includes('haiku'))  return MODEL_PRICES['claude-haiku-4-5']
  if (lower.includes('sonnet')) return MODEL_PRICES['claude-sonnet-4-6']
  return DEFAULT_PRICES
}

/**
 * Estima el coste a partir de tokens para un modelo dado.
 * @param {string|null} model
 * @param {number} tokensInput
 * @param {number} tokensOutput
 * @param {number} tokensCacheRead
 * @param {number} tokensCacheWrite
 * @returns {number} Coste estimado en USD
 */
export function estimateCost(model, tokensInput, tokensOutput, tokensCacheRead = 0, tokensCacheWrite = 0) {
  const p = getPrices(model)
  return (
    tokensInput       * p.input      / 1_000_000 +
    tokensOutput      * p.output     / 1_000_000 +
    tokensCacheRead   * p.cacheRead  / 1_000_000 +
    tokensCacheWrite  * p.cacheWrite / 1_000_000
  )
}
