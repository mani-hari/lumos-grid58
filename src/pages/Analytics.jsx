import { useState, useEffect } from 'react'
import { BarChart3, Activity, Heart, RefreshCw } from 'lucide-react'
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
      <div style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 13, paddingTop: 48 }}>
        Loading analytics...
      </div>
    )
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'logs', label: 'Access Logs', icon: Activity },
    { key: 'health', label: 'Health Scores', icon: Heart },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: '0 auto' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#000' }}>Analytics</h1>
          <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            Observability and insights for your skills
          </p>
        </div>
        <button
          onClick={() => { loadAnalytics(); loadLogs() }}
          className="btn-secondary btn-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1" style={{ borderBottom: '1px solid #222', marginBottom: 24 }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 500,
              background: 'transparent',
              border: 0,
              borderBottom: activeTab === key ? '2px solid #000' : '2px solid transparent',
              marginBottom: -1,
              color: activeTab === key ? '#000' : '#aaa',
              cursor: 'pointer',
              transition: 'color 100ms',
            }}
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
              { label: 'Total Skills', value: analytics.overview.totalSkills },
              { label: 'Total Projects', value: analytics.overview.totalProjects },
              { label: 'Total Access', value: analytics.overview.totalAccess },
              { label: 'Avg Health', value: `${analytics.overview.avgHealthScore}%` },
            ].map(({ label, value }) => (
              <div key={label} className="card">
                <p style={{ fontSize: 24, fontWeight: 700, color: '#000' }}>{value}</p>
                <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#000', marginBottom: 12 }}>Daily Access (30 days)</h3>
              <DailyAccessChart data={analytics.dailyAccess} />
            </div>
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#000', marginBottom: 12 }}>Model Distribution</h3>
              <ModelDistChart data={analytics.modelDistribution} />
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#000', marginBottom: 12 }}>Top Skills by Access</h3>
            <TopSkillsChart data={analytics.topSkills} />
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="animate-fade-in">
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <Activity className="w-8 h-8 mx-auto" style={{ color: '#ddd', marginBottom: 8 }} />
              <p style={{ fontSize: 14, color: '#888' }}>No access logs yet</p>
              <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
                Logs appear when agents access your skills via the API endpoints
              </p>
            </div>
          ) : (
            <>
              <div style={{ border: '1px solid #222', borderRadius: 6, overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e5e5' }}>Time</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e5e5' }}>Skill</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e5e5' }}>Agent</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e5e5' }}>Model</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#888', borderBottom: '1px solid #e5e5e5' }}>Endpoint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        style={{ borderBottom: '1px solid #f5f5f5' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <td style={{ padding: '10px 16px', fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 500, color: '#000' }}>
                          {log.skill_name}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: '#888', maxWidth: 150 }} className="truncate">
                          {log.agent_name}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {log.model_used ? (
                            <span className="badge-gray">{log.model_used}</span>
                          ) : (
                            <span style={{ fontSize: 12, color: '#aaa' }}>--</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span className="badge-gray">{log.endpoint_type || 'rest'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logMeta && logMeta.pages > 1 && (
                <div className="flex items-center justify-center gap-2" style={{ marginTop: 16 }}>
                  {Array.from({ length: Math.min(logMeta.pages, 10) }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => loadLogs(i + 1)}
                      style={{
                        padding: '4px 12px',
                        fontSize: 12,
                        borderRadius: 4,
                        border: 0,
                        background: logMeta.page === i + 1 ? '#000' : 'transparent',
                        color: logMeta.page === i + 1 ? '#fff' : '#888',
                        cursor: 'pointer',
                      }}
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
          <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
            Health scores reflect staleness, usage patterns, version history, and model diversity.
          </p>
          {analytics.healthScores.map((h) => (
            <div key={h.id} className="card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h4 style={{ fontSize: 13, fontWeight: 500, color: '#000' }}>{h.name}</h4>
                <div className="flex items-center gap-3" style={{ marginTop: 4, fontSize: 10, color: '#aaa' }}>
                  <span>{h.factors.daysSinceUpdate}d since update</span>
                  <span>{h.factors.recentUsage} accesses (7d)</span>
                  <span>v{h.factors.versionCount} versions</span>
                  <span>{h.factors.modelDiversity} models</span>
                </div>
              </div>
              <div className="flex items-center gap-2" style={{ width: 128 }}>
                <div className="flex-1 health-bar" style={{ height: 4 }}>
                  <div
                    className="health-bar-fill"
                    style={{ width: `${h.score}%` }}
                  />
                </div>
                <span style={{
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  color: '#000',
                  width: 32,
                  textAlign: 'right',
                }}>
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
