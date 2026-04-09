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
      className="p-1 rounded hover:bg-gray-200 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-gray-400" />
      )}
    </button>
  )
}

export default function EndpointPanel({ skill }) {
  if (!skill?.id) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
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
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Raw Content',
      icon: FileText,
      method: 'GET',
      url: `${base}/api/v1/skills/${skill.id}/raw`,
      description: 'Plain markdown — paste this in your agent',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'MCP Resource',
      icon: Cpu,
      method: 'GET',
      url: `${base}/api/v1/mcp/skills/${skill.id}`,
      description: 'MCP-compatible resource format',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  const curlCmd = `curl -s ${base}/api/v1/skills/${skill.id}/raw`
  const agentSnippet = `# Add to your agent's config:\nskill_url: "${base}/api/v1/skills/${skill.id}/raw"`

  return (
    <div className="space-y-3 animate-fade-in">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
        Endpoints
      </h3>

      {endpoints.map((ep) => (
        <div key={ep.label} className="endpoint-box">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <ep.icon className={`w-3.5 h-3.5 ${ep.color}`} />
              <span className="font-semibold text-gray-700 text-xs">{ep.label}</span>
            </div>
            <CopyButton text={ep.url} />
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`${ep.bg} ${ep.color} px-1.5 py-0.5 rounded text-[10px] font-bold`}>
              {ep.method}
            </span>
            <code className="text-[11px] text-gray-600 truncate block flex-1">{ep.url}</code>
          </div>
          <p className="text-[10px] text-gray-400">{ep.description}</p>
        </div>
      ))}

      {/* Quick Use */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5" />
          Quick Use
        </h4>
        <div className="endpoint-box">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">cURL</span>
            <CopyButton text={curlCmd} />
          </div>
          <code className="text-[11px] text-gray-600 break-all">{curlCmd}</code>
        </div>
        <div className="endpoint-box mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">Agent Config</span>
            <CopyButton text={agentSnippet} />
          </div>
          <pre className="text-[11px] text-gray-600 whitespace-pre-wrap">{agentSnippet}</pre>
        </div>
      </div>

      {/* Stats */}
      {skill.health && (
        <div className="border-t border-gray-200 pt-3">
          <h4 className="text-xs font-semibold text-gray-500 mb-2">Health Score</h4>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  skill.health.score >= 70
                    ? 'bg-green-500'
                    : skill.health.score >= 40
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${skill.health.score}%` }}
              />
            </div>
            <span className="text-xs font-mono font-semibold text-gray-700">
              {skill.health.score}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
