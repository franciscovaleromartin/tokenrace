import { StatCard } from './StatCard'
import { formatNumber, formatCost, formatDuration } from '../../utils/format'
import type { Summary } from '../../types'

interface StatsRowProps {
  summary: Summary
}

export function StatsRow({ summary }: StatsRowProps) {
  const stats = [
    {
      label: 'Tokens Input',
      value: formatNumber(summary.tokens.input),
      accent: 'text-accent-blue',
      sublabel: `caché: ${formatNumber(summary.tokens.cache)}`
    },
    {
      label: 'Tokens Output',
      value: formatNumber(summary.tokens.output),
      accent: 'text-accent-green',
      sublabel: `eficiencia: ${(summary.efficiency * 100).toFixed(1)}%`
    },
    {
      label: 'Coste Total',
      value: formatCost(summary.cost),
      accent: 'text-accent-purple',
    },
    {
      label: 'Tiempo Activo',
      value: formatDuration(summary.activeTimeMs),
      accent: 'text-accent-teal',
    },
    {
      label: 'Sesiones',
      value: String(summary.sessions),
      accent: 'text-text-primary',
    },
    {
      label: 'Commits',
      value: String(summary.commits),
      accent: 'text-accent-yellow',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {stats.map(stat => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}
