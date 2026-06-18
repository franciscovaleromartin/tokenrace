import { lazy, Suspense, useState, useEffect, useCallback } from 'react'
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

export function Board() {
  const [initialData, setInitialData] = useState<unknown>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/board')
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(data => {
        setInitialData(data ?? undefined)
        setLoading(false)
      })
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
          onChange={handleChange as never}
          theme="dark"
          UIOptions={{ canvasActions: { export: false, loadScene: false, saveAsImage: true } }}
        />
      </Suspense>
    </div>
  )
}
