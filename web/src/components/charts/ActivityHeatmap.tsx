import { useState, useEffect, useRef } from 'react'
import { api } from '../../api'
import { formatNumber, formatCost } from '../../utils/format'
import type { TimeseriesPoint } from '../../types'

interface ActivityHeatmapProps {
  sseVersion: number
}

interface DayData { tokens: number; cost: number }

interface TooltipData {
  x: number
  y: number
  label: string
  tokens: number
  cost: number
}

const DAY_MS = 86_400_000
// Escala de naranjas del tema: apagado → máxima intensidad
const LEVEL_COLORS = ['#2a1d15', '#5c3a22', '#a05a2c', '#e07b39', '#ff8c4a']
const CELL = 11
const GAP = 3
const STEP = CELL + GAP
const LABEL_W = 28

function dayIndex(ts: number): number {
  return Math.floor(ts / DAY_MS)
}

export function ActivityHeatmap({ sseVersion }: ActivityHeatmapProps) {
  const [days, setDays] = useState<Map<number, DayData>>(new Map())
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Mostrar lo más reciente por defecto: scroll al extremo derecho
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [days])

  useEffect(() => {
    Promise.all([
      api.timeseries('claude_code.tokens.input',  'now-365d', '1d'),
      api.timeseries('claude_code.tokens.output', 'now-365d', '1d'),
      api.timeseries('claude_code.cost',          'now-365d', '1d'),
    ]).then(([input, output, cost]) => {
      const map = new Map<number, DayData>()
      const add = (points: TimeseriesPoint[], field: keyof DayData) => {
        for (const p of points) {
          const key = dayIndex(p.timestamp)
          const day = map.get(key) ?? { tokens: 0, cost: 0 }
          day[field] += p.value
          map.set(key, day)
        }
      }
      add(input, 'tokens')
      add(output, 'tokens')
      add(cost, 'cost')
      setDays(map)
    }).catch(() => {})
  }, [sseVersion])

  const values = [...days.values()]
  if (!values.some(d => d.tokens > 0)) {
    return (
      <div className="bg-bg-card border border-bg-border rounded-lg p-6 flex items-center justify-center h-32">
        <span className="text-text-muted text-sm">Sin datos de actividad</span>
      </div>
    )
  }

  const maxTokens = Math.max(...values.map(d => d.tokens), 1)

  // Desde el lunes de la semana de hace 364 días hasta hoy (días en UTC,
  // igual que los buckets de 1d del backend)
  const todayIdx = dayIndex(Date.now())
  const startRaw = todayIdx - 364
  const startDow = (new Date(startRaw * DAY_MS).getUTCDay() + 6) % 7 // 0 = lunes
  const startIdx = startRaw - startDow

  const allDays: number[] = []
  for (let idx = startIdx; idx <= todayIdx; idx++) allDays.push(idx)

  // Etiquetas de mes: una por cambio de mes entre semanas
  const monthLabels: { col: number; label: string }[] = []
  let lastMonth = -1
  for (let col = 0; startIdx + col * 7 <= todayIdx; col++) {
    const firstDay = new Date((startIdx + col * 7) * DAY_MS)
    const month = firstDay.getUTCMonth()
    if (month !== lastMonth) {
      monthLabels.push({
        col,
        label: firstDay.toLocaleDateString('es', { month: 'short', timeZone: 'UTC' }),
      })
      lastMonth = month
    }
  }

  function levelFor(tokens: number): number {
    if (tokens <= 0) return 0
    return Math.min(4, Math.max(1, Math.ceil((tokens / maxTokens) * 4)))
  }

  function showTooltip(e: React.MouseEvent<HTMLDivElement>, idx: number) {
    const container = e.currentTarget.closest('[data-heatmap]') as HTMLElement | null
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const cellRect = e.currentTarget.getBoundingClientRect()
    const data = days.get(idx)
    setTooltip({
      x: cellRect.left - containerRect.left + CELL / 2,
      y: cellRect.top - containerRect.top,
      label: new Date(idx * DAY_MS).toLocaleDateString('es', {
        weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
      }),
      tokens: data?.tokens ?? 0,
      cost: data?.cost ?? 0,
    })
  }

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-text-secondary mb-4">Actividad — últimos 12 meses</h3>
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div className="relative inline-block" data-heatmap onMouseLeave={() => setTooltip(null)}>
          {/* Etiquetas de mes */}
          <div className="relative h-4 mb-1" style={{ marginLeft: LABEL_W }}>
            {monthLabels.map(m => (
              <span
                key={`${m.col}-${m.label}`}
                className="absolute text-[10px] text-text-secondary capitalize"
                style={{ left: m.col * STEP }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex">
            {/* Etiquetas de día de la semana */}
            <div className="relative shrink-0" style={{ width: LABEL_W, height: 7 * STEP - GAP }}>
              {([['Lun', 0], ['Mié', 2], ['Vie', 4]] as const).map(([label, row]) => (
                <span
                  key={label}
                  className="absolute text-[10px] text-text-secondary leading-none"
                  style={{ top: row * STEP + 1 }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Cuadrícula: columnas = semanas, filas = lun–dom */}
            <div
              className="grid grid-flow-col"
              style={{
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                gridAutoColumns: `${CELL}px`,
                gap: GAP,
              }}
            >
              {allDays.map(idx => (
                <div
                  key={idx}
                  className="rounded-[2px]"
                  style={{
                    width: CELL,
                    height: CELL,
                    background: LEVEL_COLORS[levelFor(days.get(idx)?.tokens ?? 0)],
                  }}
                  onMouseEnter={e => showTooltip(e, idx)}
                />
              ))}
            </div>
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="absolute z-10 pointer-events-none px-3 py-2 rounded-md text-xs whitespace-nowrap"
              style={{
                left: tooltip.x,
                top: tooltip.y - 8,
                transform: 'translate(-50%, -100%)',
                background: '#0d0d0d',
                border: '1px solid #1a1a1a',
              }}
            >
              <div className="text-text-primary font-medium capitalize">{tooltip.label}</div>
              <div className="text-text-secondary mt-0.5">
                {formatNumber(tooltip.tokens)} tokens · {formatCost(tooltip.cost)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
