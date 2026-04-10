import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Github,
  ArrowRight,
  Check,
  Loader,
  FolderOpen,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
} from 'lucide-react'
import { api } from '../api'

function parseRepo(input) {
  return input
    .trim()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
}

const PHASES = [
  { key: 'reading', label: 'Reading repository' },
  { key: 'creating', label: 'Creating project' },
  { key: 'importing', label: 'Importing skills' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [repoUrl, setRepoUrl] = useState('')
  const [token, setToken] = useState('')
  const [step, setStep] = useState('landing') // landing | checking | needsToken | connecting | done
  const [error, setError] = useState(null)
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  // Connect flow
  const [currentPhase, setCurrentPhase] = useState(0)
  const [importResult, setImportResult] = useState(null)
  const [treeOpen, setTreeOpen] = useState(true)
  const phaseTimersRef = useRef([])

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const res = await api.getProjects()
      setProjects(res.data || [])
    } catch {
      // ignore
    } finally {
      setLoadingProjects(false)
    }
  }

  async function handleConnect(e) {
    e?.preventDefault()
    const repo = parseRepo(repoUrl)
    if (!repo || !repo.includes('/')) {
      setError('Enter a valid GitHub URL or owner/repo')
      return
    }
    setError(null)
    setStep('checking')

    try {
      const check = await api.checkRepo({ repo })
      if (check.exists && !check.private) {
        // Public repo — go straight to import
        startImport(repo, null)
      } else {
        // Private or not found — ask for token
        setStep('needsToken')
        if (!check.exists) {
          setError('Repository not found or is private. Enter a GitHub token to continue.')
        } else {
          setError('This is a private repository. A GitHub token is required.')
        }
      }
    } catch {
      // If check fails, try import directly
      startImport(repo, null)
    }
  }

  function handleConnectWithToken(e) {
    e?.preventDefault()
    const repo = parseRepo(repoUrl)
    if (!token.trim()) {
      setError('Enter a GitHub personal access token')
      return
    }
    setError(null)
    startImport(repo, token.trim())
  }

  async function startImport(repo, authToken) {
    setStep('connecting')
    setCurrentPhase(0)
    setImportResult(null)

    // Animated phase progression
    phaseTimersRef.current.forEach(clearTimeout)
    phaseTimersRef.current = [
      setTimeout(() => setCurrentPhase(1), 2200),
      setTimeout(() => setCurrentPhase(2), 3800),
    ]

    try {
      const res = await api.importRepo({
        repo,
        token: authToken || undefined,
      })

      phaseTimersRef.current.forEach(clearTimeout)
      setCurrentPhase(PHASES.length) // all done
      setImportResult(res.data || res)
      setStep('done')
    } catch (err) {
      phaseTimersRef.current.forEach(clearTimeout)
      const msg = err.message || 'Import failed'
      if (msg.includes('Could not fetch repo tree') && !authToken) {
        setStep('needsToken')
        setError('Could not access this repository. It may be private — enter a GitHub token.')
      } else {
        setError(msg)
        setStep('landing')
      }
    }
  }

  // ── Checking ──
  if (step === 'checking') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-fade-in" style={{ textAlign: 'center' }}>
          <div className="animate-pulse-bar" style={{ marginBottom: 16 }}>
            <Github className="w-8 h-8 mx-auto" style={{ color: '#000' }} />
          </div>
          <p style={{ fontSize: 14, color: '#888' }}>Checking repository...</p>
        </div>
      </div>
    )
  }

  // ── Needs Token ──
  if (step === 'needsToken') {
    return (
      <div className="h-full flex items-center justify-center">
        <form
          onSubmit={handleConnectWithToken}
          style={{ maxWidth: 460, width: '100%', padding: '0 24px' }}
          className="animate-fade-in"
        >
          <button
            type="button"
            onClick={() => { setStep('landing'); setError(null) }}
            style={{ fontSize: 12, color: '#888', background: 'none', border: 0, cursor: 'pointer', marginBottom: 24, padding: 0 }}
          >
            &larr; Back
          </button>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#000', marginBottom: 8 }}>
            Authentication Required
          </h2>

          {error && (
            <div style={{ padding: '10px 14px', background: '#f5f5f5', borderRadius: 4, fontSize: 13, color: '#333', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#D4A843' }} />
              {error}
            </div>
          )}

          <div style={{
            padding: '10px 14px',
            background: '#f5f5f5',
            borderRadius: 4,
            fontSize: 13,
            color: '#000',
            fontFamily: 'JetBrains Mono, monospace',
            marginBottom: 20,
          }}>
            {parseRepo(repoUrl)}
          </div>

          <label style={{ fontSize: 12, fontWeight: 500, color: '#666', display: 'block', marginBottom: 6 }}>
            GitHub Personal Access Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_..."
            className="input"
            style={{ marginBottom: 16, fontSize: 14, padding: '12px 14px' }}
            autoFocus
          />

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px 24px', fontSize: 14, borderRadius: 6 }}
          >
            <Github className="w-4 h-4" />
            Connect
          </button>

          <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 12 }}>
            Token needs <strong>repo</strong> scope for private repositories.
          </p>
        </form>
      </div>
    )
  }

  // ── Connecting / Done ──
  if (step === 'connecting' || step === 'done') {
    const result = importResult
    const tree = result?.scan?.tree
    const skills = result?.skills || []
    const project = result?.project
    const summary = result?.summary

    return (
      <div className="h-full overflow-y-auto">
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px' }} className="animate-fade-in">
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#000', marginBottom: 4 }}>
            {step === 'done' ? 'Import Complete' : `Connecting ${parseRepo(repoUrl)}`}
          </h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 32 }}>
            {step === 'done'
              ? `${summary?.skills_imported || skills.length} skill${(summary?.skills_imported || skills.length) !== 1 ? 's' : ''} imported into project "${project?.name || parseRepo(repoUrl).split('/').pop()}"`
              : 'Setting up your project...'}
          </p>

          {/* Phase steps */}
          <div style={{ marginBottom: 24 }}>
            {PHASES.map((phase, i) => {
              const isDone = step === 'done' || i < currentPhase
              const isActive = step !== 'done' && i === currentPhase
              return (
                <div
                  key={phase.key}
                  className="flex items-center gap-3"
                  style={{
                    padding: '12px 0',
                    borderBottom: i < PHASES.length - 1 ? '1px solid #f0f0f0' : 'none',
                  }}
                >
                  <div style={{ width: 20, display: 'flex', justifyContent: 'center' }}>
                    {isDone ? (
                      <Check className="w-4 h-4" style={{ color: '#000' }} />
                    ) : isActive ? (
                      <div className="animate-pulse-bar">
                        <Loader className="w-4 h-4" style={{ color: '#000' }} />
                      </div>
                    ) : (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e5e5e5' }} />
                    )}
                  </div>
                  <span style={{
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    color: isDone || isActive ? '#000' : '#aaa',
                  }}>
                    {phase.label}
                    {isDone && phase.key === 'importing' && skills.length > 0 && (
                      <span style={{ fontWeight: 400, color: '#888', marginLeft: 8 }}>
                        ({skills.length} file{skills.length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Tree accordion (shown when done) */}
          {step === 'done' && tree && Object.keys(tree).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setTreeOpen(!treeOpen)}
                className="flex items-center gap-2 w-full"
                style={{
                  padding: '10px 12px',
                  background: '#f5f5f5',
                  border: '1px solid #e5e5e5',
                  borderRadius: treeOpen ? '4px 4px 0 0' : 4,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#333',
                }}
              >
                {treeOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Repository Structure
              </button>
              {treeOpen && (
                <pre style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  color: '#333',
                  lineHeight: 1.8,
                  background: '#fafafa',
                  padding: 16,
                  border: '1px solid #e5e5e5',
                  borderTop: 0,
                  borderRadius: '0 0 4px 4px',
                  margin: 0,
                  overflow: 'auto',
                  maxHeight: 240,
                }}>
                  {renderTree(tree)}
                </pre>
              )}
            </div>
          )}

          {/* Imported skills list */}
          {step === 'done' && skills.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              {skills.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2"
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #f0f0f0',
                    fontSize: 13,
                  }}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: '#D4A843' }} />
                  <span style={{ color: '#000', fontWeight: 500 }}>{s.name}</span>
                  {s.tags?.[1] && (
                    <span className="badge-gray" style={{ fontSize: 10, marginLeft: 'auto' }}>{s.tags[1]}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Go to Project button */}
          {step === 'done' && project && (
            <button
              onClick={() => navigate(`/projects/${project.id}`)}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '14px 24px',
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 6,
              }}
            >
              Go to Project
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Landing (default) ──
  return (
    <div className="h-full overflow-y-auto" style={{ background: '#fafafa' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', paddingTop: 80, marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: '#000', letterSpacing: '-1.5px', marginBottom: 20 }}>
            doso.dev
          </h1>
          <ul style={{ fontSize: 14, color: '#555', lineHeight: 1.8, listStyle: 'none', padding: 0, margin: 0, textAlign: 'left', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
            <li style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ color: '#D4A843', flexShrink: 0 }}>&bull;</span>
              Connect your repo and auto-optimise AI skills &amp; prompts
            </li>
            <li style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ color: '#D4A843', flexShrink: 0 }}>&bull;</span>
              Auto-refine when models evolve
            </li>
            <li style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ color: '#D4A843', flexShrink: 0 }}>&bull;</span>
              Reduce tokens, cut cost, improve output quality
            </li>
          </ul>
        </div>

        {/* Main input */}
        <form onSubmit={handleConnect}>
          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 13,
              color: '#333',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#D4A843' }} />
              {error}
            </div>
          )}

          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="input"
            style={{
              fontSize: 15,
              padding: '14px 16px',
              marginBottom: 12,
              borderRadius: 6,
            }}
            autoFocus
          />

          <button
            type="submit"
            disabled={!repoUrl.trim()}
            className="btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '13px 24px',
              fontSize: 15,
              borderRadius: 6,
              opacity: !repoUrl.trim() ? 0.4 : 1,
            }}
          >
            <Github className="w-4 h-4" />
            Connect Repository
          </button>

          <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 12 }}>
            Public repos work without authentication. Private repos will prompt for a token.
          </p>
        </form>

        {/* Terminal suggestion */}
        <div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 8 }}>
            <div style={{ height: 1, width: 40, background: '#e5e5e5' }} />
            <span style={{ fontSize: 11, color: '#aaa' }}>or from your terminal</span>
            <div style={{ height: 1, width: 40, background: '#e5e5e5' }} />
          </div>
          <div className="terminal-box" style={{ textAlign: 'left', position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
            <span style={{ color: '#888' }}>$</span> npx @doso-dev/cli scan ./
            <CopyBtn text="npx @doso-dev/cli scan ./" />
          </div>
        </div>

        {/* Existing Projects */}
        {!loadingProjects && projects.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Your Projects
            </h2>
            <div className="space-y-2">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="w-full text-left flex items-center justify-between group"
                  style={{
                    padding: '12px 14px',
                    borderRadius: 4,
                    border: '1px solid #e5e5e5',
                    background: '#fff',
                    cursor: 'pointer',
                    transition: 'border-color 100ms',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#222' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e5e5' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FolderOpen className="w-4 h-4 shrink-0" style={{ color: '#888' }} />
                    <div className="min-w-0">
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#000' }}>{p.name}</span>
                      {p.description && (
                        <p className="truncate" style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{p.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 11, color: '#aaa' }}>{p.skill_count || 0} skills</span>
                    <ArrowRight className="w-3.5 h-3.5" style={{ color: '#ddd' }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', padding: 4, background: 'transparent', border: 0, cursor: 'pointer', color: copied ? '#fff' : '#888' }}
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function renderTree(node, prefix = '') {
  if (!node || typeof node !== 'object') return ''
  const keys = Object.keys(node)
  const lines = []
  keys.forEach((key, i) => {
    const last = i === keys.length - 1
    const connector = last ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 '
    const child = node[key]
    if (child === null) {
      lines.push(prefix + connector + key)
    } else if (typeof child === 'object') {
      lines.push(prefix + connector + key + '/')
      const childPrefix = prefix + (last ? '    ' : '\u2502   ')
      const sub = renderTree(child, childPrefix)
      if (sub) lines.push(sub)
    }
  })
  return lines.join('\n')
}
