import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react'
import '@excalidraw/excalidraw/index.css'

const ExcalidrawComponent = lazy(() =>
  import('@excalidraw/excalidraw').then(m => ({ default: m.Excalidraw }))
)

let saveTimer: ReturnType<typeof setTimeout>

function saveDebounced(elements: unknown[], appState: Record<string, unknown>) {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const body = {
      elements: (elements as Array<{ isDeleted?: boolean }>).filter(el => !el.isDeleted),
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        currentItemStrokeColor: appState.currentItemStrokeColor,
      },
    }
    fetch('/api/board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})
  }, 500)
}

async function fetchBoard() {
  const r = await fetch('/api/board').catch(() => null)
  if (!r || !r.ok) return null
  return r.json().catch(() => null)
}

export function Board() {
  const [initialData, setInitialData] = useState<unknown>(undefined)
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null)

  // Carga inicial
  useEffect(() => {
    fetchBoard().then(data => {
      setInitialData(data ?? undefined)
      setLoading(false)
    })
  }, [])

  // Escucha SSE: cuando el servidor emite 'board_updated', recarga la escena
  useEffect(() => {
    const es = new EventSource('/api/stream')
    es.onmessage = async (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type !== 'board_updated') return
        const data = await fetchBoard()
        if (!data || !apiRef.current) return
        apiRef.current.updateScene({
          elements: data.elements ?? [],
          appState: data.appState ?? {},
        })
      } catch { /* ignorar */ }
    }
    return () => es.close()
  }, [])

  const handleChange = useCallback(
    (elements: unknown, appState: unknown) => {
      saveDebounced(
        elements as unknown[],
        appState as Record<string, unknown>
      )
    },
    []
  )

  if (loading) return null

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Suspense fallback={null}>
        <ExcalidrawComponent
          initialData={initialData as never}
          excalidrawAPI={(api: unknown) => { apiRef.current = api }}
          onChange={handleChange as never}
          theme="dark"
          UIOptions={{ canvasActions: { export: false, loadScene: false, saveAsImage: true } }}
        />
      </Suspense>
    </div>
  )
}
