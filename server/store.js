import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Redis } from '@upstash/redis'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '..', 'data', 'db.json')
const IS_SERVERLESS = !!process.env.VERCEL
const REDIS_KEY = 'doso_db'

// Initialize Redis if credentials exist (Vercel KV or standalone Upstash)
let redis = null
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
if (redisUrl && redisToken) {
  redis = new Redis({ url: redisUrl, token: redisToken })
}

const DEFAULT_DB = {
  skills: [],
  projects: [],
  accessLogs: [],
  apiKeys: [],
  optimizations: [],
  skillVersions: [],
  webhooks: [],
  scans: [],
}

class Store {
  constructor() {
    this._loaded = !redis // If no Redis, load from local file immediately
    this.data = redis ? { ...DEFAULT_DB } : this._loadLocal()
  }

  // Called once per cold start — loads persisted data from Redis
  async ensureLoaded() {
    if (this._loaded) return
    if (redis) {
      try {
        const raw = await redis.get(REDIS_KEY)
        if (raw) {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
          this.data = { ...DEFAULT_DB, ...parsed }
        }
      } catch (err) {
        console.error('Redis load error:', err.message)
      }
    }
    this._loaded = true
  }

  _loadLocal() {
    try {
      if (existsSync(DB_PATH)) {
        const raw = readFileSync(DB_PATH, 'utf-8')
        return { ...DEFAULT_DB, ...JSON.parse(raw) }
      }
    } catch {
      // ignore parse errors
    }
    return { ...DEFAULT_DB }
  }

  _save() {
    // Local file persistence
    if (!IS_SERVERLESS) {
      try {
        const dir = dirname(DB_PATH)
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8')
      } catch {
        // ignore write errors
      }
    }
    // Redis persistence (fire-and-forget for speed, data is already in memory)
    if (redis) {
      redis.set(REDIS_KEY, JSON.stringify(this.data)).catch((err) => {
        console.error('Redis save error:', err.message)
      })
    }
  }

  // Skills
  getSkills() {
    return this.data.skills.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  }

  getSkill(id) {
    return this.data.skills.find((s) => s.id === id) || null
  }

  getSkillsByProject(projectId) {
    return this.data.skills.filter((s) => s.project_id === projectId)
  }

  createSkill(skill) {
    this.data.skills.push(skill)
    this._saveVersion(skill.id, 1, skill.content, 'Initial version')
    this._save()
    return skill
  }

  updateSkill(id, updates) {
    const idx = this.data.skills.findIndex((s) => s.id === id)
    if (idx === -1) return null
    const old = this.data.skills[idx]
    const newVersion = (old.version || 1) + (updates.content && updates.content !== old.content ? 1 : 0)
    const updated = {
      ...old,
      ...updates,
      version: newVersion,
      updated_at: new Date().toISOString(),
    }
    this.data.skills[idx] = updated
    if (updates.content && updates.content !== old.content) {
      this._saveVersion(id, newVersion, updates.content, updates.change_summary || 'Updated')
    }
    this._save()
    return updated
  }

  deleteSkill(id) {
    const idx = this.data.skills.findIndex((s) => s.id === id)
    if (idx === -1) return false
    this.data.skills.splice(idx, 1)
    this.data.skillVersions = this.data.skillVersions.filter((v) => v.skill_id !== id)
    this.data.accessLogs = this.data.accessLogs.filter((l) => l.skill_id !== id)
    this._save()
    return true
  }

  searchSkills(query) {
    const q = query.toLowerCase()
    return this.data.skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.content || '').toLowerCase().includes(q) ||
        (s.tags || []).some((t) => t.toLowerCase().includes(q)) ||
        (s.category || '').toLowerCase().includes(q)
    )
  }

  // Versions
  _saveVersion(skillId, version, content, summary) {
    this.data.skillVersions.push({
      id: `v_${skillId}_${version}`,
      skill_id: skillId,
      version,
      content,
      change_summary: summary,
      created_at: new Date().toISOString(),
    })
  }

  getVersions(skillId) {
    return this.data.skillVersions
      .filter((v) => v.skill_id === skillId)
      .sort((a, b) => b.version - a.version)
  }

  getVersion(skillId, version) {
    return this.data.skillVersions.find(
      (v) => v.skill_id === skillId && v.version === version
    )
  }

  // Projects
  getProjects() {
    return this.data.projects.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  }

  getProject(id) {
    return this.data.projects.find((p) => p.id === id) || null
  }

  createProject(project) {
    this.data.projects.push(project)
    this._save()
    return project
  }

  updateProject(id, updates) {
    const idx = this.data.projects.findIndex((p) => p.id === id)
    if (idx === -1) return null
    this.data.projects[idx] = {
      ...this.data.projects[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    }
    this._save()
    return this.data.projects[idx]
  }

  deleteProject(id) {
    const idx = this.data.projects.findIndex((p) => p.id === id)
    if (idx === -1) return false
    this.data.skills.forEach((s) => {
      if (s.project_id === id) s.project_id = null
    })
    this.data.projects.splice(idx, 1)
    this._save()
    return true
  }

  // Access Logs
  logAccess(log) {
    this.data.accessLogs.push(log)
    if (this.data.accessLogs.length > 10000) {
      this.data.accessLogs = this.data.accessLogs.slice(-10000)
    }
    this._save()
    return log
  }

  getAccessLogs(filters = {}) {
    let logs = this.data.accessLogs
    if (filters.skill_id) logs = logs.filter((l) => l.skill_id === filters.skill_id)
    if (filters.project_id) logs = logs.filter((l) => l.project_id === filters.project_id)
    if (filters.model) logs = logs.filter((l) => l.model_used === filters.model)
    if (filters.since) {
      const since = new Date(filters.since)
      logs = logs.filter((l) => new Date(l.created_at) >= since)
    }
    return logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  getAccessStats(skillId) {
    const logs = this.data.accessLogs.filter((l) => l.skill_id === skillId)
    const models = {}
    const agents = {}
    const daily = {}
    logs.forEach((l) => {
      if (l.model_used) models[l.model_used] = (models[l.model_used] || 0) + 1
      if (l.agent_name) agents[l.agent_name] = (agents[l.agent_name] || 0) + 1
      const day = l.created_at.split('T')[0]
      daily[day] = (daily[day] || 0) + 1
    })
    return { total: logs.length, models, agents, daily }
  }

  getGlobalStats() {
    const logs = this.data.accessLogs
    const skillAccess = {}
    const models = {}
    const daily = {}
    logs.forEach((l) => {
      skillAccess[l.skill_id] = (skillAccess[l.skill_id] || 0) + 1
      if (l.model_used) models[l.model_used] = (models[l.model_used] || 0) + 1
      const day = l.created_at.split('T')[0]
      daily[day] = (daily[day] || 0) + 1
    })
    return {
      totalAccess: logs.length,
      totalSkills: this.data.skills.length,
      totalProjects: this.data.projects.length,
      skillAccess,
      models,
      daily,
    }
  }

  // API Keys
  getApiKeys(projectId) {
    return this.data.apiKeys.filter((k) => !projectId || k.project_id === projectId)
  }

  getApiKey(key) {
    return this.data.apiKeys.find((k) => k.key === key) || null
  }

  createApiKey(apiKey) {
    this.data.apiKeys.push(apiKey)
    this._save()
    return apiKey
  }

  deleteApiKey(id) {
    const idx = this.data.apiKeys.findIndex((k) => k.id === id)
    if (idx === -1) return false
    this.data.apiKeys.splice(idx, 1)
    this._save()
    return true
  }

  touchApiKey(key) {
    const k = this.data.apiKeys.find((a) => a.key === key)
    if (k) {
      k.last_used_at = new Date().toISOString()
      k.usage_count = (k.usage_count || 0) + 1
      this._save()
    }
  }

  // Optimizations
  getOptimizations(skillId) {
    return this.data.optimizations.filter((o) => o.skill_id === skillId)
  }

  createOptimization(opt) {
    this.data.optimizations.push(opt)
    this._save()
    return opt
  }

  updateOptimization(id, updates) {
    const idx = this.data.optimizations.findIndex((o) => o.id === id)
    if (idx === -1) return null
    this.data.optimizations[idx] = { ...this.data.optimizations[idx], ...updates }
    this._save()
    return this.data.optimizations[idx]
  }

  // Webhooks
  getWebhooks(projectId) {
    return this.data.webhooks.filter((w) => !projectId || w.project_id === projectId)
  }

  createWebhook(webhook) {
    this.data.webhooks.push(webhook)
    this._save()
    return webhook
  }

  deleteWebhook(id) {
    const idx = this.data.webhooks.findIndex((w) => w.id === id)
    if (idx === -1) return false
    this.data.webhooks.splice(idx, 1)
    this._save()
    return true
  }

  // Scans
  createScan(scan) {
    this.data.scans.push(scan)
    this._save()
    return scan
  }

  getScans() {
    return this.data.scans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  getScan(id) {
    return this.data.scans.find((s) => s.id === id) || null
  }

  deleteScan(id) {
    const idx = this.data.scans.findIndex((s) => s.id === id)
    if (idx === -1) return false
    this.data.scans.splice(idx, 1)
    this._save()
    return true
  }

  // Health Score
  getSkillHealth(skillId) {
    const skill = this.getSkill(skillId)
    if (!skill) return null
    const logs = this.data.accessLogs.filter((l) => l.skill_id === skillId)
    const now = new Date()
    const daysSinceUpdate = (now - new Date(skill.updated_at)) / (1000 * 60 * 60 * 24)
    const recentLogs = logs.filter(
      (l) => now - new Date(l.created_at) < 7 * 24 * 60 * 60 * 1000
    )

    let score = 100
    score -= Math.min(40, Math.floor(daysSinceUpdate * 2))
    if (recentLogs.length === 0) score -= 20
    if (skill.content.length > 500) score += 0
    else score -= 10
    const versions = this.getVersions(skillId)
    if (versions.length > 1) score += 5
    const uniqueModels = new Set(logs.map((l) => l.model_used).filter(Boolean))
    if (uniqueModels.size > 1) score += 5

    return {
      score: Math.max(0, Math.min(100, score)),
      factors: {
        staleness: Math.min(40, Math.floor(daysSinceUpdate * 2)),
        recentUsage: recentLogs.length,
        contentLength: skill.content.length,
        versionCount: versions.length,
        modelDiversity: uniqueModels.size,
        daysSinceUpdate: Math.floor(daysSinceUpdate),
      },
    }
  }
}

export const store = new Store()
