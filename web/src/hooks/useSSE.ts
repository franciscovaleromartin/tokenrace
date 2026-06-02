import { useEffect } from 'react'

type SSEHandler = (type: string, payload: unknown) => void

export function useSSE(onEvent: SSEHandler) {
  useEffect(() => {
    let es: EventSource | null = null
    let retryTimeout: ReturnType<typeof setTimeout>

    function connect() {
      es = new EventSource('/api/stream')

      es.onmessage = (e) => {
        try {
          const { type, payload } = JSON.parse(e.data)
          if (type !== 'ping') onEvent(type, payload)
        } catch {
          // ignorar mensajes mal formados
        }
      }

      es.onerror = () => {
        es?.close()
        es = null
        // Reconectar tras 3 segundos
        retryTimeout = setTimeout(connect, 3_000)
      }
    }

    connect()

    return () => {
      clearTimeout(retryTimeout)
      es?.close()
    }
  }, []) // onEvent es estable — no incluir en deps para evitar re-conexiones
}
