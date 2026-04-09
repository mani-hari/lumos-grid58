import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Server, Globe, Info, Cpu } from 'lucide-react'
import { api } from '../api'

export default function Settings() {
  const [models, setModels] = useState([])

  useEffect(() => {
    loadModels()
  }, [])

  async function loadModels() {
    try {
      const res = await api.getModels()
      setModels(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const baseUrl = window.location.origin

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform configuration and API information</p>
      </div>

      <div className="space-y-6">
        {/* API Info */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Server className="w-4 h-4" />
            API Information
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500">Base URL</span>
              <code className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                {baseUrl}/api/v1
              </code>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500">Skills List</span>
              <code className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                GET /api/v1/skills
              </code>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500">Skill Detail</span>
              <code className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                GET /api/v1/skills/:id
              </code>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500">Raw Content</span>
              <code className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                GET /api/v1/skills/:id/raw
              </code>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500">MCP Resource</span>
              <code className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                GET /api/v1/mcp/skills/:id
              </code>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-gray-500">Analytics</span>
              <code className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                GET /api/v1/analytics
              </code>
            </div>
          </div>
        </div>

        {/* Agent Integration */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Agent Integration
          </h2>
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-medium text-gray-700 mb-1">Headers</h3>
              <p className="text-xs text-gray-500 mb-2">
                Pass these headers when accessing skills from your agent for better observability:
              </p>
              <div className="endpoint-box space-y-1">
                <code className="block text-[11px]">X-Agent-Name: your-agent-name</code>
                <code className="block text-[11px]">X-Model: claude-3.5-sonnet</code>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-700 mb-1">Claude Code (CLAUDE.md)</h3>
              <div className="endpoint-box">
                <pre className="text-[11px] text-gray-600 whitespace-pre-wrap">{`# In your CLAUDE.md file:
# Fetch and follow the skill from:
# ${baseUrl}/api/v1/skills/SKILL_ID/raw`}</pre>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-700 mb-1">Generic Agent</h3>
              <div className="endpoint-box">
                <pre className="text-[11px] text-gray-600 whitespace-pre-wrap">{`fetch('${baseUrl}/api/v1/skills/SKILL_ID/raw', {
  headers: {
    'X-Agent-Name': 'my-agent',
    'X-Model': 'claude-3.5-sonnet'
  }
}).then(r => r.text())`}</pre>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-700 mb-1">Python</h3>
              <div className="endpoint-box">
                <pre className="text-[11px] text-gray-600 whitespace-pre-wrap">{`import requests
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
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Supported Models for Optimization
          </h2>
          <div className="space-y-2">
            {models.map((m) => (
              <div
                key={m.key}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="text-xs font-medium text-gray-700">{m.name}</p>
                  <div className="flex gap-1 mt-0.5">
                    {m.capabilities.map((c) => (
                      <span key={c} className="badge-gray text-[9px]">{c}</span>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400">
                  {m.suggestion_count} optimization rules
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            About
          </h2>
          <div className="text-xs text-gray-500 space-y-2">
            <p>
              <strong>Lumos Grid</strong> is a hosted skills platform for AI agents. Create, manage,
              and serve skills through API endpoints with full observability.
            </p>
            <p>
              Skills are accessible via REST API, raw text, and MCP-compatible endpoints.
              Every access is logged for analytics and optimization insights.
            </p>
            <p className="text-gray-400">Version 0.1.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
