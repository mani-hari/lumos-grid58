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
  X,
  ChevronDown,
  ChevronRight,
  Zap,
  AlertTriangle,
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
  const [rightPanel, setRightPanel] = useState('endpoints')
  const [saving, setSaving] = useState(false)
  const [versions, setVersions] = useState([])
  const [optimizations, setOptimizations] = useState(null)
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [expandedSuggestion, setExpandedSuggestion] = useState(null)

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

  async function handleAnalyze() {
    if (!id) return
    setAnalyzing(true)
    try {
      const res = await api.analyzeSkill({ skill_id: id, content: skill.content })
      setAnalysis(res.data)
    } catch (err) {
      console.error('Analysis failed:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleOptimize() {
    if (!id) return
    try {
      const res = await api.optimizeSkill({ skill_id: id, content: skill.content })
      if (res.data?.optimized_content) {
        setAnalysis((prev) => ({
          ...prev,
          diff: res.data.diff,
          optimized_content: res.data.optimized_content,
        }))
      }
    } catch (err) {
      console.error('Optimize failed:', err)
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

  function applyOptimized() {
    if (analysis?.optimized_content) {
      updateField('content', analysis.optimized_content)
    }
  }

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

  const tokenEstimate = Math.ceil((skill.content?.length || 0) / 4)

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          borderBottom: '1px solid #222',
          padding: '0 16px',
          height: 48,
          background: '#fff',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="btn-ghost"
            style={{ padding: '4px 8px', textDecoration: 'none' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <input
            value={skill.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Skill name..."
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#000',
              background: 'transparent',
              border: 0,
              outline: 'none',
              width: 240,
            }}
          />
          {dirty && (
            <span style={{ fontSize: 10, color: '#D4A843', fontWeight: 500 }}>Unsaved</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Badges */}
          {savedSkill && (
            <>
              <span className="badge-gray" style={{ fontSize: 10, marginRight: 4 }}>
                v{savedSkill.version}
              </span>
              {savedSkill.health && (
                <span className="badge-gray" style={{ fontSize: 10, marginRight: 4 }}>
                  health: {savedSkill.health.score}
                </span>
              )}
              <span className="badge-gray" style={{ fontSize: 10, marginRight: 8 }}>
                ~{tokenEstimate} tokens
              </span>
            </>
          )}

          {!isNew && (
            <>
              <button
                onClick={handleFork}
                className="btn-ghost btn-sm"
                title="Fork"
                style={{ textDecoration: 'none' }}
              >
                <GitFork className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleExport}
                className="btn-ghost btn-sm"
                title="Export"
                style={{ textDecoration: 'none' }}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                className="btn-ghost btn-sm"
                title="Delete"
                style={{ textDecoration: 'none', color: '#888' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary btn-sm"
            style={{ marginLeft: 4 }}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor (60%) */}
        <div className="flex flex-col min-w-0" style={{ flex: '0 0 60%', borderRight: '1px solid #222' }}>
          {/* Meta Fields */}
          <div className="shrink-0" style={{ padding: 16, borderBottom: '1px solid #e5e5e5' }}>
            <input
              value={skill.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Brief description of what this skill does..."
              className="input"
              style={{ fontSize: 12, marginBottom: 10 }}
            />
            <div className="flex items-center gap-3">
              <select
                value={skill.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="input"
                style={{ width: 'auto', fontSize: 12 }}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                {skill.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="badge-gray flex items-center gap-1 cursor-pointer"
                    onClick={() => removeTag(tag)}
                    style={{ fontSize: 10 }}
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
                  style={{ fontSize: 12, background: 'transparent', outline: 'none', width: 80, color: '#000' }}
                />
              </div>
              <label className="flex items-center gap-1.5 whitespace-nowrap cursor-pointer" style={{ fontSize: 12, color: '#888' }}>
                <input
                  type="checkbox"
                  checked={skill.is_public}
                  onChange={(e) => updateField('is_public', e.target.checked)}
                  style={{ accentColor: '#000' }}
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
              placeholder={"# My Skill\n\nWrite your skill instructions in markdown...\n\n## Guidelines\n\n- Add clear instructions\n- Include examples\n- Define expected behaviors"}
              className="skill-editor w-full h-full"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right: Context Panel (40%) */}
        <div className="flex flex-col shrink-0" style={{ flex: '0 0 40%', background: '#fff' }}>
          {/* Panel Tabs */}
          <div className="flex shrink-0" style={{ borderBottom: '1px solid #222' }}>
            {[
              { key: 'endpoints', label: 'Endpoints', icon: Code },
              { key: 'preview', label: 'Preview', icon: Eye },
              { key: 'analysis', label: 'Analysis', icon: Sparkles },
              {
                key: 'versions',
                label: 'History',
                icon: History,
                onClick: loadVersions,
              },
            ].map(({ key, label, icon: Icon, onClick }) => (
              <button
                key={key}
                onClick={() => {
                  setRightPanel(key)
                  onClick?.()
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 0',
                  fontSize: 12,
                  fontWeight: 500,
                  background: 'transparent',
                  border: 0,
                  borderBottom: rightPanel === key ? '2px solid #000' : '2px solid transparent',
                  color: rightPanel === key ? '#000' : '#aaa',
                  cursor: 'pointer',
                  transition: 'color 100ms',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
            {rightPanel === 'endpoints' && (
              <EndpointPanel skill={savedSkill} />
            )}

            {rightPanel === 'preview' && (
              <MarkdownPreview content={skill.content} />
            )}

            {rightPanel === 'analysis' && (
              <div className="space-y-4 animate-fade-in">
                {/* Analyze button */}
                <div className="flex items-center justify-between">
                  <h3 style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Analysis
                  </h3>
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing || isNew}
                    className="btn-primary btn-sm"
                  >
                    <Zap className="w-3 h-3" />
                    {analyzing ? 'Analyzing...' : 'Analyze'}
                  </button>
                </div>

                {/* Token estimation */}
                <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, border: '1px solid #e5e5e5' }}>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 12, color: '#666' }}>Estimated tokens</span>
                    <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: '#000' }}>
                      {tokenEstimate.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: '#666' }}>Characters</span>
                    <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: '#000' }}>
                      {(skill.content?.length || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {isNew && (
                  <p style={{ fontSize: 12, color: '#aaa' }}>
                    Save your skill first to run analysis.
                  </p>
                )}

                {/* Analysis results */}
                {analysis && (
                  <>
                    {/* Contradictions */}
                    {analysis.contradictions && analysis.contradictions.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 8 }}>
                          Contradictions
                        </h4>
                        <div className="space-y-2">
                          {analysis.contradictions.map((c, i) => (
                            <div key={i} className="flex items-start gap-2" style={{ padding: 10, background: '#f5f5f5', borderRadius: 4, border: '1px solid #e5e5e5' }}>
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: '#D4A843', marginTop: 1 }} />
                              <div>
                                <span className="badge-ochre" style={{ fontSize: 10, marginBottom: 4, display: 'inline-block' }}>
                                  Contradiction
                                </span>
                                <p style={{ fontSize: 12, color: '#333', lineHeight: 1.5 }}>{c.message || c}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggestions */}
                    {analysis.suggestions && analysis.suggestions.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 8 }}>
                          Optimization Suggestions
                        </h4>
                        <div className="space-y-2">
                          {analysis.suggestions.map((s, i) => (
                            <div
                              key={i}
                              style={{
                                border: '1px solid #e5e5e5',
                                borderRadius: 4,
                                overflow: 'hidden',
                              }}
                            >
                              <button
                                className="w-full flex items-center justify-between"
                                onClick={() => setExpandedSuggestion(expandedSuggestion === i ? null : i)}
                                style={{
                                  padding: '10px 12px',
                                  background: '#f5f5f5',
                                  border: 0,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                <span style={{ fontSize: 12, color: '#000', fontWeight: 500 }}>
                                  {s.title || s.type || `Suggestion ${i + 1}`}
                                </span>
                                {expandedSuggestion === i ? (
                                  <ChevronDown className="w-3.5 h-3.5" style={{ color: '#888' }} />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" style={{ color: '#888' }} />
                                )}
                              </button>
                              {expandedSuggestion === i && (
                                <div style={{ padding: 12 }}>
                                  <p style={{ fontSize: 12, color: '#333', lineHeight: 1.6 }}>
                                    {s.message || s.description}
                                  </p>
                                  {s.confidence !== undefined && (
                                    <span className="badge-gray" style={{ fontSize: 10, marginTop: 8, display: 'inline-block' }}>
                                      {Math.round(s.confidence * 100)}% confidence
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Optimize button */}
                    <button
                      onClick={handleOptimize}
                      className="btn-secondary w-full"
                      style={{ justifyContent: 'center' }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Optimize
                    </button>

                    {/* Diff viewer */}
                    {analysis.diff && (
                      <div>
                        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                          <h4 style={{ fontSize: 11, fontWeight: 600, color: '#888' }}>
                            Suggested Changes
                          </h4>
                          <button
                            onClick={applyOptimized}
                            className="btn-primary btn-sm"
                          >
                            Apply Changes
                          </button>
                        </div>
                        <div style={{ border: '1px solid #e5e5e5', borderRadius: 4, overflow: 'hidden' }}>
                          {analysis.diff.map((line, i) => (
                            <div
                              key={i}
                              className={line.type === 'add' ? 'diff-add' : line.type === 'remove' ? 'diff-remove' : ''}
                              style={{
                                padding: line.type ? undefined : '2px 8px',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: 12,
                                lineHeight: 1.6,
                                color: line.type ? undefined : '#666',
                              }}
                            >
                              {line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  '}
                              {line.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Score summary if no contradictions/suggestions */}
                    {(!analysis.contradictions || analysis.contradictions.length === 0) &&
                     (!analysis.suggestions || analysis.suggestions.length === 0) && (
                      <div style={{ textAlign: 'center', padding: 24 }}>
                        <Sparkles className="w-8 h-8 mx-auto" style={{ color: '#000', marginBottom: 8 }} />
                        <p style={{ fontSize: 14, color: '#000', fontWeight: 500 }}>Your skill looks great!</p>
                        <p style={{ fontSize: 12, color: '#888' }}>No issues found.</p>
                      </div>
                    )}
                  </>
                )}

                {/* Legacy optimizer results */}
                {!analysis && optimizations && (
                  <div className="space-y-3">
                    {optimizations.suggestions.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 24 }}>
                        <Sparkles className="w-8 h-8 mx-auto" style={{ color: '#000', marginBottom: 8 }} />
                        <p style={{ fontSize: 14, color: '#000', fontWeight: 500 }}>Your skill looks great!</p>
                        <p style={{ fontSize: 12, color: '#888' }}>No optimization suggestions</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2 text-center">
                          <div className="flex-1" style={{ background: '#f5f5f5', borderRadius: 4, padding: 8 }}>
                            <p style={{ fontSize: 18, fontWeight: 700, color: '#000' }}>{optimizations.summary.total}</p>
                            <p style={{ fontSize: 10, color: '#888' }}>Total</p>
                          </div>
                          <div className="flex-1" style={{ background: '#f5f5f5', borderRadius: 4, padding: 8 }}>
                            <p style={{ fontSize: 18, fontWeight: 700, color: '#D4A843' }}>{optimizations.summary.high_confidence}</p>
                            <p style={{ fontSize: 10, color: '#888' }}>High Priority</p>
                          </div>
                        </div>
                        {optimizations.suggestions.map((s) => (
                          <div
                            key={s.id}
                            className="animate-fade-in"
                            style={{ padding: 12, borderRadius: 4, border: '1px solid #e5e5e5' }}
                          >
                            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                              <span className="badge-gray">{s.model_name}</span>
                              <span style={{
                                fontSize: 10,
                                fontFamily: 'JetBrains Mono, monospace',
                                color: s.confidence >= 0.8 ? '#D4A843' : '#aaa',
                              }}>
                                {Math.round(s.confidence * 100)}% confidence
                              </span>
                            </div>
                            <p style={{ fontSize: 12, color: '#333', lineHeight: 1.6 }}>{s.message}</p>
                            <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
                              <span className="badge-gray" style={{ fontSize: 10 }}>{s.type.replace(/_/g, ' ')}</span>
                              {s.is_model_in_use && <span className="badge-gray" style={{ fontSize: 10, borderColor: '#000' }}>In use</span>}
                            </div>
                          </div>
                        ))}
                        {optimizations.models_in_use.length > 0 && (
                          <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: 12 }}>
                            <h4 style={{ fontSize: 10, fontWeight: 600, color: '#888', marginBottom: 6 }}>
                              Models accessing this skill
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {optimizations.models_in_use.map((m) => (
                                <span key={m} className="badge-gray" style={{ fontSize: 10 }}>{m}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {rightPanel === 'versions' && (
              <div className="space-y-2">
                <h3 style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Version History
                </h3>
                {versions.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#aaa' }}>No version history yet</p>
                ) : (
                  versions.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        padding: 12,
                        borderRadius: 4,
                        border: selectedVersion?.version === v.version ? '1px solid #000' : '1px solid #e5e5e5',
                        background: selectedVersion?.version === v.version ? '#f5f5f5' : '#fff',
                        cursor: 'pointer',
                        transition: 'border-color 100ms',
                      }}
                      onClick={() => handleViewVersion(v)}
                    >
                      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#000' }}>
                          v{v.version}
                        </span>
                        <span style={{ fontSize: 10, color: '#aaa' }}>
                          {new Date(v.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: '#666' }}>{v.change_summary}</p>
                      {selectedVersion?.version === v.version && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e5e5' }}>
                          <div style={{ maxHeight: 160, overflowY: 'auto', background: '#000', borderRadius: 4, padding: 8, marginBottom: 8 }}>
                            <pre style={{ fontSize: 10, color: '#ddd', whiteSpace: 'pre-wrap' }}>
                              {selectedVersion.content.slice(0, 500)}
                              {selectedVersion.content.length > 500 ? '...' : ''}
                            </pre>
                          </div>
                          <button
                            onClick={handleRestoreVersion}
                            className="btn-secondary btn-sm w-full"
                            style={{ justifyContent: 'center' }}
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
          </div>
        </div>
      </div>
    </div>
  )
}
