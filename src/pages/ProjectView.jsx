import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ChevronDown,
  FileText,
  FolderOpen,
  Home,
  Save,
  Globe,
  Cpu,
  Terminal,
  Copy,
  Check,
  Sparkles,
  Loader,
  AlertTriangle,
  Zap,
} from 'lucide-react'
import { api } from '../api'
import MarkdownPreview from '../components/MarkdownPreview'

// ── Helpers ──────────────────────────────────────────────

function buildFileTree(skills) {
  const root = {}
  for (const skill of skills) {
    const path = skill.tags?.[0] || skill.name
    const parts = path.split('/')
    let node = root
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]]) node[parts[i]] = { __children: {} }
      if (!node[parts[i]].__children) node[parts[i]].__children = {}
      node = node[parts[i]].__children
    }
    const filename = parts[parts.length - 1]
    node[filename] = { __skill: skill }
  }
  return root
}

function getBreadcrumbs(skill, projectName) {
  if (!skill) return [projectName]
  const path = skill.tags?.[0] || skill.name
  return [projectName, ...path.split('/')]
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      style={{ padding: 4, background: 'transparent', border: 0, cursor: 'pointer', color: copied ? '#000' : '#aaa', display: 'flex' }}
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

// ── File Tree Component ──────────────────────────────────

function TreeNode({ name, node, depth = 0, selectedId, onSelect }) {
  const [open, setOpen] = useState(true)

  if (node.__skill) {
    const skill = node.__skill
    const isSelected = selectedId === skill.id
    return (
      <button
        onClick={() => onSelect(skill)}
        className="w-full text-left flex items-center gap-1.5"
        style={{
          padding: '5px 8px',
          paddingLeft: 8 + depth * 16,
          fontSize: 12,
          color: isSelected ? '#000' : '#555',
          fontWeight: isSelected ? 600 : 400,
          background: isSelected ? '#f0f0f0' : 'transparent',
          border: 0,
          borderRadius: 3,
          cursor: 'pointer',
          transition: 'background 80ms',
        }}
        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f5f5f5' }}
        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
      >
        <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: '#D4A843' }} />
        <span className="truncate">{name}</span>
      </button>
    )
  }

  // Directory node
  const children = node.__children || node
  const entries = Object.entries(children).filter(([k]) => k !== '__children')
  if (entries.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left flex items-center gap-1.5"
        style={{
          padding: '5px 8px',
          paddingLeft: 8 + depth * 16,
          fontSize: 12,
          color: '#666',
          fontWeight: 500,
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
        }}
      >
        {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
        <FolderOpen className="w-3.5 h-3.5 shrink-0" style={{ color: '#888' }} />
        <span className="truncate">{name}</span>
      </button>
      {open && entries.map(([key, child]) => (
        <TreeNode
          key={key}
          name={key}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

// ── Floating Toolbar ──────────────────────────────────────

function FloatingToolbar({ skill }) {
  const [openPanel, setOpenPanel] = useState(null)

  if (!skill?.id) return null

  const base = window.location.origin
  const panels = [
    {
      key: 'api',
      icon: Globe,
      label: 'REST API',
      url: `${base}/api/v1/skills/${skill.id}`,
      desc: 'Full skill object as JSON',
    },
    {
      key: 'mcp',
      icon: Cpu,
      label: 'MCP Resource',
      url: `${base}/api/v1/mcp/skills/${skill.id}`,
      desc: 'MCP-compatible resource format',
    },
    {
      key: 'raw',
      icon: Terminal,
      label: 'Raw Markdown',
      url: `${base}/api/v1/skills/${skill.id}/raw`,
      desc: 'Plain text — paste in your agent',
    },
  ]

  return (
    <div style={{ position: 'absolute', right: 16, top: 16, zIndex: 10 }}>
      {/* Icon buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        background: '#fff',
        border: '1px solid #e5e5e5',
        borderRadius: 8,
        padding: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        {panels.map((p) => (
          <button
            key={p.key}
            onClick={() => setOpenPanel(openPanel === p.key ? null : p.key)}
            title={p.label}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 0,
              borderRadius: 6,
              background: openPanel === p.key ? '#f0f0f0' : 'transparent',
              cursor: 'pointer',
              color: openPanel === p.key ? '#000' : '#888',
              transition: 'all 80ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0f0' }}
            onMouseLeave={(e) => { if (openPanel !== p.key) e.currentTarget.style.background = 'transparent' }}
          >
            <p.icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Popover panel */}
      {openPanel && (() => {
        const p = panels.find((x) => x.key === openPanel)
        if (!p) return null
        return (
          <div
            className="animate-fade-in"
            style={{
              position: 'absolute',
              right: 44,
              top: 0,
              width: 300,
              background: '#fff',
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              padding: 14,
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#000' }}>{p.label}</span>
              <CopyButton text={p.url} />
            </div>
            <div style={{
              padding: '8px 10px',
              background: '#f5f5f5',
              borderRadius: 4,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              color: '#333',
              wordBreak: 'break-all',
              lineHeight: 1.5,
            }}>
              <span style={{ background: '#000', color: '#fff', padding: '1px 5px', borderRadius: 2, fontSize: 10, fontWeight: 700, marginRight: 6 }}>GET</span>
              {p.url}
            </div>
            <p style={{ fontSize: 11, color: '#888', marginTop: 8 }}>{p.desc}</p>
          </div>
        )
      })()}
    </div>
  )
}

// ── Analysis Banner ──────────────────────────────────────

function AnalysisBanner({ skills, projectId }) {
  const [status, setStatus] = useState('idle') // idle | running | done | error
  const [result, setResult] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const ranRef = useRef(false)

  useEffect(() => {
    if (skills.length === 0 || ranRef.current) return
    ranRef.current = true

    setStatus('running')
    const skillIds = skills.map((s) => s.id)
    const payload = {
      skill_ids: skillIds,
      skills: skills.map((s) => ({ id: s.id, name: s.name, content: s.content })),
    }

    api.analyzeProject(payload)
      .then((res) => {
        setResult(res.data || res)
        setStatus('done')
      })
      .catch(() => {
        // Analysis failed (likely no API key) — show a softer message
        setStatus('error')
      })
  }, [skills])

  if (status === 'idle') return null

  return (
    <div style={{
      position: 'absolute',
      bottom: 16,
      left: 16,
      right: 16,
      zIndex: 10,
    }}>
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e5e5',
          borderRadius: 8,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Header bar */}
        <button
          onClick={() => status === 'done' && setExpanded(!expanded)}
          className="w-full flex items-center gap-2"
          style={{
            padding: '10px 14px',
            background: status === 'running' ? '#fafafa' : '#fff',
            border: 0,
            cursor: status === 'done' ? 'pointer' : 'default',
            textAlign: 'left',
          }}
        >
          {status === 'running' && (
            <>
              <div className="animate-pulse-bar"><Loader className="w-3.5 h-3.5" style={{ color: '#D4A843' }} /></div>
              <span style={{ fontSize: 12, color: '#888' }}>Analyzing your skills...</span>
            </>
          )}
          {status === 'done' && (
            <>
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#D4A843' }} />
              <span style={{ fontSize: 12, color: '#000', fontWeight: 500 }}>
                Analysis complete
                {result?.suggestions?.length > 0 && (
                  <span style={{ color: '#888', fontWeight: 400 }}>
                    {' '}&mdash; {result.suggestions.length} optimization{result.suggestions.length !== 1 ? 's' : ''} found
                  </span>
                )}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#aaa' }}>
                {expanded ? 'collapse' : 'expand'}
              </span>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#aaa' }} />
              <span style={{ fontSize: 12, color: '#888' }}>
                Analysis unavailable — set ANTHROPIC_API_KEY to enable
              </span>
            </>
          )}
        </button>

        {/* Expanded details */}
        {expanded && result && (
          <div style={{ padding: '0 14px 14px', borderTop: '1px solid #f0f0f0' }}>
            {/* Contradictions */}
            {result.contradictions?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h4 style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>Contradictions</h4>
                {result.contradictions.map((c, i) => (
                  <div key={i} className="flex items-start gap-2" style={{ marginBottom: 6 }}>
                    <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: '#D4A843', marginTop: 2 }} />
                    <span style={{ fontSize: 12, color: '#333', lineHeight: 1.5 }}>{c.message || c}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h4 style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>Suggestions</h4>
                {result.suggestions.map((s, i) => (
                  <div key={i} style={{ padding: '8px 10px', background: '#f5f5f5', borderRadius: 4, marginBottom: 6 }}>
                    <div className="flex items-center gap-2">
                      <Zap className="w-3 h-3 shrink-0" style={{ color: '#D4A843' }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#000' }}>{s.title || `Suggestion ${i + 1}`}</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#666', marginTop: 4, lineHeight: 1.5, paddingLeft: 18 }}>
                      {s.message || s.description}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Coverage / summary */}
            {result.coverage && (
              <div style={{ marginTop: 12 }}>
                <h4 style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>Coverage</h4>
                <p style={{ fontSize: 12, color: '#333', lineHeight: 1.5 }}>{result.coverage}</p>
              </div>
            )}

            {(!result.contradictions?.length && !result.suggestions?.length) && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Sparkles className="w-5 h-5 mx-auto" style={{ color: '#000', marginBottom: 6 }} />
                <p style={{ fontSize: 12, color: '#888' }}>Your skills look great — no issues found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ProjectView ──────────────────────────────────────

export default function ProjectView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [skills, setSkills] = useState([])
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('edit') // edit | preview

  useEffect(() => {
    loadProject()
  }, [id])

  async function loadProject() {
    try {
      const res = await api.getProject(id)
      const data = res.data
      setProject(data)
      setSkills(data.skills || [])

      // Select first skill by default
      if (data.skills?.length > 0) {
        selectSkill(data.skills[0])
      }
    } catch (err) {
      console.error('Failed to load project:', err)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  function selectSkill(skill) {
    if (dirty) {
      if (!confirm('You have unsaved changes. Discard?')) return
    }
    setSelectedSkill(skill)
    setContent(skill.content || '')
    setDirty(false)
    setViewMode('edit')
  }

  function handleContentChange(val) {
    setContent(val)
    setDirty(true)
  }

  const handleSave = useCallback(async () => {
    if (!selectedSkill || !dirty) return
    setSaving(true)
    try {
      const res = await api.updateSkill(selectedSkill.id, { ...selectedSkill, content })
      const updated = res.data
      setSelectedSkill(updated)
      setSkills((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      setDirty(false)
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }, [selectedSkill, content, dirty])

  // Cmd+S
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse-bar">
          <Loader className="w-6 h-6" style={{ color: '#888' }} />
        </div>
      </div>
    )
  }

  const tree = buildFileTree(skills)
  const breadcrumbs = getBreadcrumbs(selectedSkill, project?.name || 'Project')
  const tokenEstimate = Math.ceil((content?.length || 0) / 4)

  return (
    <div className="h-full flex flex-col">
      {/* Top bar: breadcrumbs + save */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid #e5e5e5', padding: '0 16px', height: 44, background: '#fff' }}
      >
        <div className="flex items-center gap-1 min-w-0">
          <button
            onClick={() => navigate('/')}
            style={{ padding: 4, background: 'none', border: 0, cursor: 'pointer', color: '#888', display: 'flex' }}
            title="Home"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1" style={{ fontSize: 12, color: i === breadcrumbs.length - 1 ? '#000' : '#888' }}>
              <ChevronRight className="w-3 h-3" style={{ color: '#ddd' }} />
              <span style={{ fontWeight: i === breadcrumbs.length - 1 ? 600 : 400 }} className="truncate">{crumb}</span>
            </span>
          ))}
          {dirty && (
            <span style={{ fontSize: 10, color: '#D4A843', fontWeight: 500, marginLeft: 8 }}>Unsaved</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedSkill && (
            <>
              <span style={{ fontSize: 10, color: '#aaa', fontFamily: 'JetBrains Mono, monospace' }}>
                ~{tokenEstimate.toLocaleString()} tokens
              </span>
              <div className="flex" style={{ border: '1px solid #e5e5e5', borderRadius: 4, overflow: 'hidden' }}>
                <button
                  onClick={() => setViewMode('edit')}
                  style={{
                    padding: '4px 10px', fontSize: 11, fontWeight: 500, border: 0, cursor: 'pointer',
                    background: viewMode === 'edit' ? '#000' : '#fff',
                    color: viewMode === 'edit' ? '#fff' : '#888',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  style={{
                    padding: '4px 10px', fontSize: 11, fontWeight: 500, border: 0, cursor: 'pointer',
                    background: viewMode === 'preview' ? '#000' : '#fff',
                    color: viewMode === 'preview' ? '#fff' : '#888',
                    borderLeft: '1px solid #e5e5e5',
                  }}
                >
                  Preview
                </button>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className="btn-primary btn-sm"
                style={{ opacity: dirty ? 1 : 0.4 }}
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main area: tree + editor */}
      <div className="flex-1 flex overflow-hidden" style={{ position: 'relative' }}>
        {/* Left: File Tree */}
        <div
          className="shrink-0 overflow-y-auto"
          style={{
            width: 220,
            borderRight: '1px solid #e5e5e5',
            background: '#fafafa',
            padding: '8px 0',
          }}
        >
          {/* Project header */}
          <div style={{ padding: '6px 12px 10px', borderBottom: '1px solid #e5e5e5', marginBottom: 4 }}>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-3.5 h-3.5" style={{ color: '#888' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#000' }} className="truncate">
                {project?.name}
              </span>
            </div>
            {project?.description && (
              <p style={{ fontSize: 10, color: '#888', marginTop: 2, paddingLeft: 18 }} className="truncate">
                {project.description}
              </p>
            )}
          </div>

          {/* Tree */}
          {skills.length === 0 ? (
            <p style={{ padding: '12px 16px', fontSize: 12, color: '#aaa' }}>No files yet</p>
          ) : (
            Object.entries(tree).map(([name, node]) => (
              <TreeNode
                key={name}
                name={name}
                node={node}
                selectedId={selectedSkill?.id}
                onSelect={selectSkill}
              />
            ))
          )}
        </div>

        {/* Center: Editor / Preview */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ position: 'relative' }}>
          {!selectedSkill ? (
            <div className="flex-1 flex items-center justify-center">
              <div style={{ textAlign: 'center', color: '#aaa' }}>
                <FileText className="w-10 h-10 mx-auto" style={{ opacity: 0.3, marginBottom: 8 }} />
                <p style={{ fontSize: 14 }}>Select a file to edit</p>
              </div>
            </div>
          ) : viewMode === 'preview' ? (
            <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
              <MarkdownPreview content={content} />
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="skill-editor w-full h-full flex-1"
              spellCheck={false}
              style={{ resize: 'none' }}
            />
          )}

          {/* Floating toolbar (right side) */}
          <FloatingToolbar skill={selectedSkill} />

          {/* Analysis banner (bottom) */}
          {skills.length > 0 && (
            <AnalysisBanner skills={skills} projectId={id} />
          )}
        </div>
      </div>
    </div>
  )
}
