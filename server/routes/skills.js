import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { store } from '../store.js'

export const skillsRouter = Router()

// List all skills
skillsRouter.get('/', (req, res) => {
  let skills = store.getSkills()
  if (req.query.category) {
    skills = skills.filter((s) => s.category === req.query.category)
  }
  if (req.query.project_id) {
    skills = skills.filter((s) => s.project_id === req.query.project_id)
  }
  if (req.query.search) {
    skills = store.searchSkills(req.query.search)
  }
  if (req.query.tag) {
    const tag = req.query.tag.toLowerCase()
    skills = skills.filter((s) => (s.tags || []).some((t) => t.toLowerCase() === tag))
  }
  if (req.query.is_public !== undefined) {
    skills = skills.filter((s) => s.is_public === (req.query.is_public === 'true'))
  }
  res.json({ data: skills, meta: { total: skills.length } })
})

// Get single skill
skillsRouter.get('/:id', (req, res) => {
  const skill = store.getSkill(req.params.id)
  if (!skill) return res.status(404).json({ error: 'Skill not found' })

  // Log access if it's coming from an agent (has X-Agent-Name or non-browser User-Agent)
  const ua = req.headers['user-agent'] || ''
  const isAgent = req.headers['x-agent-name'] || !ua.includes('Mozilla')
  if (isAgent) {
    store.logAccess({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      skill_id: skill.id,
      project_id: skill.project_id,
      agent_name: req.headers['x-agent-name'] || ua.split('/')[0] || 'unknown',
      model_used: req.headers['x-model'] || req.query.model || null,
      ip_address: req.ip,
      user_agent: ua,
      endpoint_type: 'rest',
      created_at: new Date().toISOString(),
    })
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`
  res.json({
    data: {
      ...skill,
      endpoints: {
        rest: `${baseUrl}/api/v1/skills/${skill.id}`,
        raw: `${baseUrl}/api/v1/skills/${skill.id}/raw`,
        mcp: `${baseUrl}/api/v1/mcp/skills/${skill.id}`,
      },
      health: store.getSkillHealth(skill.id),
    },
  })
})

// Resolve {{include:skill-name}} syntax in skill content
function resolveIncludes(content, projectId, visited = new Set()) {
  return content.replace(/\{\{include:([^}]+)\}\}/g, (match, refName) => {
    const name = refName.trim()
    if (visited.has(name)) return `<!-- circular include: ${name} -->`
    visited.add(name)
    const skills = store.getSkillsByProject(projectId)
    const target = skills.find((s) => s.name === name || s.name === name.replace(/\.md$/, ''))
    if (!target) return `<!-- include not found: ${name} -->`
    return resolveIncludes(target.content || '', projectId, visited)
  })
}

// Get raw skill content (for agent consumption)
skillsRouter.get('/:id/raw', (req, res) => {
  const skill = store.getSkill(req.params.id)
  if (!skill) return res.status(404).send('Skill not found')

  // Always log raw access — this is the primary agent endpoint
  store.logAccess({
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    skill_id: skill.id,
    project_id: skill.project_id,
    agent_name: req.headers['x-agent-name'] || req.headers['user-agent'] || 'unknown',
    model_used: req.headers['x-model'] || req.query.model || null,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    endpoint_type: 'raw',
    created_at: new Date().toISOString(),
  })

  // Resolve includes before serving
  const resolved = skill.project_id ? resolveIncludes(skill.content, skill.project_id) : skill.content
  res.type('text/markdown').send(resolved)
})

// Get skill versions
skillsRouter.get('/:id/versions', (req, res) => {
  const skill = store.getSkill(req.params.id)
  if (!skill) return res.status(404).json({ error: 'Skill not found' })
  const versions = store.getVersions(req.params.id)
  res.json({ data: versions })
})

// Get specific version
skillsRouter.get('/:id/versions/:version', (req, res) => {
  const version = store.getVersion(req.params.id, parseInt(req.params.version))
  if (!version) return res.status(404).json({ error: 'Version not found' })
  res.json({ data: version })
})

// Create skill
skillsRouter.post('/', (req, res) => {
  const { name, description, content, category, tags, project_id, is_public } = req.body
  if (!name || !content) {
    return res.status(400).json({ error: 'Name and content are required' })
  }
  const skill = {
    id: uuid(),
    name,
    description: description || '',
    content,
    category: category || 'General',
    tags: tags || [],
    is_public: is_public !== false,
    version: 1,
    project_id: project_id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  store.createSkill(skill)

  const baseUrl = `${req.protocol}://${req.get('host')}`
  res.status(201).json({
    data: {
      ...skill,
      endpoints: {
        rest: `${baseUrl}/api/v1/skills/${skill.id}`,
        raw: `${baseUrl}/api/v1/skills/${skill.id}/raw`,
        mcp: `${baseUrl}/api/v1/mcp/skills/${skill.id}`,
      },
    },
  })
})

// Update skill
skillsRouter.put('/:id', (req, res) => {
  const skill = store.getSkill(req.params.id)
  if (!skill) return res.status(404).json({ error: 'Skill not found' })

  const updated = store.updateSkill(req.params.id, {
    name: req.body.name,
    description: req.body.description,
    content: req.body.content,
    category: req.body.category,
    tags: req.body.tags,
    project_id: req.body.project_id,
    is_public: req.body.is_public,
    change_summary: req.body.change_summary,
  })

  const baseUrl = `${req.protocol}://${req.get('host')}`
  res.json({
    data: {
      ...updated,
      endpoints: {
        rest: `${baseUrl}/api/v1/skills/${updated.id}`,
        raw: `${baseUrl}/api/v1/skills/${updated.id}/raw`,
        mcp: `${baseUrl}/api/v1/mcp/skills/${updated.id}`,
      },
    },
  })
})

// Delete skill
skillsRouter.delete('/:id', (req, res) => {
  const success = store.deleteSkill(req.params.id)
  if (!success) return res.status(404).json({ error: 'Skill not found' })
  res.status(204).end()
})

// Fork a skill
skillsRouter.post('/:id/fork', (req, res) => {
  const original = store.getSkill(req.params.id)
  if (!original) return res.status(404).json({ error: 'Skill not found' })

  const forked = {
    id: uuid(),
    name: req.body.name || `${original.name} (Fork)`,
    description: original.description,
    content: original.content,
    category: original.category,
    tags: [...(original.tags || []), 'forked'],
    is_public: true,
    version: 1,
    project_id: req.body.project_id || null,
    forked_from: original.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  store.createSkill(forked)

  const baseUrl = `${req.protocol}://${req.get('host')}`
  res.status(201).json({
    data: {
      ...forked,
      endpoints: {
        rest: `${baseUrl}/api/v1/skills/${forked.id}`,
        raw: `${baseUrl}/api/v1/skills/${forked.id}/raw`,
        mcp: `${baseUrl}/api/v1/mcp/skills/${forked.id}`,
      },
    },
  })
})

// Export skill as JSON
skillsRouter.get('/:id/export', (req, res) => {
  const skill = store.getSkill(req.params.id)
  if (!skill) return res.status(404).json({ error: 'Skill not found' })
  const versions = store.getVersions(req.params.id)
  res.setHeader('Content-Disposition', `attachment; filename="${skill.name.replace(/\s+/g, '-').toLowerCase()}.json"`)
  res.json({
    export_version: '1.0',
    exported_at: new Date().toISOString(),
    skill: { ...skill },
    versions,
  })
})

// Import skill from JSON
skillsRouter.post('/import', (req, res) => {
  const { skill: importedSkill } = req.body
  if (!importedSkill || !importedSkill.name || !importedSkill.content) {
    return res.status(400).json({ error: 'Invalid import format' })
  }
  const skill = {
    id: uuid(),
    name: importedSkill.name,
    description: importedSkill.description || '',
    content: importedSkill.content,
    category: importedSkill.category || 'General',
    tags: [...(importedSkill.tags || []), 'imported'],
    is_public: true,
    version: 1,
    project_id: req.body.project_id || null,
    imported_from: importedSkill.id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  store.createSkill(skill)

  const baseUrl = `${req.protocol}://${req.get('host')}`
  res.status(201).json({
    data: {
      ...skill,
      endpoints: {
        rest: `${baseUrl}/api/v1/skills/${skill.id}`,
        raw: `${baseUrl}/api/v1/skills/${skill.id}/raw`,
        mcp: `${baseUrl}/api/v1/mcp/skills/${skill.id}`,
      },
    },
  })
})
