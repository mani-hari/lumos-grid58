import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Grid3x3, List, Upload, Copy, Check, Github } from 'lucide-react'
import { api } from '../api'
import SkillCard from '../components/SkillCard'

const categories = ['All', 'Design', 'Frontend', 'Backend', 'Quality', 'DevOps', 'Testing', 'General']

function CopyInline({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      style={{
        position: 'absolute',
        right: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        padding: 4,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        color: copied ? '#fff' : '#888',
      }}
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function OnboardingView({ navigate }) {
  const [repoUrl, setRepoUrl] = useState('')

  return (
    <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 48px)' }}>
      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center', padding: '0 24px' }}>
        {/* Logo */}
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#000', letterSpacing: '-1px', marginBottom: 16 }}>
          doso
        </h1>

        <p style={{ fontSize: 16, color: '#666', marginBottom: 40, lineHeight: 1.6 }}>
          Connect your repository to start<br />
          optimizing your AI skills and prompts.
        </p>

        {/* Repo URL input */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/user/repo"
            className="input"
            style={{
              fontSize: 14,
              padding: '14px 16px',
              textAlign: 'center',
              border: '2px dashed #ddd',
              borderRadius: 6,
              background: '#f5f5f5',
            }}
          />
        </div>

        <button
          onClick={() => navigate('/connect', { state: { repoUrl } })}
          className="btn-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '12px 24px',
            fontSize: 14,
            borderRadius: 6,
            marginBottom: 32,
          }}
        >
          <Github className="w-4 h-4" />
          Connect with GitHub
        </button>

        <div className="separator" style={{ marginBottom: 24 }}>or</div>

        <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
          Run in your terminal:
        </p>

        <div className="terminal-box" style={{ textAlign: 'left', position: 'relative' }}>
          <span style={{ color: '#888' }}>$</span> npx @doso-dev/cli scan ./
          <CopyInline text="npx @doso-dev/cli scan ./" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [skills, setSkills] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [viewMode, setViewMode] = useState('grid')
  const [loading, setLoading] = useState(true)
  const [importData, setImportData] = useState(null)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    loadSkills()
  }, [search, category])

  async function loadSkills() {
    try {
      const params = {}
      if (search) params.search = search
      if (category !== 'All') params.category = category
      const res = await api.getSkills(params)
      setSkills(res.data)
    } catch (err) {
      console.error('Failed to load skills:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (!importData) return
    try {
      const parsed = JSON.parse(importData)
      await api.importSkill(parsed)
      setShowImport(false)
      setImportData(null)
      loadSkills()
    } catch (err) {
      alert('Invalid import data: ' + err.message)
    }
  }

  if (!loading && skills.length === 0 && !search && category === 'All') {
    return <OnboardingView navigate={navigate} />
  }

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#000' }}>Skills</h1>
          <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            {skills.length} skill{skills.length !== 1 ? 's' : ''} in your library
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(!showImport)}
            className="btn-secondary btn-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          <button
            onClick={() => navigate('/skills/new')}
            className="btn-primary btn-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Skill
          </button>
        </div>
      </div>

      {/* Import Panel */}
      {showImport && (
        <div className="card animate-fade-in" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#000' }}>Import Skill</h3>
          <textarea
            value={importData || ''}
            onChange={(e) => setImportData(e.target.value)}
            placeholder='Paste exported skill JSON here...'
            className="input"
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, height: 128, marginBottom: 8, resize: 'none' }}
          />
          <div className="flex gap-2">
            <button onClick={handleImport} className="btn-primary btn-sm">Import</button>
            <button onClick={() => { setShowImport(false); setImportData(null) }} className="btn-secondary btn-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
        <div className="relative flex-1">
          <Search className="absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#aaa' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills by name, content, or tags..."
            className="input"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <div className="flex items-center" style={{ border: '1px solid #222', borderRadius: 4, overflow: 'hidden' }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: 8,
              background: viewMode === 'grid' ? '#000' : '#fff',
              color: viewMode === 'grid' ? '#fff' : '#888',
              border: 0,
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: 8,
              background: viewMode === 'list' ? '#000' : '#fff',
              color: viewMode === 'list' ? '#fff' : '#888',
              border: 0,
              cursor: 'pointer',
              display: 'flex',
              borderLeft: '1px solid #222',
            }}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto" style={{ marginBottom: 20, paddingBottom: 4 }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 100,
              whiteSpace: 'nowrap',
              border: category === cat ? '1px solid #000' : '1px solid transparent',
              background: category === cat ? '#000' : 'transparent',
              color: category === cat ? '#fff' : '#888',
              cursor: 'pointer',
              transition: 'all 100ms',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Skills Grid/List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#aaa', fontSize: 13 }}>
          Loading skills...
        </div>
      ) : skills.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>No skills found</p>
          <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>
            {search ? 'Try a different search query' : 'Create your first skill to get started'}
          </p>
          <button onClick={() => navigate('/skills/new')} className="btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5" />
            Create Skill
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} compact />
          ))}
        </div>
      )}
    </div>
  )
}
