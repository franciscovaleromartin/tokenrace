import { StatCard } from './StatCard'
import { formatNumber, formatCost, formatDuration } from '../../utils/format'
import type { Summary, Project } from '../../types'

interface StatsRowProps {
  summary: Summary
  selectedProjectData: Project | null
}

export function StatsRow({ summary, selectedProjectData }: StatsRowProps) {
  const inputTokens  = selectedProjectData?.tokensInput  ?? summary.tokens.input
  const outputTokens = selectedProjectData?.tokensOutput ?? summary.tokens.output
  const totalTokens  = summary.tokens.input + summary.tokens.output

  const stats = [
    {
      label: 'Tokens Input',
      value: formatNumber(inputTokens),
      accent: 'text-accent-blue',
      sublabel: selectedProjectData
        ? `hit rate: ${(selectedProjectData.cacheHitRate * 100).toFixed(1)}%`
        : `caché: ${formatNumber(summary.tokens.cache)}`
    },
    {
      label: 'Tokens Output',
      value: formatNumber(outputTokens),
      accent: 'text-accent-green',
      sublabel: `eficiencia: ${(summary.efficiency * 100).toFixed(1)}%`
    },
    {
      label: 'Token total',
      value: formatNumber(totalTokens),
      accent: 'text-accent-teal',
      sublabel: `i: ${formatNumber(summary.tokens.input)} / o: ${formatNumber(summary.tokens.output)}`
    },
    {
      label: 'Coste de proyecto',
      value: selectedProjectData ? formatCost(selectedProjectData.cost) : '—',
      accent: 'text-accent-orange',
    },
    {
      label: 'Coste Total',
      value: formatCost(summary.cost),
      accent: 'text-accent-purple',
    },
    {
      label: 'Tiempo Activo',
      value: formatDuration(summary.activeTimeMs),
      accent: 'text-text-secondary',
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(stat => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}
