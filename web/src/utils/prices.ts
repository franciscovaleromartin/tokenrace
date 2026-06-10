/**
 * prices.ts — Tabla de precios de modelos Claude (USD por millón de tokens).
 */

export interface ModelPrices {
  input:      number
  output:     number
  cacheWrite: number
  cacheRead:  number
}

export const MODEL_PRICES: Record<string, ModelPrices> = {
  'claude-fable-5':    { input: 10.00, output: 50.00, cacheWrite: 12.50, cacheRead: 1.00 },
  'claude-opus-4-8':   { input:  5.00, output: 25.00, cacheWrite:  6.25, cacheRead: 0.50 },
  'claude-sonnet-4-6': { input:  3.00, output: 15.00, cacheWrite:  3.75, cacheRead: 0.30 },
  'claude-haiku-4-5':  { input:  1.00, output:  5.00, cacheWrite:  1.25, cacheRead: 0.10 },
}

const DEFAULT_PRICES = MODEL_PRICES['claude-sonnet-4-6']

export function getPrices(modelName?: string | null): ModelPrices {
  if (!modelName) return DEFAULT_PRICES
  const lower = modelName.toLowerCase()
  if (lower.includes('fable'))  return MODEL_PRICES['claude-fable-5']
  if (lower.includes('opus'))   return MODEL_PRICES['claude-opus-4-8']
  if (lower.includes('haiku'))  return MODEL_PRICES['claude-haiku-4-5']
  if (lower.includes('sonnet')) return MODEL_PRICES['claude-sonnet-4-6']
  return DEFAULT_PRICES
}

/** Ahorro estimado por usar caché: (input_price - cache_read_price) × tokens */
export function estimateCacheSavings(tokensCacheRead: number, modelName?: string | null): number {
  const p = getPrices(modelName)
  return tokensCacheRead * (p.input - p.cacheRead) / 1_000_000
}
