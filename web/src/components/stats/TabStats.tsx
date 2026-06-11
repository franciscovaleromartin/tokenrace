export interface TabStat {
  label: string
  value: string
  accent?: string
}

export function TabStats({ stats }: { stats: TabStat[] }) {
  if (stats.length === 0) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
      {stats.map(s => (
        <div key={s.label} className="bg-bg-card border border-bg-border rounded-lg px-4 py-3">
          <div className="text-xs text-text-secondary uppercase tracking-wider mb-1">{s.label}</div>
          <div className={`text-xl font-mono font-bold ${s.accent ?? 'text-text-primary'}`}>{s.value}</div>
        </div>
      ))}
    </div>
  )
}
