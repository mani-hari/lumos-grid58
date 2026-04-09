import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { store } from '../store.js'

export const projectsRouter = Router()

// List all projects
projectsRouter.get('/', (req, res) => {
  const projects = store.getProjects().map((p) => {
    const skills = store.getSkillsByProject(p.id)
    return { ...p, skill_count: skills.length }
  })
  res.json({ data: projects })
})

// Get single project with its skills
projectsRouter.get('/:id', (req, res) => {
  const project = store.getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const skills = store.getSkillsByProject(req.params.id)
  const apiKeys = store.getApiKeys(req.params.id)
  const logs = store.getAccessLogs({ project_id: req.params.id })
  res.json({
    data: {
      ...project,
      skills,
      api_keys: apiKeys,
      stats: {
        skill_count: skills.length,
        total_access: logs.length,
        recent_access: logs.filter(
          (l) => Date.now() - new Date(l.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
        ).length,
      },
    },
  })
})

// Create project
projectsRouter.post('/', (req, res) => {
  const { name, description } = req.body
  if (!name) return res.status(400).json({ error: 'Name is required' })
  const project = {
    id: uuid(),
    name,
    description: description || '',
    api_key: `sk_${uuid().replace(/-/g, '')}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  store.createProject(project)
  res.status(201).json({ data: project })
})

// Update project
projectsRouter.put('/:id', (req, res) => {
  const project = store.getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const updated = store.updateProject(req.params.id, {
    name: req.body.name,
    description: req.body.description,
  })
  res.json({ data: updated })
})

// Delete project
projectsRouter.delete('/:id', (req, res) => {
  const success = store.deleteProject(req.params.id)
  if (!success) return res.status(404).json({ error: 'Project not found' })
  res.status(204).end()
})

// Add skill to project
projectsRouter.post('/:id/skills', (req, res) => {
  const project = store.getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const { skill_id } = req.body
  const skill = store.getSkill(skill_id)
  if (!skill) return res.status(404).json({ error: 'Skill not found' })
  store.updateSkill(skill_id, { project_id: req.params.id })
  res.json({ data: { ...skill, project_id: req.params.id } })
})

// Remove skill from project
projectsRouter.delete('/:id/skills/:skillId', (req, res) => {
  const skill = store.getSkill(req.params.skillId)
  if (!skill) return res.status(404).json({ error: 'Skill not found' })
  store.updateSkill(req.params.skillId, { project_id: null })
  res.json({ data: { ...skill, project_id: null } })
})

// API Keys for project
projectsRouter.get('/:id/keys', (req, res) => {
  const project = store.getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const keys = store.getApiKeys(req.params.id)
  res.json({ data: keys })
})

projectsRouter.post('/:id/keys', (req, res) => {
  const project = store.getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const apiKey = {
    id: uuid(),
    key: `sk_${uuid().replace(/-/g, '')}`,
    project_id: req.params.id,
    name: req.body.name || 'API Key',
    permissions: req.body.permissions || { read: true, write: false },
    usage_count: 0,
    created_at: new Date().toISOString(),
    last_used_at: null,
  }
  store.createApiKey(apiKey)
  res.status(201).json({ data: apiKey })
})

projectsRouter.delete('/:id/keys/:keyId', (req, res) => {
  const success = store.deleteApiKey(req.params.keyId)
  if (!success) return res.status(404).json({ error: 'API key not found' })
  res.status(204).end()
})

// Webhooks for project
projectsRouter.get('/:id/webhooks', (req, res) => {
  const project = store.getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const webhooks = store.getWebhooks(req.params.id)
  res.json({ data: webhooks })
})

projectsRouter.post('/:id/webhooks', (req, res) => {
  const project = store.getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const { url, events } = req.body
  if (!url) return res.status(400).json({ error: 'URL is required' })
  const webhook = {
    id: uuid(),
    project_id: req.params.id,
    url,
    events: events || ['skill.accessed', 'skill.updated'],
    active: true,
    created_at: new Date().toISOString(),
  }
  store.createWebhook(webhook)
  res.status(201).json({ data: webhook })
})

projectsRouter.delete('/:id/webhooks/:webhookId', (req, res) => {
  const success = store.deleteWebhook(req.params.webhookId)
  if (!success) return res.status(404).json({ error: 'Webhook not found' })
  res.status(204).end()
})
