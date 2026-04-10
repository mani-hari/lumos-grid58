import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Github,
  Search,
  FileText,
  Code,
  ArrowLeft,
  Check,
  AlertTriangle,
  FolderTree,
  Cpu,
  ArrowRight,
  CheckCircle,
  Loader,
  Globe,
} from 'lucide-react'
import { api } from '../api'

const IMPORT_PHASES = [
  { label: 'Reading repository...', duration: 1800 },
  { label: 'Creating project...', duration: 1400 },
  { label: 'Importing skills...', duration: 2200 },
  { label: 'Running optimization...', duration: 1600 },
]

function deriveProjectName(repoUrl) {
  const cleaned = repoUrl
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
  const parts = cleaned.split('/')
  return parts[parts.length - 1] || cleaned
}

function parseRepo(url) {
  return url
    .trim()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
}

export default function RepoConnect() {
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState('input') // input | scanning | results | importing | complete
  const [repoUrl, setRepoUrl] = useState(location.state?.repoUrl || '')
  const [token, setToken] = useState('')
  const [error, setError] = useState(null)
  const [scanResult, setScanResult] = useState(null)
  const [importResult, setImportResult] = useState(null)

  // Import progress state
  const [currentPhase, setCurrentPhase] = useState(0)
  const [progress, setProgress] = useState(0)
  const [visibleSkills, setVisibleSkills] = useState([])
  const importCalledRef = useRef(false)

  const repo = parseRepo(repoUrl)
  const projectName = deriveProjectName(repoUrl)

  async function handleScan() {
    if (!repoUrl.trim()) return

    if (!repo.includes('/')) {
      setError('Please enter a valid GitHub repo URL or owner/repo format.')
      return
    }

    setError(null)
    setStep('scanning')

    try {
      const res = await api.scanRepo({
        repo,
        token: token || undefined,
      })
      setScanResult(res.data)
      setStep('results')
    } catch (err) {
      setError(err.message || 'Failed to scan repository')
      setStep('input')
    }
  }

  async function handleImport() {
    setStep('importing')
    setCurrentPhase(0)
    setProgress(0)
    setVisibleSkills([])
    importCalledRef.current = false
  }

  // Progress animation for import step
  useEffect(() => {
    if (step !== 'importing') return

    let cancelled = false

    // Start the actual API call once
    if (!importCalledRef.current) {
      importCalledRef.current = true
      api.importRepo({ repo, token: token || undefined })
        .then((res) => {
          if (!cancelled) {
            setImportResult(res)
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err.message || 'Failed to import repository')
            setStep('input')
          }
        })
    }

    // Phase progression timer
    let phaseIndex = 0
    let progressVal = 0

    const phaseInterval = setInterval(() => {
      if (cancelled) return

      phaseIndex += 1
      if (phaseIndex < IMPORT_PHASES.length) {
        setCurrentPhase(phaseIndex)
      }
    }, IMPORT_PHASES[0].duration)

    // Smooth progress bar
    const progressInterval = setInterval(() => {
      if (cancelled) return
      progressVal += 1.2
      if (progressVal > 92) progressVal = 92 // cap until API returns
      setProgress(progressVal)
    }, 80)

    return () => {
      cancelled = true
      clearInterval(phaseInterval)
      clearInterval(progressInterval)
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  // When importResult arrives, finish up
  useEffect(() => {
    if (!importResult || step !== 'importing') return

    setProgress(100)
    setCurrentPhase(IMPORT_PHASES.length - 1)

    // Stagger skill appearance
    const skills = importResult.data?.skills || importResult.skills || scanResult?.skills || []
    let idx = 0
    const staggerInterval = setInterval(() => {
      if (idx < skills.length) {
        setVisibleSkills((prev) => [...prev, skills[idx]])
        idx += 1
      } else {
        clearInterval(staggerInterval)
        // After last skill appears, transition to complete
        setTimeout(() => {
          setStep('complete')
        }, 600)
      }
    }, 200)

    return () => clearInterval(staggerInterval)
  }, [importResult]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Step: Scanning ----
  if (step === 'scanning') {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 48px)' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }} className="animate-fade-in">
          <div className="animate-pulse-bar" style={{ marginBottom: 24 }}>
            <Search className="w-10 h-10 mx-auto" style={{ color: '#000' }} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#000', marginBottom: 8 }}>
            Scanning repository...
          </h2>
          <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
            Finding skill files, detecting embedded prompts,<br />
            and analyzing your tech stack.
          </p>
        </div>
      </div>
    )
  }

  // ---- Step: Results ----
  if (step === 'results' && scanResult) {
    const data = scanResult
    const skills = data.skills || []
    const prompts = data.prompts_in_code || []
    const metadata = data.metadata || {}

    return (
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }} className="animate-fade-in">
        <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
          <button
            onClick={() => { setStep('input'); setScanResult(null) }}
            className="btn-ghost"
            style={{ padding: 4 }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: '#000' }}>
              Scan Results
            </h1>
            <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
              {metadata.repo || repoUrl}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3" style={{ marginBottom: 24 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <FileText className="w-5 h-5 mx-auto" style={{ color: '#D4A843', marginBottom: 8 }} />
            <div style={{ fontSize: 24, fontWeight: 700, color: '#000' }}>{skills.length}</div>
            <div style={{ fontSize: 12, color: '#888' }}>Skills Found</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <Code className="w-5 h-5 mx-auto" style={{ color: '#888', marginBottom: 8 }} />
            <div style={{ fontSize: 24, fontWeight: 700, color: '#000' }}>{prompts.length}</div>
            <div style={{ fontSize: 12, color: '#888' }}>Prompts in Code</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <Cpu className="w-5 h-5 mx-auto" style={{ color: '#888', marginBottom: 8 }} />
            <div style={{ fontSize: 24, fontWeight: 700, color: '#000' }}>
              {metadata.ai_dependencies?.length || 0}
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>AI Dependencies</div>
          </div>
        </div>

        {/* Tech stack badges */}
        {(metadata.frameworks?.length > 0 || metadata.languages?.length > 0 || metadata.tech_stack?.length > 0) && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Detected Stack
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(metadata.frameworks || []).map(f => (
                <span key={f} className="badge-ochre">{f}</span>
              ))}
              {(metadata.languages || []).map(l => (
                <span key={l} className="badge-gray">{l}</span>
              ))}
              {(metadata.tech_stack || []).map(t => (
                <span key={t} className="badge-gray">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* File list */}
        {skills.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Skill Files
            </h3>
            <div className="space-y-2">
              {skills.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between"
                  style={{
                    padding: '8px 12px',
                    background: '#f5f5f5',
                    borderRadius: 4,
                    fontSize: 13,
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: '#D4A843' }} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#000' }} className="truncate">
                      {s.path}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge-gray" style={{ fontSize: 10 }}>{s.type}</span>
                    <span style={{ fontSize: 10, color: '#aaa' }}>{s.size} bytes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Embedded prompts */}
        {prompts.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" style={{ color: '#D4A843' }} />
              Embedded Prompts in Code
            </h3>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
              These prompts are embedded directly in your codebase. Consider extracting them as hosted skills.
            </p>
            <div className="space-y-2">
              {prompts.map((p, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    background: '#f5f5f5',
                    borderRadius: 4,
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#000' }}>
                      {p.path}
                    </span>
                    {p.has_ai_sdk_import && (
                      <span className="badge-ochre" style={{ fontSize: 10 }}>AI SDK</span>
                    )}
                  </div>
                  {p.prompts?.map((pr, j) => (
                    <div key={j} style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                      <span style={{ color: '#aaa' }}>L{pr.line}:</span>{' '}
                      <span style={{ color: '#888' }}>{pr.type}</span>{' '}
                      {pr.text && (
                        <span style={{ color: '#aaa' }}>
                          &mdash; {pr.text.slice(0, 80)}{pr.text.length > 80 ? '...' : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File tree */}
        {data.tree && Object.keys(data.tree).length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              <FolderTree className="w-3.5 h-3.5 inline mr-1.5" />
              Relevant File Tree
            </h3>
            <pre style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12,
              color: '#333',
              lineHeight: 1.6,
              background: '#f5f5f5',
              padding: 12,
              borderRadius: 4,
              overflow: 'auto',
              margin: 0,
            }}>
              {renderTree(data.tree)}
            </pre>
          </div>
        )}

        {/* Import button */}
        <button
          onClick={handleImport}
          className="btn-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '14px 24px',
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 6,
            marginTop: 8,
          }}
        >
          <Github className="w-5 h-5" />
          Import to doso
        </button>
      </div>
    )
  }

  // ---- Step: Importing ----
  if (step === 'importing') {
    const skills = scanResult?.skills || []

    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 48px)' }}>
        <div style={{ maxWidth: 520, width: '100%', padding: '0 24px' }} className="animate-fade-in">
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#000', marginBottom: 4, textAlign: 'center' }}>
            Importing {projectName}
          </h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 32, textAlign: 'center' }}>
            Setting up your project and importing skills...
          </p>

          {/* Progress bar */}
          <div
            className="health-bar"
            style={{ height: 6, borderRadius: 3, marginBottom: 32 }}
          >
            <div
              className="health-bar-fill"
              style={{
                width: `${Math.min(progress, 100)}%`,
                borderRadius: 3,
                transition: 'width 200ms ease',
              }}
            />
          </div>

          {/* Phase steps */}
          <div style={{ marginBottom: 32 }}>
            {IMPORT_PHASES.map((phase, i) => {
              const isActive = i === currentPhase
              const isDone = i < currentPhase || progress >= 100
              return (
                <div
                  key={i}
                  className="flex items-center gap-3"
                  style={{
                    padding: '10px 0',
                    borderBottom: i < IMPORT_PHASES.length - 1 ? '1px solid #f0f0f0' : 'none',
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
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isDone ? '#000' : isActive ? '#000' : '#aaa',
                  }}>
                    {phase.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Skills appearing one by one */}
          {visibleSkills.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Imported Skills
              </h3>
              <div className="space-y-2">
                {visibleSkills.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 animate-fade-in"
                    style={{
                      padding: '8px 12px',
                      background: '#f5f5f5',
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" style={{ color: '#D4A843' }} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#000' }} className="truncate">
                      {s.name || s.path}
                    </span>
                    {s.type && <span className="badge-gray" style={{ fontSize: 10 }}>{s.type}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---- Step: Complete ----
  if (step === 'complete') {
    const importData = importResult?.data || importResult || {}
    const projectId = importData.project_id || importData.id
    const skills = importData.skills || scanResult?.skills || []

    return (
      <div style={{ padding: 24, maxWidth: 640, margin: '0 auto' }} className="animate-fade-in">
        {/* Success header */}
        <div style={{ textAlign: 'center', marginBottom: 32, paddingTop: 24 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#000',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <CheckCircle className="w-7 h-7" style={{ color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#000', marginBottom: 6 }}>
            Project created: {importData.project_name || projectName}
          </h1>
          <p style={{ fontSize: 14, color: '#888' }}>
            {skills.length} skill{skills.length !== 1 ? 's' : ''} imported successfully
          </p>
        </div>

        {/* Skill cards */}
        {skills.length > 0 && (
          <div className="space-y-3" style={{ marginBottom: 32 }}>
            {skills.map((s, i) => (
              <div key={i} className="card animate-fade-in">
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" style={{ color: '#D4A843' }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#000' }}>
                      {s.name || s.path}
                    </span>
                  </div>
                  {s.type && <span className="badge-ochre" style={{ fontSize: 10 }}>{s.type}</span>}
                </div>
                {(s.endpoint || s.url || s.id) && (
                  <div style={{
                    padding: '8px 12px',
                    background: '#f5f5f5',
                    borderRadius: 4,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 11,
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <Globe className="w-3 h-3 shrink-0" style={{ color: '#aaa' }} />
                    <span className="truncate">{s.endpoint || s.url || `/api/v1/skills/${s.id}`}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3" style={{ justifyContent: 'center' }}>
          <button
            onClick={() => navigate(projectId ? `/projects/${projectId}` : '/projects')}
            className="btn-primary"
            style={{ padding: '12px 28px', fontSize: 14, borderRadius: 6 }}
          >
            <ArrowRight className="w-4 h-4" />
            Open Project
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
            style={{ padding: '12px 28px', fontSize: 14, borderRadius: 6 }}
          >
            View Skills
          </button>
        </div>
      </div>
    )
  }

  // ---- Step: Input (default) ----
  return (
    <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 48px)' }}>
      <div style={{ maxWidth: 480, width: '100%', padding: '0 24px' }}>
        <button
          onClick={() => navigate('/')}
          className="btn-ghost"
          style={{ marginBottom: 24, padding: '4px 0' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#000', letterSpacing: '-0.5px', marginBottom: 8 }}>
          Connect Repository
        </h1>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 32, lineHeight: 1.6 }}>
          Scan a GitHub repository to discover skills and prompts, then import everything into a new project.
        </p>

        {error && (
          <div style={{
            padding: '10px 14px',
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: 4,
            fontSize: 13,
            color: '#000',
            marginBottom: 16,
          }}>
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" style={{ color: '#D4A843' }} />
            {error}
          </div>
        )}

        <label style={{ fontSize: 12, fontWeight: 500, color: '#666', display: 'block', marginBottom: 6 }}>
          Repository
        </label>
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="owner/repo or https://github.com/owner/repo"
          className="input"
          style={{ marginBottom: 16, fontSize: 14, padding: '12px 14px' }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleScan() }}
        />

        <label style={{ fontSize: 12, fontWeight: 500, color: '#666', display: 'block', marginBottom: 6 }}>
          GitHub Token <span style={{ color: '#aaa' }}>(optional, for private repos)</span>
        </label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_..."
          className="input"
          style={{ marginBottom: 24, fontSize: 14, padding: '12px 14px' }}
        />

        <button
          onClick={handleScan}
          disabled={!repoUrl.trim()}
          className="btn-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '12px 24px',
            fontSize: 14,
            borderRadius: 6,
            opacity: !repoUrl.trim() ? 0.5 : 1,
          }}
        >
          <Search className="w-4 h-4" />
          Scan Repository
        </button>

        <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
          We'll scan for skill files, detect embedded prompts in code,<br />
          and identify your tech stack and AI dependencies.
        </p>
      </div>
    </div>
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
      const childStr = renderTree(child, childPrefix)
      if (childStr) lines.push(childStr)
    }
  })

  return lines.join('\n')
}
