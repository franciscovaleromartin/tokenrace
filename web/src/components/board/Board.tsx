import { lazy, Suspense, useRef, useCallback } from 'react'
import '@excalidraw/excalidraw/index.css'

const ExcalidrawComponent = lazy(() =>
  import('@excalidraw/excalidraw').then(m => ({ default: m.Excalidraw }))
)

const STORAGE_KEY = 'tokenrace-board'

function loadInitialData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

let saveTimer: ReturnType<typeof setTimeout>

function saveDebounced(elements: unknown[], appState: Record<string, unknown>) {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          elements: (elements as Array<{ isDeleted?: boolean }>).filter(el => !el.isDeleted),
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            currentItemStrokeColor: appState.currentItemStrokeColor,
          },
        })
      )
    } catch {
      // localStorage puede lanzar si está lleno
    }
  }, 500)
}

export function Board() {
  const initialData = useRef(loadInitialData())

  const handleChange = useCallback(
    (elements: unknown, appState: unknown) => {
      saveDebounced(
        elements as unknown[],
        appState as Record<string, unknown>
      )
    },
    []
  )

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Suspense fallback={null}>
        <ExcalidrawComponent
          initialData={initialData.current}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange={handleChange as any}
          theme="dark"
          UIOptions={{ canvasActions: { export: false, loadScene: false, saveAsImage: true } }}
        />
      </Suspense>
    </div>
  )
}
