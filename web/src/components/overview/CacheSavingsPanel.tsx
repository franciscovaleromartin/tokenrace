import { formatCost, formatNumber } from '../../utils/format'
import { estimateCacheSavings } from '../../utils/prices'
import { HubPanel } from './HubPanel'
import type { Summary } from '../../types'

export function CacheSavingsPanel({ summary }: { summary: Summary }) {
  return (
    <HubPanel title="Ahorro caché">
      <div className="flex flex-col justify-center h-full gap-1">
        <span className="text-3xl font-mono font-bold text-accent-green">
          {formatCost(estimateCacheSavings(summary.tokens.cache))}
        </span>
        <span className="text-xs text-text-muted">
          est. período · {formatNumber(summary.tokens.cache)} tokens de caché
        </span>
      </div>
    </HubPanel>
  )
}
