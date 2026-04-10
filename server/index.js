import express from 'express'
import cors from 'cors'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { store } from './store.js'
import { seedSkills, seedProjects } from './seeds.js'
import { skillsRouter } from './routes/skills.js'
import { projectsRouter } from './routes/projects.js'
import { analyticsRouter } from './routes/analytics.js'
import { optimizerRouter } from './routes/optimizer.js'
import { githubRouter } from './routes/github.js'
import { analyzeRouter } from './routes/analyze.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 5001

// Middleware
app.use(cors())
app.use(express.json({ limit: '5mb' }))

// Request logging
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`)
    }
  })
  next()
})

// Load data from Redis on cold start, then seed if empty
app.use(async (req, res, next) => {
  try {
    await store.ensureLoaded()
    if (store.getSkills().length === 0) {
      console.log('Seeding initial skills...')
      seedSkills.forEach((skill) => store.createSkill(skill))
      seedProjects.forEach((project) => store.createProject(project))
      console.log(`Seeded ${seedSkills.length} skills and ${seedProjects.length} projects`)
    }
    next()
  } catch (err) {
    console.error('Data load error:', err)
    next()
  }
})

// API Routes
app.use('/api/v1/skills', skillsRouter)
app.use('/api/v1/projects', projectsRouter)
app.use('/api/v1/analytics', analyticsRouter)
app.use('/api/v1/optimizer', optimizerRouter)
app.use('/api/v1/github', githubRouter)
app.use('/api/v1/analyze', analyzeRouter)

// MCP-compatible skill resource endpoint
app.get('/api/v1/mcp/skills/:id', (req, res) => {
  const skill = store.getSkill(req.params.id)
  if (!skill) return res.status(404).json({ error: 'Skill not found' })

  // Log access
  store.logAccess({
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    skill_id: skill.id,
    project_id: skill.project_id,
    agent_name: req.headers['x-agent-name'] || req.headers['user-agent'] || 'unknown',
    model_used: req.headers['x-model'] || req.query.model || null,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    endpoint_type: 'mcp',
    created_at: new Date().toISOString(),
  })

  // MCP Resource format
  res.json({
    uri: `skill://${skill.id}`,
    name: skill.name,
    description: skill.description,
    mimeType: 'text/markdown',
    text: skill.content,
    metadata: {
      category: skill.category,
      tags: skill.tags,
      version: skill.version,
      updated_at: skill.updated_at,
    },
  })
})

// API info endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'doso — Hosted Skills Platform',
    version: '0.1.0',
    endpoints: {
      skills: '/api/v1/skills',
      projects: '/api/v1/projects',
      analytics: '/api/v1/analytics',
      optimizer: '/api/v1/optimizer',
      github: '/api/v1/github',
      analyze: '/api/v1/analyze',
      mcp: '/api/v1/mcp/skills/:id',
    },
  })
})

// Serve static frontend (local only — Vercel serves static files via CDN)
if (!process.env.VERCEL) {
  const distPath = join(__dirname, '..', 'dist')
  if (existsSync(distPath)) {
    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(join(distPath, 'index.html'))
      }
    })
  } else {
    app.get('/', (req, res) => {
      res.json({
        message: 'doso API is running. Build the frontend with: npm run build',
        api: '/api/v1',
      })
    })
  }
}

// Export for Vercel serverless
export default app

// Only listen when running locally (not on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n  ⚡ doso — Hosted Skills Platform`)
    console.log(`  → http://localhost:${PORT}`)
    console.log(`  → API: http://localhost:${PORT}/api/v1`)
    console.log(`  → ${store.getSkills().length} skills loaded\n`)
  })
}
