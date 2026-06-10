import type { TabId } from '../../types'

interface Tab {
  id: TabId
  label: string
}

const TABS: Tab[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'sessions',  label: 'Sessions' },
  { id: 'projects',  label: 'Projects' },
  { id: 'tools',     label: 'Tools' },
  { id: 'agents',    label: 'Agents' },
  { id: 'models',    label: 'Models' },
  { id: 'events',    label: 'Events' },
  { id: 'costs',     label: 'Costs' },
]

interface TabBarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="flex overflow-x-auto border-b border-bg-border bg-bg-base sticky top-10 z-40">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm whitespace-nowrap transition-colors border-b-2 ${
            activeTab === tab.id
              ? 'border-accent-green text-text-primary font-medium'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
