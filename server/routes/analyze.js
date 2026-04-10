import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'

export const analyzeRouter = Router()

const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }
  return new Anthropic()
}

// ---------------------------------------------------------------------------
// POST /api/v1/analyze/skill — Analyze a single skill/prompt
// ---------------------------------------------------------------------------
analyzeRouter.post('/skill', async (req, res) => {
  const { content, name, context, model } = req.body
  if (!content) {
    return res.status(400).json({ error: 'content is required' })
  }

  try {
    const client = getClient()
    const targetModel = model || DEFAULT_MODEL

    const systemPrompt = `You are an expert AI prompt/skill analyst for doso.dev, a hosted skills platform. You analyze AI prompts and skills with precision. Always respond with valid JSON only — no markdown fences, no extra text.`

    const userPrompt = `Analyze the following AI skill/prompt and return a JSON object with your findings.

Skill name: ${name || 'Unnamed'}
${context ? `Additional context: ${context}` : ''}

--- SKILL CONTENT START ---
${content}
--- SKILL CONTENT END ---

Return a JSON object with exactly this structure:
{
  "contradictions": [
    {
      "description": "Description of the contradiction",
      "location_a": "First conflicting instruction (quote or paraphrase)",
      "location_b": "Second conflicting instruction (quote or paraphrase)",
      "severity": "high" | "medium" | "low"
    }
  ],
  "token_estimate": {
    "input_tokens": <estimated token count of this skill>,
    "estimated_cost_per_invocation_usd": <estimated cost in USD for one use as system prompt>,
    "model_used_for_estimate": "${targetModel}"
  },
  "optimizations": [
    {
      "type": "unnecessary_scaffolding" | "redundant_instructions" | "verbose_section" | "unclear_instruction" | "missing_context",
      "description": "What could be improved",
      "original_text": "The problematic text (quoted)",
      "suggested_fix": "How to fix it",
      "token_savings_estimate": <number>
    }
  ],
  "quality_score": {
    "overall": <0-100>,
    "breakdown": {
      "clarity": <0-100>,
      "completeness": <0-100>,
      "consistency": <0-100>,
      "efficiency": <0-100>,
      "specificity": <0-100>
    },
    "summary": "Brief explanation of the score"
  },
  "model_specificity": {
    "model_specific_parts": [
      {
        "text": "The model-specific instruction",
        "target_model": "Which model this is for",
        "reason": "Why this is model-specific"
      }
    ],
    "universal_parts": [
      {
        "text": "The universal instruction",
        "reason": "Why this works across models"
      }
    ],
    "portability_score": <0-100, where 100 means fully portable across models>
  }
}`

    const response = await client.messages.create({
      model: targetModel,
      max_tokens: 4096,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const text = response.content[0]?.text || ''
    let analysis
    try {
      analysis = JSON.parse(text)
    } catch {
      // Try to extract JSON from the response if it has extra text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        return res.status(502).json({
          error: 'Failed to parse analysis response',
          raw: text.slice(0, 500),
        })
      }
    }

    res.json({
      data: {
        name: name || 'Unnamed',
        model_used: targetModel,
        analysis,
        usage: {
          input_tokens: response.usage?.input_tokens,
          output_tokens: response.usage?.output_tokens,
        },
        analyzed_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('Skill analysis error:', err)
    if (err.message === 'ANTHROPIC_API_KEY is not configured') {
      return res.status(500).json({ error: err.message })
    }
    res.status(500).json({ error: 'Analysis failed: ' + err.message })
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/analyze/project — Analyze all skills in a project
// ---------------------------------------------------------------------------
analyzeRouter.post('/project', async (req, res) => {
  const { skills, model } = req.body
  if (!skills || !Array.isArray(skills) || skills.length === 0) {
    return res.status(400).json({ error: 'skills array is required and must not be empty' })
  }

  try {
    const client = getClient()
    const targetModel = model || DEFAULT_MODEL

    const systemPrompt = `You are an expert AI prompt/skill analyst for doso.dev, a hosted skills platform. You analyze collections of AI skills to find cross-cutting issues. Always respond with valid JSON only — no markdown fences, no extra text.`

    const skillsList = skills
      .map(
        (s, i) =>
          `--- SKILL ${i + 1}: "${s.name || `Unnamed ${i + 1}`}" ---\n${s.content}\n--- END SKILL ${i + 1} ---`
      )
      .join('\n\n')

    const userPrompt = `Analyze the following collection of ${skills.length} AI skills/prompts and identify cross-cutting issues.

${skillsList}

Return a JSON object with exactly this structure:
{
  "cross_skill_contradictions": [
    {
      "skill_a": "Name of first skill",
      "skill_b": "Name of second skill",
      "instruction_a": "What skill A says (quoted or paraphrased)",
      "instruction_b": "What skill B says that contradicts it",
      "severity": "high" | "medium" | "low",
      "description": "Explanation of the contradiction"
    }
  ],
  "redundancies": [
    {
      "instruction": "The repeated instruction (quoted or paraphrased)",
      "found_in": ["Skill name 1", "Skill name 2"],
      "suggestion": "How to consolidate"
    }
  ],
  "coverage_gaps": [
    {
      "gap": "Description of what's missing",
      "relevant_skills": ["Skills that should address this"],
      "suggestion": "How to fill the gap",
      "priority": "high" | "medium" | "low"
    }
  ],
  "health_score": {
    "overall": <0-100>,
    "breakdown": {
      "consistency": <0-100, how consistent the skills are with each other>,
      "coverage": <0-100, how comprehensive the skill set is>,
      "efficiency": <0-100, how little redundancy exists>,
      "clarity": <0-100, how clear the instructions are across skills>
    },
    "summary": "Brief explanation of the project health"
  },
  "recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "action": "What to do",
      "reason": "Why it matters"
    }
  ]
}`

    const response = await client.messages.create({
      model: targetModel,
      max_tokens: 4096,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const text = response.content[0]?.text || ''
    let analysis
    try {
      analysis = JSON.parse(text)
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        return res.status(502).json({
          error: 'Failed to parse analysis response',
          raw: text.slice(0, 500),
        })
      }
    }

    res.json({
      data: {
        skills_analyzed: skills.length,
        model_used: targetModel,
        analysis,
        usage: {
          input_tokens: response.usage?.input_tokens,
          output_tokens: response.usage?.output_tokens,
        },
        analyzed_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('Project analysis error:', err)
    if (err.message === 'ANTHROPIC_API_KEY is not configured') {
      return res.status(500).json({ error: err.message })
    }
    res.status(500).json({ error: 'Analysis failed: ' + err.message })
  }
})

// ---------------------------------------------------------------------------
// POST /api/v1/analyze/optimize — Generate optimized version of a skill
// ---------------------------------------------------------------------------
analyzeRouter.post('/optimize', async (req, res) => {
  const { content, name, target_model, optimization_type } = req.body
  if (!content) {
    return res.status(400).json({ error: 'content is required' })
  }

  const validTypes = ['token_reduction', 'clarity', 'model_specific']
  const optType = optimization_type || 'clarity'
  if (!validTypes.includes(optType)) {
    return res.status(400).json({
      error: `optimization_type must be one of: ${validTypes.join(', ')}`,
    })
  }

  try {
    const client = getClient()
    const model = target_model || DEFAULT_MODEL

    const systemPrompt = `You are an expert AI prompt engineer for doso.dev, a hosted skills platform. You optimize AI prompts and skills. Always respond with valid JSON only — no markdown fences, no extra text.`

    const optimizationInstructions = {
      token_reduction: `Optimize this skill for MINIMAL TOKEN USAGE while preserving all essential functionality.
- Remove unnecessary verbosity, filler words, and redundant instructions
- Consolidate overlapping sections
- Use concise phrasing without losing clarity
- Remove examples that don't add unique value
- The optimized version should be significantly shorter but equally effective`,

      clarity: `Optimize this skill for MAXIMUM CLARITY and effectiveness.
- Restructure for better logical flow
- Add clear section headers where missing
- Make ambiguous instructions precise
- Ensure consistent terminology throughout
- Improve formatting for better model comprehension
- Fix any contradictions or unclear directives`,

      model_specific: `Optimize this skill specifically for the "${model}" model.
- Leverage known strengths of this model
- Remove scaffolding the model doesn't need
- Adjust instruction style to what this model responds to best
- Add model-appropriate examples if beneficial
- Use formatting conventions this model handles well`,
    }

    const userPrompt = `${optimizationInstructions[optType]}

Skill name: ${name || 'Unnamed'}

--- ORIGINAL SKILL ---
${content}
--- END ORIGINAL SKILL ---

Return a JSON object with exactly this structure:
{
  "optimized_content": "The full optimized version of the skill",
  "diff_summary": {
    "changes_made": [
      {
        "type": "removed" | "rewritten" | "restructured" | "added",
        "description": "What was changed and why",
        "original_text": "Original text if applicable (brief quote)",
        "impact": "Expected improvement"
      }
    ],
    "token_change": {
      "original_estimate": <number>,
      "optimized_estimate": <number>,
      "reduction_percent": <number>
    }
  },
  "optimization_type": "${optType}",
  "confidence": <0-100, how confident you are this is an improvement>,
  "warnings": ["Any caveats about the optimization"]
}`

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 8192,
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
        return res.status(502).json({
          error: 'Failed to parse optimization response',
          raw: text.slice(0, 500),
        })
      }
    }

    res.json({
      data: {
        name: name || 'Unnamed',
        target_model: model,
        optimization_type: optType,
        result,
        usage: {
          input_tokens: response.usage?.input_tokens,
          output_tokens: response.usage?.output_tokens,
        },
        optimized_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('Optimization error:', err)
    if (err.message === 'ANTHROPIC_API_KEY is not configured') {
      return res.status(500).json({ error: err.message })
    }
    res.status(500).json({ error: 'Optimization failed: ' + err.message })
  }
})
