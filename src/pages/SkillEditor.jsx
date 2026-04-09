import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Save,
  Trash2,
  ArrowLeft,
  Eye,
  Code,
  GitFork,
  Download,
  History,
  Sparkles,
  ChevronDown,
  X,
} from 'lucide-react'
import { api } from '../api'
import EndpointPanel from '../components/EndpointPanel'
import MarkdownPreview from '../components/MarkdownPreview'

const categories = ['General', 'Design', 'Frontend', 'Backend', 'Quality', 'DevOps', 'Testing']

export default function SkillEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id

  const [skill, setSkill] = useState({
    name: '',
    description: '',
    content: '',
    category: 'General',
    tags: [],
    is_public: true,
  })
  const [savedSkill, setSavedSkill] = useState(null)
  const [tagInput, setTagInput] = useState('')
  const [rightPanel, setRightPanel] = useState('endpoints') // 'endpoints' | 'preview' | 'versions' | 'optimizer'
  const [saving, setSaving] = useState(false)
  const [versions, setVersions] = useState([])
  const [optimizations, setOptimizations] = useState(null)
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (id) loadSkill()
  }, [id])

  async function loadSkill() {
    try {
      const res = await api.getSkill(id)
      setSkill(res.data)
      setSavedSkill(res.data)
    } catch (err) {
      console.error(err)
      navigate('/')
    }
  }

  async function loadVersions() {
    if (!id) return
    try {
      const res = await api.getVersions(id)
      setVersions(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  async function loadOptimizations() {
    if (!id) return
    try {
      const res = await api.getOptimizations(id)
      setOptimizations(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  function updateField(field, value) {
    setSkill((s) => ({ ...s, [field]: value }))
    setDirty(true)
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !skill.tags.includes(tag)) {
      updateField('tags', [...skill.tags, tag])
    }
    setTagInput('')
  }

  function removeTag(tag) {
    updateField('tags', skill.tags.filter((t) => t !== tag))
  }

  async function handleSave() {
    if (!skill.name || !skill.content) {
      alert('Name and content are required')
      return
    }
    setSaving(true)
    try {
      let res
      if (isNew) {
        res = await api.createSkill(skill)
        navigate(`/skills/${res.data.id}`, { replace: true })
      } else {
        res = await api.updateSkill(id, skill)
      }
      setSkill(res.data)
      setSavedSkill(res.data)
      setDirty(false)
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this skill? This cannot be undone.')) return
    try {
      await api.deleteSkill(id)
      navigate('/')
    } catch (err) {
      alert('Failed to delete: ' + err.message)
    }
  }

  async function handleFork() {
    try {
      const res = await api.forkSkill(id)
      navigate(`/skills/${res.data.id}`)
    } catch (err) {
      alert('Failed to fork: ' + err.message)
    }
  }

  async function handleExport() {
    try {
      const data = await api.exportSkill(id)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${skill.name.replace(/\s+/g, '-').toLowerCase()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to export: ' + err.message)
    }
  }

  async function handleViewVersion(version) {
    try {
      const res = await api.getVersion(id, version.version)
      setSelectedVersion(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  function handleRestoreVersion() {
    if (!selectedVersion) return
    updateField('content', selectedVersion.content)
    setSelectedVersion(null)
    setRightPanel('endpoints')
  }

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [skill])

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="border-b border-gray-200 px-4 py-2.5 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost btn-sm">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <input
              value={skill.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Skill name..."
              className="text-sm font-semibold text-gray-900 bg-transparent border-0 outline-none placeholder-gray-300 w-64"
            />
            {dirty && <span className="text-[10px] text-amber-500 ml-2">Unsaved changes</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <>
              <button onClick={handleFork} className="btn-ghost btn-sm" title="Fork">
                <GitFork className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleExport} className="btn-ghost btn-sm" title="Export">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDelete} className="btn-ghost btn-sm text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary btn-sm"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col border-r border-gray-200 min-w-0">
          {/* Meta Fields */}
          <div className="p-4 border-b border-gray-100 space-y-3 shrink-0">
            <input
              value={skill.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Brief description of what this skill does..."
              className="input text-xs"
            />
            <div className="flex items-center gap-3">
              <select
                value={skill.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="input w-auto text-xs"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                {skill.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="badge-blue flex items-center gap-1 cursor-pointer hover:bg-blue-100"
                    onClick={() => removeTag(tag)}
                  >
                    {tag}
                    <X className="w-2.5 h-2.5" />
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  onBlur={addTag}
                  placeholder="Add tag..."
                  className="text-xs bg-transparent outline-none w-20 placeholder-gray-400"
                />
              </div>
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={skill.is_public}
                  onChange={(e) => updateField('is_public', e.target.checked)}
                  className="rounded"
                />
                Public
              </label>
            </div>
          </div>

          {/* Markdown Editor */}
          <div className="flex-1 overflow-hidden">
            <textarea
              value={skill.content}
              onChange={(e) => updateField('content', e.target.value)}
              placeholder="# My Skill&#10;&#10;Write your skill instructions in markdown...&#10;&#10;## Guidelines&#10;&#10;- Add clear instructions&#10;- Include examples&#10;- Define expected behaviors"
              className="skill-editor w-full h-full"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right: Endpoints/Preview/Versions */}
        <div className="w-[360px] flex flex-col shrink-0 bg-white">
          {/* Panel Tabs */}
          <div className="flex border-b border-gray-200 shrink-0">
            {[
              { key: 'endpoints', label: 'Endpoints', icon: Code },
              { key: 'preview', label: 'Preview', icon: Eye },
              {
                key: 'versions',
                label: 'History',
                icon: History,
                onClick: loadVersions,
              },
              {
                key: 'optimizer',
                label: 'Optimize',
                icon: Sparkles,
                onClick: loadOptimizations,
              },
            ].map(({ key, label, icon: Icon, onClick }) => (
              <button
                key={key}
                onClick={() => {
                  setRightPanel(key)
                  onClick?.()
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                  rightPanel === key
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {rightPanel === 'endpoints' && (
              <EndpointPanel skill={savedSkill} />
            )}

            {rightPanel === 'preview' && (
              <MarkdownPreview content={skill.content} />
            )}

            {rightPanel === 'versions' && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Version History
                </h3>
                {versions.length === 0 ? (
                  <p className="text-xs text-gray-400">No version history yet</p>
                ) : (
                  versions.map((v) => (
                    <div
                      key={v.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedVersion?.version === v.version
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleViewVersion(v)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">
                          v{v.version}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(v.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">{v.change_summary}</p>
                      {selectedVersion?.version === v.version && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="max-h-40 overflow-y-auto bg-gray-900 rounded p-2 mb-2">
                            <pre className="text-[10px] text-gray-300 whitespace-pre-wrap">
                              {selectedVersion.content.slice(0, 500)}
                              {selectedVersion.content.length > 500 ? '...' : ''}
                            </pre>
                          </div>
                          <button
                            onClick={handleRestoreVersion}
                            className="btn-secondary btn-sm w-full justify-center"
                          >
                            Restore this version
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {rightPanel === 'optimizer' && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Optimization Suggestions
                </h3>
                {!optimizations ? (
                  <p className="text-xs text-gray-400">
                    {isNew ? 'Save your skill first to get suggestions' : 'Loading...'}
                  </p>
                ) : optimizations.suggestions.length === 0 ? (
                  <div className="text-center py-6">
                    <Sparkles className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Your skill looks great!</p>
                    <p className="text-xs text-gray-400">No optimization suggestions</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 text-center">
                      <div className="flex-1 bg-gray-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-gray-900">{optimizations.summary.total}</p>
                        <p className="text-[10px] text-gray-500">Total</p>
                      </div>
                      <div className="flex-1 bg-amber-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-amber-700">{optimizations.summary.high_confidence}</p>
                        <p className="text-[10px] text-gray-500">High Priority</p>
                      </div>
                    </div>
                    {optimizations.suggestions.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-lg border border-gray-200 animate-fade-in"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="badge-blue">{s.model_name}</span>
                          <span
                            className={`text-[10px] font-mono ${
                              s.confidence >= 0.8 ? 'text-amber-600' : 'text-gray-400'
                            }`}
                          >
                            {Math.round(s.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{s.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="badge-gray">{s.type.replace(/_/g, ' ')}</span>
                          {s.is_model_in_use && <span className="badge-green">In use</span>}
                        </div>
                      </div>
                    ))}
                    {optimizations.models_in_use.length > 0 && (
                      <div className="border-t border-gray-200 pt-3">
                        <h4 className="text-[10px] font-semibold text-gray-500 mb-1.5">
                          Models accessing this skill
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {optimizations.models_in_use.map((m) => (
                            <span key={m} className="badge-gray">{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
