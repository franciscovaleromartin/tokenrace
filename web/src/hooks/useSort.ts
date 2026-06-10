import { useState, useMemo } from 'react'

export type SortDir = 'asc' | 'desc'

/**
 * Ordenación clicable para tablas. `toggle(key)` alterna desc → asc → desc…
 * y cambiar de columna empieza siempre en desc (lo habitual en métricas).
 */
export function useSort<T>(items: T[], defaultKey: keyof T | null = null) {
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultKey)
  const [dir, setDir] = useState<SortDir>('desc')

  function toggle(key: keyof T) {
    if (key === sortKey) {
      setDir(d => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setDir('desc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return items
    const factor = dir === 'desc' ? -1 : 1
    return [...items].sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor
      return String(va ?? '').localeCompare(String(vb ?? '')) * factor
    })
  }, [items, sortKey, dir])

  /** Indicador para la cabecera: "↓" / "↑" en la columna activa */
  function indicator(key: keyof T): string {
    if (key !== sortKey) return ''
    return dir === 'desc' ? ' ↓' : ' ↑'
  }

  return { sorted, toggle, indicator }
}
