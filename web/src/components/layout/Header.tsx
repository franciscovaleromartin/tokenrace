import { RefreshCw } from 'lucide-react'
import { formatNumber, formatCost } from '../../utils/format'
import type { TimeRange } from '../../types'
import type { LiveRate } from '../../hooks/useLiveRate'

interface HeaderProps {
  sectionTitle: string
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
  connected: boolean
  lastSeen: number | null
  onReset: () => void
  liveRate: LiveRate
}

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: 'Hoy', value: 'now-24h' },
  { label: '7d',  value: 'now-7d' },
  { label: '30d', value: 'now-30d' },
  { label: 'Todo', value: 'all' },
]

function timeSince(ts: number | null): string {
  if (!ts) return '—'
  const diff = Date.now() - ts
  if (diff < 60_000) return 'hace <1m'
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)}h`
  return `hace ${Math.floor(diff / 86_400_000)}d`
}

export function Header({ sectionTitle, timeRange, onTimeRangeChange, connected, lastSeen, onReset, liveRate }: HeaderProps) {
  return (
    <header className="h-10 flex items-center justify-between px-4 border-b border-bg-border bg-bg-base sticky top-0 z-50">
      {/* Título de sección (el logo vive en el Sidebar; en móvil se muestra aquí) */}
      <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <span className="md:hidden text-accent-cyan font-mono">&lt;/&gt;</span>
        <span>{sectionTitle}</span>
      </div>

      {/* Live indicator + velocímetro */}
      <div className="flex items-center gap-2 text-xs">
        <span
          className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-accent-red animate-pulse' : 'bg-text-muted'}`}
        />
        <span className={connected ? 'text-accent-red' : 'text-text-muted'}>
          {connected ? 'LIVE' : 'SIN DATOS'}
        </span>
        <span className="text-text-muted">{timeSince(lastSeen)}</span>
        {liveRate.tokensPerMin > 0 && (
          <span className="hidden sm:flex items-center gap-2 ml-2 font-mono">
            <span className="text-accent-cyan">⚡ {formatNumber(liveRate.tokensPerMin)} tok/min</span>
            <span className="text-accent-purple">{formatCost(liveRate.costPerHour)}/h</span>
          </span>
        )}
      </div>

      {/* Controles derechos */}
      <div className="flex items-center gap-2">
        {/* Selector de rango */}
        <div className="flex gap-1">
          {TIME_RANGES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onTimeRangeChange(value)}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                timeRange === value
                  ? 'bg-accent-cyan text-bg-base font-semibold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Reset */}
        <button
          onClick={onReset}
          title="Resetear datos"
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-secondary hover:text-accent-orange hover:bg-bg-card transition-colors"
        >
          <RefreshCw size={12} />
          <span>Reset</span>
        </button>
      </div>
    </header>
  )
}
