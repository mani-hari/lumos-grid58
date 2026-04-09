import { Router } from 'express'
import { store } from '../store.js'

export const analyticsRouter = Router()

// Global analytics
analyticsRouter.get('/', (req, res) => {
  const stats = store.getGlobalStats()
  const skills = store.getSkills()

  // Top skills by access
  const topSkills = Object.entries(stats.skillAccess)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => {
      const skill = store.getSkill(id)
      return { id, name: skill?.name || 'Deleted', count }
    })

  // Model distribution
  const modelDist = Object.entries(stats.models)
    .sort((a, b) => b[1] - a[1])
    .map(([model, count]) => ({ model, count }))

  // Daily access for last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const dailyAccess = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    dailyAccess.push({ date: dateStr, count: stats.daily[dateStr] || 0 })
  }

  // Health overview
  const healthScores = skills.map((s) => ({
    id: s.id,
    name: s.name,
    ...store.getSkillHealth(s.id),
  }))

  res.json({
    data: {
      overview: {
        totalSkills: stats.totalSkills,
        totalProjects: stats.totalProjects,
        totalAccess: stats.totalAccess,
        avgHealthScore:
          healthScores.length > 0
            ? Math.round(healthScores.reduce((sum, h) => sum + h.score, 0) / healthScores.length)
            : 0,
      },
      topSkills,
      modelDistribution: modelDist,
      dailyAccess,
      healthScores,
    },
  })
})

// Skill-specific analytics
analyticsRouter.get('/skills/:id', (req, res) => {
  const skill = store.getSkill(req.params.id)
  if (!skill) return res.status(404).json({ error: 'Skill not found' })

  const stats = store.getAccessStats(req.params.id)
  const health = store.getSkillHealth(req.params.id)
  const versions = store.getVersions(req.params.id)

  // Daily access for last 30 days
  const dailyAccess = []
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    dailyAccess.push({ date: dateStr, count: stats.daily[dateStr] || 0 })
  }

  res.json({
    data: {
      skill: { id: skill.id, name: skill.name },
      totalAccess: stats.total,
      modelDistribution: Object.entries(stats.models).map(([model, count]) => ({ model, count })),
      agentDistribution: Object.entries(stats.agents).map(([agent, count]) => ({ agent, count })),
      dailyAccess,
      health,
      versionCount: versions.length,
    },
  })
})

// Access logs with filtering
analyticsRouter.get('/logs', (req, res) => {
  const filters = {}
  if (req.query.skill_id) filters.skill_id = req.query.skill_id
  if (req.query.project_id) filters.project_id = req.query.project_id
  if (req.query.model) filters.model = req.query.model
  if (req.query.since) filters.since = req.query.since

  const logs = store.getAccessLogs(filters)
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 50
  const start = (page - 1) * limit
  const paged = logs.slice(start, start + limit)

  // Enrich logs with skill names
  const enriched = paged.map((log) => {
    const skill = store.getSkill(log.skill_id)
    return { ...log, skill_name: skill?.name || 'Deleted' }
  })

  res.json({
    data: enriched,
    meta: {
      total: logs.length,
      page,
      limit,
      pages: Math.ceil(logs.length / limit),
    },
  })
})

// Project analytics
analyticsRouter.get('/projects/:id', (req, res) => {
  const project = store.getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  const skills = store.getSkillsByProject(req.params.id)
  const logs = store.getAccessLogs({ project_id: req.params.id })

  const skillStats = skills.map((s) => ({
    id: s.id,
    name: s.name,
    access: logs.filter((l) => l.skill_id === s.id).length,
    health: store.getSkillHealth(s.id),
  }))

  res.json({
    data: {
      project: { id: project.id, name: project.name },
      skillCount: skills.length,
      totalAccess: logs.length,
      skillStats,
    },
  })
})
