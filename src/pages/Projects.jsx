import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderOpen,
  Plus,
  Trash2,
  Key,
  Link,
  Bell,
  Copy,
  Check,
  ChevronRight,
  X,
} from 'lucide-react'
import { api } from '../api'

export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectDetail, setProjectDetail] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [showAddKey, setShowAddKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [showWebhook, setShowWebhook] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const res = await api.getProjects()
      setProjects(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadProjectDetail(id) {
    try {
      const res = await api.getProject(id)
      setProjectDetail(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleCreateProject() {
    if (!newName) return
    try {
      await api.createProject({ name: newName, description: newDesc })
      setShowNew(false)
      setNewName('')
      setNewDesc('')
      loadProjects()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleDeleteProject(id) {
    if (!confirm('Delete this project? Skills will be unlinked, not deleted.')) return
    try {
      await api.deleteProject(id)
      setSelectedProject(null)
      setProjectDetail(null)
      loadProjects()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleCreateKey() {
    if (!newKeyName || !selectedProject) return
    try {
      await api.createApiKey(selectedProject, { name: newKeyName })
      setShowAddKey(false)
      setNewKeyName('')
      loadProjectDetail(selectedProject)
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleDeleteKey(keyId) {
    try {
      await api.deleteApiKey(selectedProject, keyId)
      loadProjectDetail(selectedProject)
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleCreateWebhook() {
    if (!webhookUrl || !selectedProject) return
    try {
      await api.createWebhook(selectedProject, { url: webhookUrl })
      setShowWebhook(false)
      setWebhookUrl('')
      loadProjectDetail(selectedProject)
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleDeleteWebhook(whId) {
    try {
      await api.deleteWebhook(selectedProject, whId)
      loadProjectDetail(selectedProject)
    } catch (err) {
      alert(err.message)
    }
  }

  function selectProject(id) {
    setSelectedProject(id)
    loadProjectDetail(id)
  }

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: '0 auto' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#000' }}>Projects</h1>
          <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            Group skills, manage API keys, and configure webhooks
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary btn-sm">
          <Plus className="w-3.5 h-3.5" />
          New Project
        </button>
      </div>

      {/* New Project Form */}
      {showNew && (
        <div className="card animate-fade-in" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#000', marginBottom: 12 }}>Create Project</h3>
          <div className="space-y-2" style={{ marginBottom: 12 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name..."
              className="input"
              style={{ fontSize: 13 }}
              autoFocus
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="input"
              style={{ fontSize: 13 }}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreateProject} className="btn-primary btn-sm">Create</button>
            <button onClick={() => setShowNew(false)} className="btn-secondary btn-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Project List */}
        <div style={{ width: 280, flexShrink: 0 }} className="space-y-2">
          {loading ? (
            <p style={{ fontSize: 13, color: '#aaa', padding: '16px 0' }}>Loading...</p>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <FolderOpen className="w-8 h-8 mx-auto" style={{ color: '#ddd', marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: '#aaa' }}>No projects yet</p>
            </div>
          ) : (
            projects.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProject(p.id)}
                className="w-full text-left"
                style={{
                  padding: 12,
                  borderRadius: 4,
                  border: selectedProject === p.id ? '1px solid #000' : '1px solid #e5e5e5',
                  background: selectedProject === p.id ? '#f5f5f5' : '#fff',
                  cursor: 'pointer',
                  transition: 'border-color 100ms',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" style={{ color: '#888' }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#000' }}>{p.name}</span>
                  </div>
                  <span style={{ fontSize: 10, color: '#aaa' }}>{p.skill_count} skills</span>
                </div>
                {p.description && (
                  <p className="truncate" style={{ fontSize: 12, color: '#888', marginTop: 4, paddingLeft: 24 }}>{p.description}</p>
                )}
              </button>
            ))
          )}
        </div>

        {/* Project Detail */}
        <div className="flex-1 min-w-0">
          {!selectedProject ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: '#aaa' }}>
              <FolderOpen className="w-10 h-10 mx-auto" style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ fontSize: 13 }}>Select a project to view details</p>
            </div>
          ) : !projectDetail ? (
            <p style={{ fontSize: 13, color: '#aaa' }}>Loading...</p>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Project Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: '#000' }}>{projectDetail.name}</h2>
                  <p style={{ fontSize: 13, color: '#888' }}>{projectDetail.description}</p>
                </div>
                <button
                  onClick={() => handleDeleteProject(selectedProject)}
                  className="btn-ghost btn-sm"
                  style={{ color: '#888', textDecoration: 'none' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card" style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#000' }}>{projectDetail.stats.skill_count}</p>
                  <p style={{ fontSize: 12, color: '#888' }}>Skills</p>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#000' }}>{projectDetail.stats.total_access}</p>
                  <p style={{ fontSize: 12, color: '#888' }}>Total Access</p>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#000' }}>{projectDetail.stats.recent_access}</p>
                  <p style={{ fontSize: 12, color: '#888' }}>Last 7 days</p>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h3 className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: '#000', marginBottom: 8 }}>
                  <Link className="w-4 h-4" />
                  Skills ({projectDetail.skills.length})
                </h3>
                {projectDetail.skills.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#aaa', padding: '8px 0' }}>
                    No skills in this project. Assign skills from the skill editor.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {projectDetail.skills.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => navigate(`/skills/${s.id}`)}
                        className="flex items-center justify-between cursor-pointer group"
                        style={{
                          padding: 10,
                          borderRadius: 4,
                          border: '1px solid #e5e5e5',
                          transition: 'border-color 100ms',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#222' }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e5e5' }}
                      >
                        <span style={{ fontSize: 13, color: '#000' }}>{s.name}</span>
                        <ChevronRight className="w-3.5 h-3.5" style={{ color: '#ddd' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* API Keys */}
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <h3 className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>
                    <Key className="w-4 h-4" />
                    API Keys ({projectDetail.api_keys.length})
                  </h3>
                  <button onClick={() => setShowAddKey(true)} className="btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                    <Plus className="w-3 h-3" /> Add Key
                  </button>
                </div>
                {showAddKey && (
                  <div className="card animate-fade-in" style={{ marginBottom: 8 }}>
                    <input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Key name..."
                      className="input"
                      style={{ fontSize: 12, marginBottom: 8 }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={handleCreateKey} className="btn-primary btn-sm">Create</button>
                      <button onClick={() => setShowAddKey(false)} className="btn-secondary btn-sm">Cancel</button>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  {projectDetail.api_keys.map((k) => (
                    <ApiKeyRow key={k.id} apiKey={k} onDelete={() => handleDeleteKey(k.id)} />
                  ))}
                </div>
              </div>

              {/* Webhooks */}
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <h3 className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>
                    <Bell className="w-4 h-4" />
                    Webhooks
                  </h3>
                  <button onClick={() => setShowWebhook(true)} className="btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                {showWebhook && (
                  <div className="card animate-fade-in" style={{ marginBottom: 8 }}>
                    <input
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://your-server.com/webhook"
                      className="input"
                      style={{ fontSize: 12, marginBottom: 8 }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={handleCreateWebhook} className="btn-primary btn-sm">Add</button>
                      <button onClick={() => setShowWebhook(false)} className="btn-secondary btn-sm">Cancel</button>
                    </div>
                  </div>
                )}
                {projectDetail.webhooks && projectDetail.webhooks.length > 0 ? (
                  <div className="space-y-1.5">
                    {projectDetail.webhooks.map((wh) => (
                      <div
                        key={wh.id}
                        className="flex items-center justify-between"
                        style={{ padding: 10, borderRadius: 4, border: '1px solid #e5e5e5' }}
                      >
                        <div>
                          <code style={{ fontSize: 12, color: '#333' }}>{wh.url}</code>
                          <div className="flex gap-1" style={{ marginTop: 4 }}>
                            {wh.events?.map((e) => (
                              <span key={e} className="badge-gray" style={{ fontSize: 9 }}>{e}</span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteWebhook(wh.id)}
                          style={{ padding: 4, border: 0, background: 'transparent', cursor: 'pointer', color: '#aaa' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#000' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#aaa' }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: '#aaa', padding: '4px 0' }}>No webhooks configured</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ApiKeyRow({ apiKey, onDelete }) {
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: 10, borderRadius: 4, border: '1px solid #e5e5e5' }}
    >
      <div className="min-w-0">
        <p style={{ fontSize: 12, fontWeight: 500, color: '#000' }}>{apiKey.name}</p>
        <code style={{ fontSize: 10, color: '#aaa', fontFamily: 'JetBrains Mono, monospace' }}>
          {showKey ? apiKey.key : `${apiKey.key.slice(0, 8)}${'*'.repeat(24)}`}
        </code>
        <div className="flex gap-2" style={{ marginTop: 2, fontSize: 10, color: '#aaa' }}>
          {apiKey.usage_count > 0 && <span>Used {apiKey.usage_count}x</span>}
          {apiKey.last_used_at && <span>Last: {new Date(apiKey.last_used_at).toLocaleDateString()}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowKey(!showKey)}
          className="btn-ghost btn-sm"
          style={{ fontSize: 10, textDecoration: 'none' }}
        >
          {showKey ? 'Hide' : 'Show'}
        </button>
        <button
          onClick={handleCopy}
          style={{ padding: 4, border: 0, background: 'transparent', cursor: 'pointer' }}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" style={{ color: '#000' }} />
          ) : (
            <Copy className="w-3.5 h-3.5" style={{ color: '#aaa' }} />
          )}
        </button>
        <button
          onClick={onDelete}
          style={{ padding: 4, border: 0, background: 'transparent', cursor: 'pointer', color: '#aaa' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#000' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#aaa' }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
