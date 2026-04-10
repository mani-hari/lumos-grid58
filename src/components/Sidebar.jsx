import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  FileText,
  FolderOpen,
  BarChart3,
  Settings,
  Plus,
  LayoutTemplate,
  Github,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: FileText, label: 'Skills' },
  { to: '/connect', icon: Github, label: 'Connect' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/templates', icon: LayoutTemplate, label: 'Templates' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="h-screen flex flex-col shrink-0 transition-all duration-150 ease-in-out"
      style={{
        width: expanded ? 200 : 48,
        borderRight: '1px solid #222',
        background: '#fff',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center shrink-0"
        style={{
          height: 48,
          borderBottom: '1px solid #e5e5e5',
          padding: expanded ? '0 16px' : '0',
          justifyContent: expanded ? 'flex-start' : 'center',
        }}
      >
        {expanded ? (
          <span style={{ fontSize: 15, fontWeight: 700, color: '#000', letterSpacing: '-0.5px' }}>
            doso
          </span>
        ) : (
          <span style={{ fontSize: 15, fontWeight: 700, color: '#000' }}>
            d
          </span>
        )}
      </div>

      {/* New Button */}
      <div
        className="shrink-0"
        style={{ padding: expanded ? '12px 8px 4px' : '12px 6px 4px' }}
      >
        <button
          onClick={() => navigate('/skills/new')}
          className="btn-primary flex items-center justify-center"
          style={{
            width: '100%',
            padding: expanded ? '6px 12px' : '6px',
            fontSize: 12,
            borderRadius: 4,
          }}
        >
          <Plus className="w-4 h-4" style={{ flexShrink: 0 }} />
          {expanded && <span style={{ marginLeft: 6 }}>New</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1" style={{ padding: '8px 0' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-nav-item${isActive ? ' active' : ''}`
            }
            style={{
              padding: expanded ? '8px 12px' : '8px 0',
              justifyContent: expanded ? 'flex-start' : 'center',
              gap: expanded ? 12 : 0,
            }}
          >
            <Icon className="w-4 h-4" style={{ flexShrink: 0 }} />
            {expanded && (
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="shrink-0"
        style={{
          borderTop: '1px solid #e5e5e5',
          padding: expanded ? '8px 16px' : '8px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 10, color: '#aaa' }}>
          {expanded ? 'v0.1.0' : ''}
        </span>
      </div>
    </aside>
  )
}
