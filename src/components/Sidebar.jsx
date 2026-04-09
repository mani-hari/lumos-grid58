import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Sparkles,
  FolderOpen,
  BarChart3,
  BookTemplate,
  Settings,
  Plus,
  Zap,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Skills' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/templates', icon: BookTemplate, label: 'Templates' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside className="w-56 h-screen border-r border-gray-200 bg-gray-50/50 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 leading-tight">Lumos Grid</h1>
            <p className="text-[10px] text-gray-400 leading-tight">Hosted Skills</p>
          </div>
        </div>
      </div>

      {/* New Skill Button */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={() => navigate('/skills/new')}
          className="w-full btn-primary justify-center text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          New Skill
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-200">
        <p className="text-[10px] text-gray-400">v0.1.0</p>
      </div>
    </aside>
  )
}
