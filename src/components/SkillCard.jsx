import { useNavigate } from 'react-router-dom'
import { FileText, Clock, Tag, GitFork } from 'lucide-react'

export default function SkillCard({ skill, compact = false }) {
  const navigate = useNavigate()
  const timeAgo = getTimeAgo(skill.updated_at)

  if (compact) {
    return (
      <button
        onClick={() => navigate(`/skills/${skill.id}`)}
        className="w-full text-left group animate-fade-in"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          border: '1px solid #e5e5e5',
          borderRadius: 4,
          background: '#fff',
          transition: 'border-color 100ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#222' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e5e5' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: '#888' }} />
          <span className="text-sm truncate" style={{ fontWeight: 500, color: '#000' }}>
            {skill.name}
          </span>
          <span className="badge-gray" style={{ fontSize: 10 }}>{skill.category}</span>
        </div>
        <div className="flex items-center gap-3" style={{ fontSize: 10, color: '#aaa' }}>
          <span>v{skill.version}</span>
          <span>{timeAgo}</span>
        </div>
      </button>
    )
  }

  return (
    <div
      onClick={() => navigate(`/skills/${skill.id}`)}
      className="animate-fade-in cursor-pointer group"
      style={{
        border: '1px solid #222',
        borderRadius: 6,
        padding: 16,
        background: '#fff',
        transition: 'background 100ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
    >
      {/* Top row: name + version */}
      <div className="flex items-start justify-between" style={{ marginBottom: 8 }}>
        <div className="min-w-0">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#000', marginBottom: 4 }}>
            {skill.name}
          </h3>
          <span className="badge-gray" style={{ fontSize: 10 }}>{skill.category}</span>
        </div>
        <span style={{ fontSize: 11, color: '#888', fontFamily: 'JetBrains Mono, monospace' }}>
          v{skill.version}
        </span>
      </div>

      {/* Description */}
      {skill.description && (
        <p style={{ fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 1.5 }} className="line-clamp-2">
          {skill.description}
        </p>
      )}

      {/* Health bar */}
      {skill.health && (
        <div style={{ marginBottom: 10 }}>
          <div className="health-bar">
            <div
              className="health-bar-fill"
              style={{ width: `${skill.health.score}%` }}
            />
          </div>
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-3" style={{ fontSize: 10, color: '#aaa' }}>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </span>
        <span>{skill.content?.length || 0} chars</span>
        {skill.tags?.length > 0 && (
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {skill.tags.length}
          </span>
        )}
        {skill.forked_from && (
          <span className="flex items-center gap-1">
            <GitFork className="w-3 h-3" />
            Fork
          </span>
        )}
      </div>
    </div>
  )
}

function getTimeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now - date) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}
