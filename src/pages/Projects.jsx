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
  Settings,
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">
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
        <div className="card mb-4 animate-fade-in">
          <h3 className="text-sm font-semibold mb-3">Create Project</h3>
          <div className="space-y-2 mb-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name..."
              className="input text-sm"
              autoFocus
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="input text-sm"
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
        <div className="w-72 shrink-0 space-y-2">
          {loading ? (
            <p className="text-sm text-gray-400 py-4">Loading...</p>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No projects yet</p>
            </div>
          ) : (
            projects.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProject(p.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedProject === p.id
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">{p.name}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">{p.skill_count} skills</span>
                </div>
                {p.description && (
                  <p className="text-xs text-gray-500 mt-1 ml-6 truncate">{p.description}</p>
                )}
              </button>
            ))
          )}
        </div>

        {/* Project Detail */}
        <div className="flex-1 min-w-0">
          {!selectedProject ? (
            <div className="text-center py-16 text-gray-400">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a project to view details</p>
            </div>
          ) : !projectDetail ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Project Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{projectDetail.name}</h2>
                  <p className="text-sm text-gray-500">{projectDetail.description}</p>
                </div>
                <button
                  onClick={() => handleDeleteProject(selectedProject)}
                  className="btn-ghost btn-sm text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card text-center">
                  <p className="text-2xl font-bold text-gray-900">{projectDetail.stats.skill_count}</p>
                  <p className="text-xs text-gray-500">Skills</p>
                </div>
                <div className="card text-center">
                  <p className="text-2xl font-bold text-gray-900">{projectDetail.stats.total_access}</p>
                  <p className="text-xs text-gray-500">Total Access</p>
                </div>
                <div className="card text-center">
                  <p className="text-2xl font-bold text-gray-900">{projectDetail.stats.recent_access}</p>
                  <p className="text-xs text-gray-500">Last 7 days</p>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Skills ({projectDetail.skills.length})
                </h3>
                {projectDetail.skills.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">
                    No skills in this project. Assign skills from the skill editor.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {projectDetail.skills.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => navigate(`/skills/${s.id}`)}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer group"
                      >
                        <span className="text-sm text-gray-700">{s.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* API Keys */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    API Keys ({projectDetail.api_keys.length})
                  </h3>
                  <button onClick={() => setShowAddKey(true)} className="btn-ghost btn-sm">
                    <Plus className="w-3 h-3" /> Add Key
                  </button>
                </div>
                {showAddKey && (
                  <div className="card mb-2 animate-fade-in">
                    <input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Key name..."
                      className="input text-xs mb-2"
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Webhooks
                  </h3>
                  <button onClick={() => setShowWebhook(true)} className="btn-ghost btn-sm">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                {showWebhook && (
                  <div className="card mb-2 animate-fade-in">
                    <input
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://your-server.com/webhook"
                      className="input text-xs mb-2"
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
                      <div key={wh.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200">
                        <div>
                          <code className="text-xs text-gray-600">{wh.url}</code>
                          <div className="flex gap-1 mt-1">
                            {wh.events?.map((e) => (
                              <span key={e} className="badge-gray text-[9px]">{e}</span>
                            ))}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteWebhook(wh.id)} className="p-1 text-gray-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-1">No webhooks configured</p>
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
    <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200">
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-700">{apiKey.name}</p>
        <code className="text-[10px] text-gray-400">
          {showKey ? apiKey.key : `${apiKey.key.slice(0, 8)}${'*'.repeat(24)}`}
        </code>
        <div className="flex gap-2 mt-0.5 text-[10px] text-gray-400">
          {apiKey.usage_count > 0 && <span>Used {apiKey.usage_count}x</span>}
          {apiKey.last_used_at && <span>Last: {new Date(apiKey.last_used_at).toLocaleDateString()}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => setShowKey(!showKey)} className="btn-ghost btn-sm text-[10px]">
          {showKey ? 'Hide' : 'Show'}
        </button>
        <button onClick={handleCopy} className="p-1 rounded hover:bg-gray-100">
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
        </button>
        <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
