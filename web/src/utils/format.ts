/** Formatea números grandes: 1234567 → "1.2M", 1234 → "1.2K" */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(0)
}

/** Formatea costes con 2 decimales: 2.4105 → "$2.41" */
export function formatCost(n: number): string {
  return `$${n.toFixed(2)}`
}

/** Formatea duración en ms: 3_661_000 → "1h 1m", 90000 → "1m 30s" */
export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

/** Formatea tiempos relativos: "hace 2 min", "hace 3h", "ayer" */
export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60_000)
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (min < 1) return 'hace <1 min'
  if (min < 60) return `hace ${min} min`
  if (h < 24) return `hace ${h}h`
  if (d === 1) return 'ayer'
  return `hace ${d}d`
}
