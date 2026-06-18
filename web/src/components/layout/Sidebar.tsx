import { LayoutDashboard, List, FolderGit2, Wrench, Bot, Cpu, Zap, DollarSign, PenLine } from 'lucide-react'
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
  { id: 'board',    label: 'Board',    Icon: PenLine },
]

interface SidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

interface NavButtonProps {
  id: TabId
  label: string
  Icon: typeof LayoutDashboard
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  itemClassName: string
  activeClassName: string
  inactiveClassName: string
}

// Botón de navegación compartido entre la barra de escritorio y la móvil
function NavButton({
  id,
  label,
  Icon,
  activeTab,
  onTabChange,
  itemClassName,
  activeClassName,
  inactiveClassName,
}: NavButtonProps) {
  const isActive = activeTab === id
  return (
    <button
      title={label}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => onTabChange(id)}
      className={`${itemClassName} ${isActive ? activeClassName : inactiveClassName}`}
    >
      <Icon size={18} />
    </button>
  )
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  // Barra lateral fija a la izquierda — visible en todos los anchos
  return (
    <nav className="flex flex-col items-center w-[52px] shrink-0 bg-bg-sidebar border-r border-bg-border sticky top-0 h-screen z-50">
      <div className="py-4 text-accent-cyan font-mono font-bold text-sm">&lt;/&gt;</div>
      {NAV.map(({ id, label, Icon }) => (
        <NavButton
          key={id}
          id={id}
          label={label}
          Icon={Icon}
          activeTab={activeTab}
          onTabChange={onTabChange}
          itemClassName="w-full flex justify-center py-3 border-l-2 transition-colors"
          activeClassName="border-accent-cyan bg-bg-card text-accent-cyan"
          inactiveClassName="border-transparent text-text-secondary hover:text-text-primary"
        />
      ))}
    </nav>
  )
}
