import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'
import { useSSE } from './useSSE'
import type { Status, Summary, TimeRange } from '../types'

export function useMetrics(timeRange: TimeRange) {
  const [status, setStatus] = useState<Status>({
    connected: false, lastSeen: null, sessionCount: 0, totalEvents: 0, uptime: 0
  })
  const [summary, setSummary] = useState<Summary | null>(null)
  const [sseVersion, setSseVersion] = useState(0)
  const lastFetchRef = useRef<number>(0)

  const fetchData = useCallback(async () => {
    lastFetchRef.current = Date.now()
    try {
      const [s, sum] = await Promise.all([
        api.status(),
        api.summary(timeRange),
      ])
      setStatus(s)
      setSummary(sum)
    } catch {
      // el servidor puede no estar listo aún
    }
  }, [timeRange])

  // Fetch inicial y al cambiar el rango
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Al llegar un evento SSE: incrementar sseVersion (para tablas/charts) +
  // refrescar summary si los datos tienen más de 5s
  const handleSSE = useCallback((_type: string, _payload: unknown) => {
    setSseVersion(v => v + 1)
    if (Date.now() - lastFetchRef.current > 5_000) {
      fetchData()
    } else {
      api.status().then(setStatus).catch(() => {})
    }
  }, [fetchData])

  useSSE(handleSSE)

  return { status, summary, refetch: fetchData, sseVersion }
}
