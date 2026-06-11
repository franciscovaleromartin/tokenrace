import { LayoutDashboard, List, FolderGit2, Wrench, Bot, Cpu, Zap, DollarSign } from 'lucide-react'
import type { TabId } from '../../types'

const NAV: { id: TabId; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'sessions', label: 'Sessions', Icon: List },
  { id: 'projects', label: 'Projects', Icon: FolderGit2 },
  { id: 'tools',    label: 'Tools',    Icon: Wrench },
  { id: 'agents',   label: 'Agents',   Icon: Bot },
  { id: 'models',   label: 'Models',   Icon: Cpu },
  { id: 'events',   label: 'Events',   Icon: Zap },
  { id: 'costs',    label: 'Costs',    Icon: DollarSign },
]

interface SidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <>
      {/* Desktop: barra lateral fija a la izquierda */}
      <nav className="hidden md:flex flex-col items-center w-[52px] shrink-0 bg-bg-sidebar border-r border-bg-border sticky top-0 h-screen z-50">
        <div className="py-4 text-accent-cyan font-mono font-bold text-sm">&lt;/&gt;</div>
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            title={label}
            onClick={() => onTabChange(id)}
            className={`w-full flex justify-center py-3 border-l-2 transition-colors ${
              activeTab === id
                ? 'border-accent-cyan bg-bg-card text-accent-cyan'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={18} />
          </button>
        ))}
      </nav>

      {/* Móvil: barra inferior fija */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex bg-bg-sidebar border-t border-bg-border z-50">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            title={label}
            onClick={() => onTabChange(id)}
            className={`flex-1 flex justify-center py-3 border-t-2 transition-colors ${
              activeTab === id
                ? 'border-accent-cyan text-accent-cyan'
                : 'border-transparent text-text-secondary'
            }`}
          >
            <Icon size={18} />
          </button>
        ))}
      </nav>
    </>
  )
}
