import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { store } from '../store.js'

export const optimizerRouter = Router()

// Model-specific optimization rules
const MODEL_RULES = {
  'claude-3.5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    capabilities: ['strong reasoning', 'code generation', 'instruction following'],
    suggestions: [
      {
        type: 'remove_scaffolding',
        pattern: /(?:^|\n)(#{1,3}\s*(?:Step-by-step|Instructions|How to use)[^\n]*\n(?:(?:[-*]\s[^\n]*\n?)+))/gi,
        message: 'Claude 3.5 Sonnet follows complex instructions well — you can remove step-by-step scaffolding and use concise directives instead.',
        confidence: 0.8,
      },
      {
        type: 'simplify_examples',
        pattern: /```[\s\S]{500,}?```/g,
        message: 'This model infers patterns from shorter examples. Consider trimming code examples to the essential pattern (< 20 lines each).',
        confidence: 0.7,
      },
    ],
  },
  'claude-opus-4': {
    name: 'Claude Opus 4',
    capabilities: ['deep analysis', 'complex reasoning', 'nuanced understanding'],
    suggestions: [
      {
        type: 'add_nuance',
        pattern: /(?:always|never|must|do not|don't)\s/gi,
        message: 'Opus 4 handles nuanced instructions well. Consider replacing absolute rules with contextual guidance for better results.',
        confidence: 0.7,
      },
    ],
  },
  'gpt-4o': {
    name: 'GPT-4o',
    capabilities: ['general purpose', 'code generation', 'creative writing'],
    suggestions: [
      {
        type: 'add_structure',
        pattern: /^[^#\n][\s\S]*$/,
        message: 'GPT-4o performs better with clearly structured prompts. Consider adding markdown headers to organize sections.',
        confidence: 0.75,
      },
    ],
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    capabilities: ['fast inference', 'simple tasks', 'cost effective'],
    suggestions: [
      {
        type: 'add_scaffolding',
        pattern: /(?:^|\n)(?!#{1,3}\s)(?![-*]\s)(?!```).{200,}/m,
        message: 'Smaller models benefit from more explicit structure. Consider breaking long paragraphs into bullet points or numbered steps.',
        confidence: 0.8,
      },
      {
        type: 'simplify_language',
        pattern: /(?:notwithstanding|aforementioned|subsequently|furthermore|in lieu of)/gi,
        message: 'Use simpler language for cost-effective models. Replace complex vocabulary with direct alternatives.',
        confidence: 0.85,
      },
    ],
  },
  'llama-3': {
    name: 'Llama 3',
    capabilities: ['open source', 'general purpose'],
    suggestions: [
      {
        type: 'add_scaffolding',
        pattern: /(?:^|\n)(?!#{1,3}\s)(?![-*]\s)(?!```).{100,}/m,
        message: 'Open-source models often need more explicit instructions. Add detailed step-by-step guidance and more examples.',
        confidence: 0.8,
      },
      {
        type: 'add_examples',
        pattern: /^(?![\s\S]*```)/m,
        message: 'Consider adding code examples to guide the model. Open-source models rely more heavily on in-context examples.',
        confidence: 0.75,
      },
    ],
  },
  'mistral-large': {
    name: 'Mistral Large',
    capabilities: ['multilingual', 'code', 'reasoning'],
    suggestions: [
      {
        type: 'add_structure',
        pattern: /^[^#\n][\s\S]*$/,
        message: 'Mistral models work best with clear section headers and structured formatting.',
        confidence: 0.7,
      },
    ],
  },
}

// Get optimization suggestions for a skill
optimizerRouter.get('/skills/:id', (req, res) => {
  const skill = store.getSkill(req.params.id)
  if (!skill) return res.status(404).json({ error: 'Skill not found' })

  const targetModel = req.query.model || null
  const suggestions = []

  // Get access logs to determine which models are using this skill
  const stats = store.getAccessStats(req.params.id)
  const modelsInUse = Object.keys(stats.models)

  // Generate suggestions for each model
  const modelsToCheck = targetModel ? [targetModel] : Object.keys(MODEL_RULES)

  modelsToCheck.forEach((modelKey) => {
    const rules = MODEL_RULES[modelKey]
    if (!rules) return

    rules.suggestions.forEach((rule) => {
      const matches = skill.content.match(rule.pattern)
      if (matches && matches.length > 0) {
        suggestions.push({
          id: `opt_${uuid().slice(0, 8)}`,
          skill_id: skill.id,
          target_model: modelKey,
          model_name: rules.name,
          type: rule.type,
          message: rule.message,
          confidence: rule.confidence,
          matches_found: matches.length,
          is_model_in_use: modelsInUse.includes(modelKey),
          status: 'pending',
        })
      }
    })
  })

  // Content quality suggestions (model-agnostic)
  const contentLength = skill.content.length
  if (contentLength < 200) {
    suggestions.push({
      id: `opt_${uuid().slice(0, 8)}`,
      skill_id: skill.id,
      target_model: 'all',
      model_name: 'All Models',
      type: 'content_too_short',
      message: 'Skill content is quite short. Consider adding more context, examples, or guidelines for better results.',
      confidence: 0.9,
      matches_found: 1,
      is_model_in_use: true,
      status: 'pending',
    })
  }
  if (contentLength > 5000) {
    suggestions.push({
      id: `opt_${uuid().slice(0, 8)}`,
      skill_id: skill.id,
      target_model: 'all',
      model_name: 'All Models',
      type: 'content_too_long',
      message: 'Skill content is very long. Consider splitting into focused sub-skills for better performance and token efficiency.',
      confidence: 0.7,
      matches_found: 1,
      is_model_in_use: true,
      status: 'pending',
    })
  }

  // Check for missing sections
  const hasExamples = /```/.test(skill.content)
  const hasHeaders = /^#{1,3}\s/m.test(skill.content)
  if (!hasExamples) {
    suggestions.push({
      id: `opt_${uuid().slice(0, 8)}`,
      skill_id: skill.id,
      target_model: 'all',
      model_name: 'All Models',
      type: 'missing_examples',
      message: 'No code examples found. Adding examples significantly improves model adherence to your skill guidelines.',
      confidence: 0.85,
      matches_found: 1,
      is_model_in_use: true,
      status: 'pending',
    })
  }
  if (!hasHeaders) {
    suggestions.push({
      id: `opt_${uuid().slice(0, 8)}`,
      skill_id: skill.id,
      target_model: 'all',
      model_name: 'All Models',
      type: 'missing_structure',
      message: 'No section headers found. Structured content with headers helps models parse and follow instructions better.',
      confidence: 0.9,
      matches_found: 1,
      is_model_in_use: true,
      status: 'pending',
    })
  }

  res.json({
    data: {
      skill: { id: skill.id, name: skill.name },
      models_in_use: modelsInUse,
      available_models: Object.entries(MODEL_RULES).map(([key, val]) => ({
        key,
        name: val.name,
        capabilities: val.capabilities,
      })),
      suggestions: suggestions.sort((a, b) => b.confidence - a.confidence),
      summary: {
        total: suggestions.length,
        high_confidence: suggestions.filter((s) => s.confidence >= 0.8).length,
        actionable: suggestions.filter((s) => s.is_model_in_use).length,
      },
    },
  })
})

// Apply an optimization (update skill based on suggestion)
optimizerRouter.post('/apply', (req, res) => {
  const { skill_id, suggestion_id, new_content } = req.body
  if (!skill_id || !new_content) {
    return res.status(400).json({ error: 'skill_id and new_content required' })
  }
  const skill = store.getSkill(skill_id)
  if (!skill) return res.status(404).json({ error: 'Skill not found' })

  const updated = store.updateSkill(skill_id, {
    content: new_content,
    change_summary: `Applied optimization: ${suggestion_id || 'manual'}`,
  })

  res.json({ data: updated })
})

// Get supported models
optimizerRouter.get('/models', (req, res) => {
  const models = Object.entries(MODEL_RULES).map(([key, val]) => ({
    key,
    name: val.name,
    capabilities: val.capabilities,
    suggestion_count: val.suggestions.length,
  }))
  res.json({ data: models })
})
