import { useState } from 'react'
import { Copy, Check, Globe, FileText, Cpu, Terminal } from 'lucide-react'

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
      className="flex items-center justify-center"
      style={{
        padding: 4,
        borderRadius: 2,
        border: 0,
        background: 'transparent',
        cursor: 'pointer',
        transition: 'background 100ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e5e5' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" style={{ color: '#000' }} />
      ) : (
        <Copy className="w-3.5 h-3.5" style={{ color: '#aaa' }} />
      )}
    </button>
  )
}

export default function EndpointPanel({ skill }) {
  if (!skill?.id) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
        <Globe className="w-8 h-8 mx-auto" style={{ marginBottom: 8, opacity: 0.4 }} />
        <p>Save your skill to generate endpoints</p>
      </div>
    )
  }

  const base = window.location.origin
  const endpoints = [
    {
      label: 'REST API',
      icon: Globe,
      method: 'GET',
      url: `${base}/api/v1/skills/${skill.id}`,
      description: 'Full skill object as JSON',
    },
    {
      label: 'Raw Content',
      icon: FileText,
      method: 'GET',
      url: `${base}/api/v1/skills/${skill.id}/raw`,
      description: 'Plain markdown — paste this in your agent',
    },
    {
      label: 'MCP Resource',
      icon: Cpu,
      method: 'GET',
      url: `${base}/api/v1/mcp/skills/${skill.id}`,
      description: 'MCP-compatible resource format',
    },
  ]

  const curlCmd = `curl -s ${base}/api/v1/skills/${skill.id}/raw`
  const agentSnippet = `# Add to your agent's config:\nskill_url: "${base}/api/v1/skills/${skill.id}/raw"`

  return (
    <div className="space-y-3 animate-fade-in">
      <h3 style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 4px' }}>
        Endpoints
      </h3>

      {endpoints.map((ep) => (
        <div key={ep.label} className="endpoint-box">
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <div className="flex items-center gap-1.5">
              <ep.icon className="w-3.5 h-3.5" style={{ color: '#666' }} />
              <span style={{ fontWeight: 600, color: '#000', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>{ep.label}</span>
            </div>
            <CopyButton text={ep.url} />
          </div>
          <div className="flex items-center gap-1.5" style={{ marginBottom: 4 }}>
            <span style={{
              background: '#000',
              color: '#fff',
              padding: '1px 6px',
              borderRadius: 2,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              {ep.method}
            </span>
            <code style={{ fontSize: 11, color: '#666' }} className="truncate block flex-1">{ep.url}</code>
          </div>
          <p style={{ fontSize: 10, color: '#aaa' }}>{ep.description}</p>
        </div>
      ))}

      {/* Quick Use */}
      <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: 12, marginTop: 12 }}>
        <h4 className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 8 }}>
          <Terminal className="w-3.5 h-3.5" />
          Quick Use
        </h4>
        <div className="endpoint-box">
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: '#888' }}>cURL</span>
            <CopyButton text={curlCmd} />
          </div>
          <code style={{ fontSize: 11, color: '#333', wordBreak: 'break-all' }}>{curlCmd}</code>
        </div>
        <div className="endpoint-box" style={{ marginTop: 8 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: '#888' }}>Agent Config</span>
            <CopyButton text={agentSnippet} />
          </div>
          <pre style={{ fontSize: 11, color: '#333', whiteSpace: 'pre-wrap' }}>{agentSnippet}</pre>
        </div>
      </div>

      {/* Health Score */}
      {skill.health && (
        <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: 12 }}>
          <h4 style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 8 }}>Health Score</h4>
          <div className="flex items-center gap-2">
            <div className="flex-1 health-bar" style={{ height: 4 }}>
              <div
                className="health-bar-fill"
                style={{ width: `${skill.health.score}%` }}
              />
            </div>
            <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#000' }}>
              {skill.health.score}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
