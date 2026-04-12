import { Router } from 'express'
import { store } from '../store.js'

export const webhookRouter = Router()

const GITHUB_API = 'https://api.github.com'

// ---------------------------------------------------------------------------
// POST /webhook/github — Handle GitHub push webhook events
// ---------------------------------------------------------------------------
webhookRouter.post('/github', async (req, res) => {
  try {
    const event = req.headers['x-github-event']
    if (event !== 'push') {
      return res.json({ ignored: true, reason: `Event type '${event}' is not handled` })
    }

    const payload = req.body
    const repoFullName = payload.repository?.full_name
    if (!repoFullName) {
      return res.status(400).json({ error: 'Missing repository.full_name in payload' })
    }

    // Find projects whose description includes the repo name
    const projects = store.getProjects().filter(
      (p) => (p.description || '').includes(repoFullName)
    )

    if (projects.length === 0) {
      return res.json({ updated: 0, files: [], reason: 'No matching projects found' })
    }

    // Collect all modified/added .md files across commits
    const mdFiles = new Set()
    for (const commit of payload.commits || []) {
      for (const file of [...(commit.added || []), ...(commit.modified || [])]) {
        if (file.endsWith('.md')) {
          mdFiles.add(file)
        }
      }
    }

    const updatedFiles = []
    let updatedCount = 0
    const ref = payload.ref || 'refs/heads/main'
    const branch = ref.replace('refs/heads/', '')

    for (const filePath of mdFiles) {
      for (const project of projects) {
        const skills = store.getSkillsByProject(project.id)

        // Find matching skills by checking if skill.tags[0] matches the file path
        const matchingSkills = skills.filter(
          (s) => s.tags && s.tags.length > 0 && s.tags[0] === filePath
        )

        if (matchingSkills.length === 0) continue

        // Fetch updated file content from GitHub (unauthenticated for public repos)
        const content = await fetchFileContent(repoFullName, branch, filePath)
        if (!content) continue

        for (const skill of matchingSkills) {
          store.updateSkill(skill.id, {
            content,
            change_summary: `Auto-updated from GitHub push to ${repoFullName}`,
          })
          updatedCount++
        }

        updatedFiles.push(filePath)
      }
    }

    res.json({ updated: updatedCount, files: updatedFiles })
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(500).json({ error: 'Webhook processing failed: ' + err.message })
  }
})

// ---------------------------------------------------------------------------
// GET /webhook/status/:projectId — Return webhook status for a project
// ---------------------------------------------------------------------------
webhookRouter.get('/status/:projectId', (req, res) => {
  const project = store.getProject(req.params.projectId)
  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }

  const webhooks = store.getWebhooks(req.params.projectId)

  res.json({
    data: {
      project_id: project.id,
      configured: !!project.webhookUrl || !!project.webhook_repo,
      webhook_url: project.webhookUrl || null,
      webhook_repo: project.webhook_repo || null,
      webhook_enabled: project.webhook_enabled || false,
      recent_events: webhooks.slice(0, 10),
    },
  })
})

// ---------------------------------------------------------------------------
// POST /webhook/configure/:projectId — Configure webhook for a project
// ---------------------------------------------------------------------------
webhookRouter.post('/configure/:projectId', (req, res) => {
  const project = store.getProject(req.params.projectId)
  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }

  const { repo, events } = req.body
  if (!repo) {
    return res.status(400).json({ error: 'repo is required' })
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`
  const webhookUrl = `${baseUrl}/api/v1/webhook/github`

  const updated = store.updateProject(req.params.projectId, {
    webhook_repo: repo,
    webhook_enabled: true,
    webhook_events: events || ['push'],
    webhookUrl,
  })

  res.json({
    data: {
      project_id: updated.id,
      webhook_repo: updated.webhook_repo,
      webhook_enabled: updated.webhook_enabled,
      webhook_url: webhookUrl,
      events: updated.webhook_events,
      instructions: `Add this URL as a webhook in your GitHub repo settings: ${webhookUrl}`,
    },
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchFileContent(repo, branch, path) {
  try {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/')
    const res = await fetch(
      `${GITHUB_API}/repos/${repo}/contents/${encodedPath}?ref=${branch}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.encoding === 'base64' && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8')
    }
    return data.content || null
  } catch {
    return null
  }
}
