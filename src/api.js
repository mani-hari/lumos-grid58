const BASE = '/api/v1'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data
}

// Skills
export const api = {
  // Skills CRUD
  getSkills: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/skills${qs ? `?${qs}` : ''}`)
  },
  getSkill: (id) => request(`/skills/${id}`),
  createSkill: (data) => request('/skills', { method: 'POST', body: JSON.stringify(data) }),
  updateSkill: (id, data) => request(`/skills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSkill: (id) => request(`/skills/${id}`, { method: 'DELETE' }),
  forkSkill: (id, data = {}) => request(`/skills/${id}/fork`, { method: 'POST', body: JSON.stringify(data) }),
  exportSkill: (id) => request(`/skills/${id}/export`),
  importSkill: (data) => request('/skills/import', { method: 'POST', body: JSON.stringify(data) }),
  getVersions: (id) => request(`/skills/${id}/versions`),
  getVersion: (id, version) => request(`/skills/${id}/versions/${version}`),

  // Projects
  getProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  addSkillToProject: (projectId, skillId) =>
    request(`/projects/${projectId}/skills`, { method: 'POST', body: JSON.stringify({ skill_id: skillId }) }),
  removeSkillFromProject: (projectId, skillId) =>
    request(`/projects/${projectId}/skills/${skillId}`, { method: 'DELETE' }),

  // API Keys
  getApiKeys: (projectId) => request(`/projects/${projectId}/keys`),
  createApiKey: (projectId, data) =>
    request(`/projects/${projectId}/keys`, { method: 'POST', body: JSON.stringify(data) }),
  deleteApiKey: (projectId, keyId) => request(`/projects/${projectId}/keys/${keyId}`, { method: 'DELETE' }),

  // Webhooks
  getWebhooks: (projectId) => request(`/projects/${projectId}/webhooks`),
  createWebhook: (projectId, data) =>
    request(`/projects/${projectId}/webhooks`, { method: 'POST', body: JSON.stringify(data) }),
  deleteWebhook: (projectId, webhookId) =>
    request(`/projects/${projectId}/webhooks/${webhookId}`, { method: 'DELETE' }),

  // Analytics
  getAnalytics: () => request('/analytics'),
  getSkillAnalytics: (id) => request(`/analytics/skills/${id}`),
  getAccessLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/analytics/logs${qs ? `?${qs}` : ''}`)
  },
  getProjectAnalytics: (id) => request(`/analytics/projects/${id}`),

  // Optimizer
  getOptimizations: (skillId, model) => {
    const qs = model ? `?model=${model}` : ''
    return request(`/optimizer/skills/${skillId}${qs}`)
  },
  applyOptimization: (data) => request('/optimizer/apply', { method: 'POST', body: JSON.stringify(data) }),
  getModels: () => request('/optimizer/models'),
}
