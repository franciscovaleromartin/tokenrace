interface StatCardProps {
  label: string
  value: string
  accent: string
  sublabel?: string
  delta?: number
}

export function StatCard({ label, value, accent, sublabel, delta }: StatCardProps) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4 flex flex-col gap-1">
      <span className="text-xs text-text-secondary uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-mono font-bold ${accent}`}>{value}</span>
      <div className="flex items-baseline gap-2">
        {delta !== undefined && (
          <span className={`text-xs font-mono ${delta >= 0 ? 'text-accent-teal' : 'text-accent-orange'}`}>
            {delta >= 0 ? '▲ +' : '▼ '}{delta.toFixed(1)}%
          </span>
        )}
        {sublabel && <span className="text-xs text-text-muted">{sublabel}</span>}
      </div>
    </div>
  )
}
