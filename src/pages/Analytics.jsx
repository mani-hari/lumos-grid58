import { useState, useEffect } from 'react'
import { BarChart3, Activity, Cpu, Heart, RefreshCw } from 'lucide-react'
import { api } from '../api'
import { DailyAccessChart, ModelDistChart, TopSkillsChart } from '../components/UsageChart'

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null)
  const [logs, setLogs] = useState([])
  const [logMeta, setLogMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadAnalytics()
    loadLogs()
  }, [])

  async function loadAnalytics() {
    try {
      const res = await api.getAnalytics()
      setAnalytics(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadLogs(page = 1) {
    try {
      const res = await api.getAccessLogs({ page, limit: 20 })
      setLogs(res.data)
      setLogMeta(res.meta)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm py-12">Loading analytics...</div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Observability and insights for your skills
          </p>
        </div>
        <button
          onClick={() => {
            loadAnalytics()
            loadLogs()
          }}
          className="btn-secondary btn-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'logs', label: 'Access Logs', icon: Activity },
          { key: 'health', label: 'Health Scores', icon: Heart },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium -mb-px transition-colors ${
              activeTab === key
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && analytics && (
        <div className="space-y-6 animate-fade-in">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Skills', value: analytics.overview.totalSkills, color: 'text-gray-900' },
              { label: 'Total Projects', value: analytics.overview.totalProjects, color: 'text-blue-600' },
              { label: 'Total Access', value: analytics.overview.totalAccess, color: 'text-green-600' },
              { label: 'Avg Health', value: `${analytics.overview.avgHealthScore}%`, color: 'text-amber-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Access (30 days)</h3>
              <DailyAccessChart data={analytics.dailyAccess} />
            </div>
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Model Distribution</h3>
              <ModelDistChart data={analytics.modelDistribution} />
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Skills by Access</h3>
            <TopSkillsChart data={analytics.topSkills} />
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="animate-fade-in">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No access logs yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Logs appear when agents access your skills via the API endpoints
              </p>
            </div>
          ) : (
            <>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Time</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Skill</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Agent</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Model</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Endpoint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-xs font-medium text-gray-700">
                          {log.skill_name}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[150px] truncate">
                          {log.agent_name}
                        </td>
                        <td className="px-4 py-2.5">
                          {log.model_used ? (
                            <span className="badge-blue">{log.model_used}</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="badge-gray">{log.endpoint_type || 'rest'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logMeta && logMeta.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  {Array.from({ length: Math.min(logMeta.pages, 10) }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => loadLogs(i + 1)}
                      className={`px-3 py-1 text-xs rounded-lg ${
                        logMeta.page === i + 1
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'health' && analytics && (
        <div className="animate-fade-in space-y-3">
          <p className="text-xs text-gray-500 mb-4">
            Health scores reflect staleness, usage patterns, version history, and model diversity.
          </p>
          {analytics.healthScores.map((h) => (
            <div key={h.id} className="card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900">{h.name}</h4>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                  <span>{h.factors.daysSinceUpdate}d since update</span>
                  <span>{h.factors.recentUsage} accesses (7d)</span>
                  <span>v{h.factors.versionCount} versions</span>
                  <span>{h.factors.modelDiversity} models</span>
                </div>
              </div>
              <div className="w-32 flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      h.score >= 70
                        ? 'bg-green-500'
                        : h.score >= 40
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${h.score}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-gray-700 w-8 text-right">
                  {h.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
