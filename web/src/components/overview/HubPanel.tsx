import type { ReactNode } from 'react'

interface HubPanelProps {
  title: string
  onViewAll?: () => void
  children: ReactNode
}

export function HubPanel({ title, onViewAll, children }: HubPanelProps) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4 flex flex-col">
      <h3 className="text-sm font-medium text-text-secondary mb-3">{title}</h3>
      <div className="flex-1">{children}</div>
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="self-start mt-3 text-xs text-link-subtle hover:text-accent-cyan transition-colors"
        >
          Ver todo →
        </button>
      )}
    </div>
  )
}
