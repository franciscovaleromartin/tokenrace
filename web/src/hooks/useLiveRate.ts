import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import type { TimeseriesPoint } from '../types'

export interface LiveRate {
  tokensPerMin: number
  costPerHour: number
}

const sum = (points: TimeseriesPoint[]) => points.reduce((acc, p) => acc + p.value, 0)

/**
 * Ritmo de actividad de los últimos 5 minutos: tokens/min y $/hora.
 * Se refresca al llegar datos por SSE y cada 30s (para decaer a 0 al parar).
 */
export function useLiveRate(sseVersion: number): LiveRate {
  const [rate, setRate] = useState<LiveRate>({ tokensPerMin: 0, costPerHour: 0 })

  const fetchRate = useCallback(async () => {
    try {
      const [input, output, cost] = await Promise.all([
        api.timeseries('claude_code.tokens.input',  'now-5m', '5m'),
        api.timeseries('claude_code.tokens.output', 'now-5m', '5m'),
        api.timeseries('claude_code.cost',          'now-5m', '5m'),
      ])
      setRate({
        tokensPerMin: (sum(input) + sum(output)) / 5,
        costPerHour: sum(cost) * 12,
      })
    } catch {
      // el servidor puede no estar listo aún
    }
  }, [])

  useEffect(() => {
    fetchRate()
  }, [fetchRate, sseVersion])

  useEffect(() => {
    const id = setInterval(fetchRate, 30_000)
    return () => clearInterval(id)
  }, [fetchRate])

  return rate
}
