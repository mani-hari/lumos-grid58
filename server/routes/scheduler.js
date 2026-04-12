import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { store } from '../store.js'

export const schedulerRouter = Router()

const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }
  return new Anthropic()
}

// ---------------------------------------------------------------------------
// POST /scheduler/run/:projectId — Run optimization on all skills in a project
// ---------------------------------------------------------------------------
schedulerRouter.post('/run/:projectId', async (req, res) => {
  const project = store.getProject(req.params.projectId)
  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }

  const skills = store.getSkillsByProject(req.params.projectId)
  if (skills.length === 0) {
    return res.json({ data: { optimizations: [], summary: { total: 0, project_id: req.params.projectId } } })
  }

  try {
    const client = getClient()
    const optimizations = []

    for (const skill of skills) {
      const systemPrompt = `You are an expert AI prompt optimizer for doso.dev, a hosted skills platform. Your task is to optimize the given skill/prompt for maximum clarity, consistency, and effectiveness. Always respond with valid JSON only — no markdown fences, no extra text.`

      const userPrompt = `Optimize the following skill/prompt for clarity. Improve structure, remove ambiguity, and enhance effectiveness while preserving the original intent.

--- SKILL CONTENT START ---
${skill.content}
--- SKILL CONTENT END ---

Return a JSON object with exactly this structure:
{
  "optimized_content": "The full optimized version of the skill",
  "diff_summary": "A brief summary of what was changed and why",
  "confidence": <0-100, how confident you are this is an improvement>
}`

      const response = await client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 4096,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt,
      })

      const text = response.content[0]?.text || ''
      let result
      try {
        result = JSON.parse(text)
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0])
        } else {
          continue
        }
      }

      const optimization = {
        id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        skill_id: skill.id,
        project_id: req.params.projectId,
        original_content: skill.content,
        optimized_content: result.optimized_content,
        diff_summary: result.diff_summary,
        confidence: result.confidence,
        status: 'pending',
        created_at: new Date().toISOString(),
      }

      store.createOptimization(optimization)
      optimizations.push(optimization)
    }

    // Update project last_run timestamp
    store.updateProject(req.params.projectId, {
      schedule_last_run: new Date().toISOString(),
    })

    res.json({
      data: {
        optimizations,
        summary: {
          total: optimizations.length,
          skills_processed: skills.length,
          project_id: req.params.projectId,
        },
      },
    })
  } catch (err) {
    console.error('Scheduler run error:', err)
    if (err.message === 'ANTHROPIC_API_KEY is not configured') {
      return res.status(500).json({ error: err.message })
    }
    res.status(500).json({ error: 'Optimization run failed: ' + err.message })
  }
})

// ---------------------------------------------------------------------------
// GET /scheduler/config/:projectId — Get schedule config
// ---------------------------------------------------------------------------
schedulerRouter.get('/config/:projectId', (req, res) => {
  const project = store.getProject(req.params.projectId)
  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }

  res.json({
    data: {
      project_id: project.id,
      enabled: project.schedule_enabled || false,
      frequency: project.schedule_frequency || 'weekly',
      last_run: project.schedule_last_run || null,
    },
  })
})

// ---------------------------------------------------------------------------
// POST /scheduler/config/:projectId — Set schedule config
// ---------------------------------------------------------------------------
schedulerRouter.post('/config/:projectId', (req, res) => {
  const project = store.getProject(req.params.projectId)
  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }

  const { enabled, frequency } = req.body
  const validFrequencies = ['daily', 'weekly']

  if (frequency && !validFrequencies.includes(frequency)) {
    return res.status(400).json({
      error: `frequency must be one of: ${validFrequencies.join(', ')}`,
    })
  }

  const updates = {}
  if (enabled !== undefined) updates.schedule_enabled = !!enabled
  if (frequency) updates.schedule_frequency = frequency

  const updated = store.updateProject(req.params.projectId, updates)

  res.json({
    data: {
      project_id: updated.id,
      enabled: updated.schedule_enabled || false,
      frequency: updated.schedule_frequency || 'weekly',
      last_run: updated.schedule_last_run || null,
    },
  })
})

// ---------------------------------------------------------------------------
// GET /scheduler/pending/:projectId — Get pending optimizations
// ---------------------------------------------------------------------------
schedulerRouter.get('/pending/:projectId', (req, res) => {
  const project = store.getProject(req.params.projectId)
  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }

  const pending = (store.data.optimizations || []).filter(
    (o) => o.project_id === req.params.projectId && o.status === 'pending'
  )

  res.json({
    data: pending,
    meta: { total: pending.length },
  })
})

// ---------------------------------------------------------------------------
// POST /scheduler/apply/:optimizationId — Apply a pending optimization
// ---------------------------------------------------------------------------
schedulerRouter.post('/apply/:optimizationId', (req, res) => {
  const optimization = (store.data.optimizations || []).find(
    (o) => o.id === req.params.optimizationId
  )
  if (!optimization) {
    return res.status(404).json({ error: 'Optimization not found' })
  }

  if (optimization.status !== 'pending') {
    return res.status(400).json({ error: `Optimization is already ${optimization.status}` })
  }

  // Update the skill content with the optimized version
  const updatedSkill = store.updateSkill(optimization.skill_id, {
    content: optimization.optimized_content,
    change_summary: `Applied scheduled optimization: ${optimization.diff_summary}`,
  })

  if (!updatedSkill) {
    return res.status(404).json({ error: 'Skill not found' })
  }

  // Mark optimization as applied
  store.updateOptimization(optimization.id, { status: 'applied' })

  res.json({ data: updatedSkill })
})

// ---------------------------------------------------------------------------
// POST /scheduler/dismiss/:optimizationId — Dismiss a pending optimization
// ---------------------------------------------------------------------------
schedulerRouter.post('/dismiss/:optimizationId', (req, res) => {
  const optimization = (store.data.optimizations || []).find(
    (o) => o.id === req.params.optimizationId
  )
  if (!optimization) {
    return res.status(404).json({ error: 'Optimization not found' })
  }

  store.updateOptimization(optimization.id, { status: 'dismissed' })

  res.json({ data: { id: optimization.id, status: 'dismissed' } })
})

// ---------------------------------------------------------------------------
// POST /test/run — Run a prompt test (playground feature)
// ---------------------------------------------------------------------------
schedulerRouter.post('/test/run', async (req, res) => {
  const { system_prompt, user_message, model } = req.body
  if (!user_message) {
    return res.status(400).json({ error: 'user_message is required' })
  }

  try {
    const client = getClient()
    const targetModel = model || DEFAULT_MODEL

    const messages = [{ role: 'user', content: user_message }]

    const requestOptions = {
      model: targetModel,
      max_tokens: 4096,
      messages,
    }

    if (system_prompt) {
      requestOptions.system = system_prompt
    }

    const response = await client.messages.create(requestOptions)

    const text = response.content[0]?.text || ''

    res.json({
      response: text,
      usage: {
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens,
      },
      model: targetModel,
    })
  } catch (err) {
    console.error('Test run error:', err)
    if (err.message === 'ANTHROPIC_API_KEY is not configured') {
      return res.status(500).json({ error: err.message })
    }
    res.status(500).json({ error: 'Test run failed: ' + err.message })
  }
})
