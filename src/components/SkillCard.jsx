import { useNavigate } from 'react-router-dom'
import { FileText, Clock, Eye, Tag, GitFork, ArrowRight } from 'lucide-react'

const categoryColors = {
  Design: 'bg-pink-50 text-pink-700',
  Frontend: 'bg-blue-50 text-blue-700',
  Backend: 'bg-green-50 text-green-700',
  Quality: 'bg-purple-50 text-purple-700',
  General: 'bg-gray-100 text-gray-600',
  DevOps: 'bg-orange-50 text-orange-700',
  Testing: 'bg-cyan-50 text-cyan-700',
}

export default function SkillCard({ skill, compact = false }) {
  const navigate = useNavigate()
  const colorClass = categoryColors[skill.category] || categoryColors.General
  const timeAgo = getTimeAgo(skill.updated_at)

  if (compact) {
    return (
      <button
        onClick={() => navigate(`/skills/${skill.id}`)}
        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm font-medium text-gray-900 truncate">{skill.name}</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
        </div>
      </button>
    )
  }

  return (
    <div
      onClick={() => navigate(`/skills/${skill.id}`)}
      className="card hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group animate-fade-in"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
            <FileText className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">
              {skill.name}
            </h3>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colorClass}`}>
              {skill.category}
            </span>
          </div>
        </div>
        <span className="text-[10px] text-gray-400">v{skill.version}</span>
      </div>

      {skill.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{skill.description}</p>
      )}

      <div className="flex items-center gap-3 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </span>
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {skill.content?.length || 0} chars
        </span>
        {skill.tags?.length > 0 && (
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {skill.tags.length}
          </span>
        )}
        {skill.forked_from && (
          <span className="flex items-center gap-1">
            <GitFork className="w-3 h-3" />
            Forked
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
