interface StatCardProps {
  label: string
  value: string
  accent: string
  sublabel?: string
  delta?: number
  onClick?: () => void
}

export function StatCard({ label, value, accent, sublabel, delta, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      className={`bg-bg-card border border-bg-border rounded-lg p-4 flex flex-col gap-1 min-w-0 ${
        onClick ? 'cursor-pointer hover:bg-bg-card-hover hover:border-accent-cyan/40 transition-colors' : ''
      }`}
    >
      <span className="text-xs text-text-secondary uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-mono font-bold ${accent}`}>{value}</span>
      <div className="flex items-baseline gap-2">
        {delta !== undefined && (
          <span className={`text-xs font-mono ${delta >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {delta >= 0 ? '▲ +' : '▼ '}{delta.toFixed(1)}%
          </span>
        )}
        {sublabel && <span className="text-xs text-text-muted truncate min-w-0">{sublabel}</span>}
      </div>
    </div>
  )
}
