import { useState } from 'react'
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
} from 'lucide-react'
import { api } from '../api'

export default function RepoConnect() {
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState('input') // input | scanning | results
  const [repoUrl, setRepoUrl] = useState(location.state?.repoUrl || '')
  const [token, setToken] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [scanResult, setScanResult] = useState(null)

  async function handleScan() {
    if (!repoUrl.trim()) return

    let repo = repoUrl.trim()
      .replace(/^https?:\/\/github\.com\//, '')
      .replace(/\.git$/, '')
      .replace(/\/$/, '')

    if (!repo.includes('/')) {
      setError('Please enter a valid GitHub repo URL or owner/repo format.')
      return
    }

    setScanning(true)
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
    } finally {
      setScanning(false)
    }
  }

  if (step === 'scanning') {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 48px)' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
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

  if (step === 'results' && scanResult) {
    const data = scanResult
    const skills = data.skills || []
    const prompts = data.prompts_in_code || []
    const metadata = data.metadata || {}

    return (
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
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

        <div className="grid grid-cols-3 gap-3" style={{ marginBottom: 24 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <FileText className="w-5 h-5 mx-auto" style={{ color: '#D4A843', marginBottom: 8 }} />
            <div style={{ fontSize: 24, fontWeight: 700, color: '#000' }}>{skills.length}</div>
            <div style={{ fontSize: 12, color: '#888' }}>Skill Files</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <Code className="w-5 h-5 mx-auto" style={{ color: '#888', marginBottom: 8 }} />
            <div style={{ fontSize: 24, fontWeight: 700, color: '#000' }}>{prompts.length}</div>
            <div style={{ fontSize: 12, color: '#888' }}>Embedded Prompts</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <Cpu className="w-5 h-5 mx-auto" style={{ color: '#888', marginBottom: 8 }} />
            <div style={{ fontSize: 24, fontWeight: 700, color: '#000' }}>
              {metadata.ai_dependencies?.length || 0}
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>AI Dependencies</div>
          </div>
        </div>

        {(metadata.frameworks?.length > 0 || metadata.languages?.length > 0) && (
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

        <div className="flex items-center gap-2" style={{ marginTop: 24 }}>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            <Check className="w-4 h-4" />
            Go to Dashboard
          </button>
          <button
            onClick={() => { setStep('input'); setScanResult(null) }}
            className="btn-secondary"
          >
            Scan Another Repo
          </button>
        </div>
      </div>
    )
  }

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
          Scan a GitHub repository to discover skill files and embedded prompts in your codebase.
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
          disabled={!repoUrl.trim() || scanning}
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
          <Github className="w-4 h-4" />
          Scan Repository
        </button>

        <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
          We'll scan for .md files, detect embedded prompts in code,<br />
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
