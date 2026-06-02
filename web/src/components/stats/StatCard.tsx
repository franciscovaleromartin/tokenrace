interface StatCardProps {
  label: string
  value: string
  accent: string
  sublabel?: string
}

export function StatCard({ label, value, accent, sublabel }: StatCardProps) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4 flex flex-col gap-1">
      <span className="text-xs text-text-secondary uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-mono font-bold ${accent}`}>{value}</span>
      {sublabel && <span className="text-xs text-text-muted">{sublabel}</span>}
    </div>
  )
}
