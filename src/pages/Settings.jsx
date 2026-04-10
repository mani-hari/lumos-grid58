import { useState, useEffect } from 'react'
import { Server, Globe, Info, Cpu, Github, Link2, CheckCircle, XCircle } from 'lucide-react'
import { api } from '../api'

export default function Settings() {
  const [models, setModels] = useState([])
  const [githubConnected, setGithubConnected] = useState(false)
  const [connectedRepos, setConnectedRepos] = useState([])

  useEffect(() => {
    loadModels()
    checkGithubStatus()
  }, [])

  async function loadModels() {
    try {
      const res = await api.getModels()
      setModels(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  async function checkGithubStatus() {
    try {
      const res = await api.githubAuthUrl()
      if (res.data?.connected) {
        setGithubConnected(true)
        setConnectedRepos(res.data.repos || [])
      }
    } catch (err) {
      // Not connected, that's fine
    }
  }

  const baseUrl = window.location.origin

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#000' }}>Settings</h1>
        <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Platform configuration and API information</p>
      </div>

      <div className="space-y-6">
        {/* GitHub Connection */}
        <div className="card">
          <h2 className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: '#000', marginBottom: 12 }}>
            <Github className="w-4 h-4" />
            GitHub Connection
          </h2>
          <div className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid #e5e5e5' }}>
            <div className="flex items-center gap-2">
              {githubConnected ? (
                <CheckCircle className="w-4 h-4" style={{ color: '#000' }} />
              ) : (
                <XCircle className="w-4 h-4" style={{ color: '#aaa' }} />
              )}
              <span style={{ fontSize: 13, color: '#000' }}>
                {githubConnected ? 'Connected' : 'Not connected'}
              </span>
            </div>
            {!githubConnected && (
              <button
                onClick={() => window.location.href = '/api/v1/github/auth'}
                className="btn-primary btn-sm"
              >
                <Github className="w-3.5 h-3.5" />
                Connect
              </button>
            )}
          </div>
          {connectedRepos.length > 0 && (
            <div style={{ paddingTop: 12 }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Connected Repositories
              </h3>
              <div className="space-y-1.5">
                {connectedRepos.map((repo, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2"
                    style={{ padding: 8, background: '#f5f5f5', borderRadius: 4 }}
                  >
                    <Link2 className="w-3.5 h-3.5" style={{ color: '#888' }} />
                    <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#000' }}>
                      {repo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* API Info */}
        <div className="card">
          <h2 className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: '#000', marginBottom: 12 }}>
            <Server className="w-4 h-4" />
            API Information
          </h2>
          <div className="space-y-0">
            {[
              { label: 'Base URL', value: `${baseUrl}/api/v1` },
              { label: 'Skills List', value: 'GET /api/v1/skills' },
              { label: 'Skill Detail', value: 'GET /api/v1/skills/:id' },
              { label: 'Raw Content', value: 'GET /api/v1/skills/:id/raw' },
              { label: 'MCP Resource', value: 'GET /api/v1/mcp/skills/:id' },
              { label: 'Analytics', value: 'GET /api/v1/analytics' },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between"
                style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}
              >
                <span style={{ fontSize: 12, color: '#888' }}>{label}</span>
                <code style={{
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#000',
                  background: '#f5f5f5',
                  padding: '2px 8px',
                  borderRadius: 2,
                }}>
                  {value}
                </code>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Integration */}
        <div className="card">
          <h2 className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: '#000', marginBottom: 12 }}>
            <Globe className="w-4 h-4" />
            Agent Integration
          </h2>
          <div className="space-y-4">
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 500, color: '#000', marginBottom: 4 }}>Headers</h3>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                Pass these headers when accessing skills from your agent for better observability:
              </p>
              <div className="endpoint-box space-y-1">
                <code style={{ display: 'block', fontSize: 11 }}>X-Agent-Name: your-agent-name</code>
                <code style={{ display: 'block', fontSize: 11 }}>X-Model: claude-3.5-sonnet</code>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 500, color: '#000', marginBottom: 4 }}>Claude Code (CLAUDE.md)</h3>
              <div className="endpoint-box">
                <pre style={{ fontSize: 11, color: '#333', whiteSpace: 'pre-wrap' }}>{`# In your CLAUDE.md file:
# Fetch and follow the skill from:
# ${baseUrl}/api/v1/skills/SKILL_ID/raw`}</pre>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 500, color: '#000', marginBottom: 4 }}>Generic Agent</h3>
              <div className="endpoint-box">
                <pre style={{ fontSize: 11, color: '#333', whiteSpace: 'pre-wrap' }}>{`fetch('${baseUrl}/api/v1/skills/SKILL_ID/raw', {
  headers: {
    'X-Agent-Name': 'my-agent',
    'X-Model': 'claude-3.5-sonnet'
  }
}).then(r => r.text())`}</pre>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 500, color: '#000', marginBottom: 4 }}>Python</h3>
              <div className="endpoint-box">
                <pre style={{ fontSize: 11, color: '#333', whiteSpace: 'pre-wrap' }}>{`import requests
resp = requests.get(
    '${baseUrl}/api/v1/skills/SKILL_ID/raw',
    headers={'X-Agent-Name': 'my-agent', 'X-Model': 'gpt-4o'}
)
skill_content = resp.text`}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Supported Models */}
        <div className="card">
          <h2 className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: '#000', marginBottom: 12 }}>
            <Cpu className="w-4 h-4" />
            Supported Models for Optimization
          </h2>
          <div className="space-y-0">
            {models.map((m) => (
              <div
                key={m.key}
                className="flex items-center justify-between"
                style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}
              >
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#000' }}>{m.name}</p>
                  <div className="flex gap-1" style={{ marginTop: 4 }}>
                    {m.capabilities.map((c) => (
                      <span key={c} className="badge-gray" style={{ fontSize: 9 }}>{c}</span>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: '#aaa' }}>
                  {m.suggestion_count} optimization rules
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="card">
          <h2 className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: '#000', marginBottom: 12 }}>
            <Info className="w-4 h-4" />
            About
          </h2>
          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.7 }}>
            <p style={{ marginBottom: 8 }}>
              <strong style={{ color: '#000' }}>doso</strong> is an AI skills platform for developers. Create, manage,
              and serve skills through API endpoints with full observability.
            </p>
            <p style={{ marginBottom: 8 }}>
              Skills are accessible via REST API, raw text, and MCP-compatible endpoints.
              Every access is logged for analytics and optimization insights.
            </p>
            <p style={{ color: '#aaa' }}>Version 0.1.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
