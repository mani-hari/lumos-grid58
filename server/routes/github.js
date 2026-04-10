import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { store } from '../store.js'

export const githubRouter = Router()

const GITHUB_API = 'https://api.github.com'

// Prompt-detection patterns for code files
const PROMPT_VARIABLE_NAMES = [
  'systemPrompt',
  'system_prompt',
  'SYSTEM_PROMPT',
  'instructions',
  'prompt',
  'system_message',
  'systemMessage',
  'SYSTEM_MESSAGE',
]

const PROMPT_PHRASES = [
  'you are',
  "you're a",
  'as an ai',
  'your role',
  'system prompt',
  'instructions:',
  'your task',
  'you will act',
  'you must',
  'you should always',
  'respond as',
  'act as',
  'behave as',
]

const AI_SDK_IMPORTS = [
  '@anthropic-ai/sdk',
  'openai',
  '@ai-sdk',
  'langchain',
  '@langchain',
  'ai/core',
]

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const MD_EXTENSION = '.md'

// ---------------------------------------------------------------------------
// OAuth Flow
// ---------------------------------------------------------------------------

// GET /api/v1/github/auth — Returns GitHub OAuth URL
githubRouter.get('/auth', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    return res.status(500).json({ error: 'GITHUB_CLIENT_ID not configured' })
  }

  const scope = 'repo read:user'
  const redirectUri = req.query.redirect_uri || ''
  const state = uuid()

  let url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`
  if (redirectUri) {
    url += `&redirect_uri=${encodeURIComponent(redirectUri)}`
  }

  res.json({ url, state })
})

// GET /api/v1/github/callback — Exchange code for access token
githubRouter.get('/callback', async (req, res) => {
  const { code, state } = req.query
  if (!code) {
    return res.status(400).json({ error: 'Missing code parameter' })
  }

  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'GitHub OAuth not configured' })
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        state,
      }),
    })

    const tokenData = await tokenRes.json()
    if (tokenData.error) {
      return res.status(400).json({
        error: tokenData.error,
        error_description: tokenData.error_description,
      })
    }

    res.json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
    })
  } catch (err) {
    console.error('GitHub OAuth error:', err)
    res.status(500).json({ error: 'Failed to exchange code for token' })
  }
})

// GET /api/v1/github/repos — List user's repos
githubRouter.get('/repos', async (req, res) => {
  const token = extractToken(req)
  if (!token) {
    return res.status(401).json({ error: 'Authorization token required' })
  }

  try {
    const page = req.query.page || 1
    const perPage = req.query.per_page || 30
    const sort = req.query.sort || 'updated'

    const ghRes = await ghFetch(
      `${GITHUB_API}/user/repos?sort=${sort}&per_page=${perPage}&page=${page}&type=all`,
      token
    )

    if (!ghRes.ok) {
      const err = await ghRes.json().catch(() => ({}))
      return res.status(ghRes.status).json({ error: err.message || 'GitHub API error' })
    }

    const repos = await ghRes.json()
    const simplified = repos.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      name: r.name,
      owner: r.owner.login,
      private: r.private,
      default_branch: r.default_branch,
      description: r.description,
      language: r.language,
      updated_at: r.updated_at,
      html_url: r.html_url,
    }))

    res.json({ data: simplified, meta: { page: Number(page), per_page: Number(perPage) } })
  } catch (err) {
    console.error('GitHub repos error:', err)
    res.status(500).json({ error: 'Failed to fetch repos' })
  }
})

// ---------------------------------------------------------------------------
// Repo Scanning
// ---------------------------------------------------------------------------

// POST /api/v1/github/scan — Scan a GitHub repo for skills/prompts
githubRouter.post('/scan', async (req, res) => {
  const { repo, branch, token } = req.body
  if (!repo || !token) {
    return res.status(400).json({ error: 'repo and token are required' })
  }

  try {
    // 1. Determine the branch to scan
    let targetBranch = branch || 'main'
    try {
      targetBranch = branch || await getDefaultBranch(repo, token)
    } catch (e) {
      console.error('getDefaultBranch failed, using "main":', e.message)
    }

    // 2. Fetch the file tree
    const tree = await fetchTree(repo, targetBranch, token)
    if (!tree) {
      return res.status(404).json({ error: 'Could not fetch repo tree. Check repo name and permissions.' })
    }

    // 3. Classify files
    const mdFiles = []
    const codeFiles = []
    const configFiles = []

    for (const item of tree) {
      if (item.type !== 'blob') continue
      const path = item.path
      const ext = getExtension(path)
      const basename = getBasename(path)

      if (ext === MD_EXTENSION) {
        mdFiles.push(item)
      } else if (CODE_EXTENSIONS.has(ext)) {
        codeFiles.push(item)
      }

      if (
        basename === 'package.json' ||
        basename === 'next.config.js' ||
        basename === 'next.config.mjs' ||
        basename === 'next.config.ts' ||
        basename === 'tailwind.config.js' ||
        basename === 'tailwind.config.ts' ||
        basename === 'tsconfig.json' ||
        basename === 'vite.config.ts' ||
        basename === 'vite.config.js' ||
        basename === '.eslintrc.json' ||
        basename === 'pyproject.toml' ||
        basename === 'Cargo.toml' ||
        basename === 'go.mod'
      ) {
        configFiles.push(item)
      }
    }

    // 4-6: Run all three in parallel to stay within Vercel's timeout
    const [skills, promptsInCode, metadata] = await Promise.all([
      fetchMdFiles(repo, targetBranch, mdFiles, token).catch(() => []),
      scanCodeForPrompts(repo, targetBranch, codeFiles, token).catch(() => []),
      detectMetadata(repo, targetBranch, configFiles, token).catch(() => ({ repo, branch: targetBranch })),
    ])

    // 7. Build condensed tree of relevant files
    const relevantPaths = [
      ...skills.map((s) => s.path),
      ...promptsInCode.map((p) => p.path),
    ]
    const condensedTree = buildCondensedTree(relevantPaths)

    // 8. Store the scan result
    const scan = {
      id: `scan_${uuid().slice(0, 12)}`,
      repo,
      branch: targetBranch,
      skills_count: skills.length,
      prompts_in_code_count: promptsInCode.length,
      created_at: new Date().toISOString(),
    }
    store.createScan(scan)

    res.json({
      data: {
        scan_id: scan.id,
        tree: condensedTree,
        skills,
        prompts_in_code: promptsInCode,
        metadata,
      },
    })
  } catch (err) {
    console.error('Scan error:', err)
    res.status(500).json({ error: 'Scan failed: ' + err.message })
  }
})

// POST /api/v1/github/import — Full pipeline: scan → create project → import skills
githubRouter.post('/import', async (req, res) => {
  const { repo, branch, token } = req.body
  if (!repo || !token) {
    return res.status(400).json({ error: 'repo and token are required' })
  }

  try {
    // 1. Determine the branch to scan
    let targetBranch = branch || 'main'
    try {
      targetBranch = branch || await getDefaultBranch(repo, token)
    } catch (e) {
      console.error('getDefaultBranch failed, using "main":', e.message)
    }

    // 2. Fetch the file tree
    const tree = await fetchTree(repo, targetBranch, token)
    if (!tree) {
      return res.status(404).json({ error: 'Could not fetch repo tree. Check repo name and permissions.' })
    }

    // 3. Classify files
    const mdFiles = []
    const codeFiles = []
    const configFiles = []

    for (const item of tree) {
      if (item.type !== 'blob') continue
      const path = item.path
      const ext = getExtension(path)
      const basename = getBasename(path)

      if (ext === MD_EXTENSION) {
        mdFiles.push(item)
      } else if (CODE_EXTENSIONS.has(ext)) {
        codeFiles.push(item)
      }

      if (
        basename === 'package.json' ||
        basename === 'next.config.js' ||
        basename === 'next.config.mjs' ||
        basename === 'next.config.ts' ||
        basename === 'tailwind.config.js' ||
        basename === 'tailwind.config.ts' ||
        basename === 'tsconfig.json' ||
        basename === 'vite.config.ts' ||
        basename === 'vite.config.js' ||
        basename === '.eslintrc.json' ||
        basename === 'pyproject.toml' ||
        basename === 'Cargo.toml' ||
        basename === 'go.mod'
      ) {
        configFiles.push(item)
      }
    }

    // 4. Run scan tasks in parallel
    const [skills, promptsInCode, metadata] = await Promise.all([
      fetchMdFiles(repo, targetBranch, mdFiles, token).catch(() => []),
      scanCodeForPrompts(repo, targetBranch, codeFiles, token).catch(() => []),
      detectMetadata(repo, targetBranch, configFiles, token).catch(() => ({ repo, branch: targetBranch })),
    ])

    // 5. Build condensed tree
    const relevantPaths = [
      ...skills.map((s) => s.path),
      ...promptsInCode.map((p) => p.path),
    ]
    const condensedTree = buildCondensedTree(relevantPaths)

    // 6. Store the scan result
    const scan = {
      id: `scan_${uuid().slice(0, 12)}`,
      repo,
      branch: targetBranch,
      skills_count: skills.length,
      prompts_in_code_count: promptsInCode.length,
      created_at: new Date().toISOString(),
    }
    store.createScan(scan)

    // 7. Create a project named after the repo
    const repoName = repo.includes('/') ? repo.split('/').pop() : repo
    const project = {
      id: uuid(),
      name: repoName,
      description: `Imported from GitHub repo ${repo}`,
      api_key: `sk_${uuid().replace(/-/g, '')}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    store.createProject(project)

    // 8. Map classifyMdFile types to categories
    const categoryMap = {
      prompt: 'General',
      claude_instructions: 'General',
      cursor_rules: 'General',
      skill: 'General',
      instructions: 'General',
      readme: 'General',
      contributing: 'General',
      changelog: 'General',
      documentation: 'General',
    }

    // 9. Create a skill for each discovered .md file
    const createdSkills = []
    for (const mdSkill of skills) {
      const nameWithoutExt = mdSkill.name.endsWith('.md')
        ? mdSkill.name.slice(0, -3)
        : mdSkill.name
      const skill = {
        id: uuid(),
        name: nameWithoutExt,
        description: '',
        content: mdSkill.content,
        category: categoryMap[mdSkill.type] || 'General',
        tags: [mdSkill.path, mdSkill.type],
        is_public: true,
        version: 1,
        project_id: project.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      store.createSkill(skill)
      createdSkills.push(skill)
    }

    // 10. Return the full result
    res.json({
      data: {
        project,
        skills: createdSkills,
        scan: {
          scan_id: scan.id,
          tree: condensedTree,
          prompts_in_code: promptsInCode,
          metadata,
        },
        summary: {
          skills_imported: createdSkills.length,
          prompts_found: promptsInCode.length,
          repo,
          branch: targetBranch,
        },
      },
    })
  } catch (err) {
    console.error('Import error:', err)
    res.status(500).json({ error: 'Import failed: ' + err.message })
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractToken(req) {
  const auth = req.headers.authorization
  if (!auth) return null
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  if (auth.startsWith('token ')) return auth.slice(6)
  return auth
}

function ghFetch(url, token, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  })
}

function getExtension(path) {
  const dot = path.lastIndexOf('.')
  return dot === -1 ? '' : path.slice(dot)
}

function getBasename(path) {
  const slash = path.lastIndexOf('/')
  return slash === -1 ? path : path.slice(slash + 1)
}

async function getDefaultBranch(repo, token) {
  const res = await ghFetch(`${GITHUB_API}/repos/${repo}`, token)
  if (!res.ok) throw new Error(`Failed to fetch repo info: ${res.status}`)
  const data = await res.json()
  return data.default_branch
}

async function fetchTree(repo, branch, token) {
  try {
    const res = await ghFetch(
      `${GITHUB_API}/repos/${repo}/git/trees/${branch}?recursive=1`,
      token
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.tree || []
  } catch (err) {
    console.error('fetchTree error:', err.message)
    return null
  }
}

async function fetchFileContent(repo, branch, path, token) {
  try {
    // Encode each path segment individually — do NOT encode slashes
    const encodedPath = path.split('/').map(encodeURIComponent).join('/')
    const res = await ghFetch(
      `${GITHUB_API}/repos/${repo}/contents/${encodedPath}?ref=${branch}`,
      token
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

async function fetchMdFiles(repo, branch, mdItems, token) {
  const items = mdItems.slice(0, 20)
  const results = []

  const contents = await Promise.all(
    items.map((item) => fetchFileContent(repo, branch, item.path, token).catch(() => null))
  )
  items.forEach((item, idx) => {
    const content = contents[idx]
    if (content !== null) {
      results.push({
        path: item.path,
        name: getBasename(item.path),
        size: item.size || content.length,
        content,
        type: classifyMdFile(item.path, content),
      })
    }
  })

  return results
}

function classifyMdFile(path, content) {
  const lower = path.toLowerCase()
  const basename = getBasename(lower)

  if (basename === 'claude.md' || basename === '.claude.md') return 'claude_instructions'
  if (basename === 'cursorrules' || basename === '.cursorrules') return 'cursor_rules'
  if (basename.includes('prompt')) return 'prompt'
  if (basename.includes('skill')) return 'skill'
  if (basename.includes('instruction')) return 'instructions'
  if (basename === 'readme.md') return 'readme'
  if (basename === 'contributing.md') return 'contributing'
  if (basename === 'changelog.md') return 'changelog'

  // Content-based classification
  const lowerContent = (content || '').toLowerCase()
  if (
    lowerContent.includes('you are') ||
    lowerContent.includes('system prompt') ||
    lowerContent.includes('your role') ||
    lowerContent.includes('as an ai')
  ) {
    return 'prompt'
  }

  return 'documentation'
}

async function scanCodeForPrompts(repo, branch, codeItems, token) {
  // Prioritize files likely to contain prompts — filter by path heuristics
  const prioritized = codeItems.filter((item) => {
    const p = item.path.toLowerCase()
    // Skip test files, type definitions, config, and generated code
    if (p.includes('__test') || p.includes('.test.') || p.includes('.spec.')) return false
    if (p.includes('.d.ts') || p.includes('types/') || p.includes('typings/')) return false
    if (p.includes('node_modules/') || p.includes('dist/') || p.includes('.next/')) return false
    // Prioritize files likely to have prompts
    if (p.includes('prompt') || p.includes('agent') || p.includes('ai') || p.includes('llm')) return true
    if (p.includes('system') || p.includes('instruction') || p.includes('chat')) return true
    if (p.includes('lib/') || p.includes('src/') || p.includes('utils/') || p.includes('server/')) return true
    return true
  })

  // Cap to stay within Vercel's 10s timeout — fetch all at once
  const items = prioritized.slice(0, 30)
  const results = []

  const contents = await Promise.all(
    items.map((item) => fetchFileContent(repo, branch, item.path, token).catch(() => null))
  )
  items.forEach((item, idx) => {
    const content = contents[idx]
    if (!content) return

    const prompts = extractPromptsFromCode(content, item.path)
    if (prompts.length > 0) {
      results.push({
        path: item.path,
        name: getBasename(item.path),
        size: item.size || content.length,
        prompts,
        has_ai_sdk_import: detectAiSdkImport(content),
      })
    }
  })

  return results
}

function detectAiSdkImport(content) {
  for (const sdk of AI_SDK_IMPORTS) {
    if (content.includes(sdk)) return true
  }
  return false
}

function extractPromptsFromCode(content, filePath) {
  const lines = content.split('\n')
  const prompts = []

  // Check if file imports an AI SDK — if so, lower the detection threshold
  const hasAiImport = detectAiSdkImport(content)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineLower = line.toLowerCase().trim()

    // Skip comments and empty lines
    if (!lineLower || lineLower.startsWith('//') && lineLower.length < 5) continue

    // Check for prompt variable assignments
    for (const varName of PROMPT_VARIABLE_NAMES) {
      if (line.includes(varName) && (line.includes('=') || line.includes(':'))) {
        const extracted = extractMultiLineString(lines, i)
        if (extracted) {
          prompts.push({
            line: i + 1,
            variable: varName,
            type: 'variable_assignment',
            text: extracted.text,
            end_line: extracted.endLine + 1,
          })
        }
        break
      }
    }

    // Check for prompt phrases in string literals
    if (isInsideString(line)) {
      for (const phrase of PROMPT_PHRASES) {
        if (lineLower.includes(phrase)) {
          const extracted = extractMultiLineString(lines, i)
          if (extracted) {
            prompts.push({
              line: i + 1,
              type: 'prompt_phrase',
              phrase,
              text: extracted.text,
              end_line: extracted.endLine + 1,
            })
          }
          break
        }
      }
    }

    // If file imports an AI SDK, also check for content/role patterns
    if (hasAiImport) {
      if (
        (lineLower.includes('role') && lineLower.includes('system')) ||
        (lineLower.includes('content:') && i > 0 && lines[i - 1].toLowerCase().includes('system'))
      ) {
        const extracted = extractMultiLineString(lines, i)
        if (extracted && extracted.text.length > 20) {
          prompts.push({
            line: i + 1,
            type: 'ai_sdk_system_message',
            text: extracted.text,
            end_line: extracted.endLine + 1,
          })
        }
      }
    }
  }

  // De-duplicate by line number
  const seen = new Set()
  return prompts.filter((p) => {
    if (seen.has(p.line)) return false
    seen.add(p.line)
    return true
  })
}

function isInsideString(line) {
  const trimmed = line.trim()
  return (
    trimmed.includes("'") ||
    trimmed.includes('"') ||
    trimmed.includes('`') ||
    trimmed.includes('${')
  )
}

function extractMultiLineString(lines, startIdx) {
  const line = lines[startIdx]

  // Find the string content — look for template literals, single/double quotes
  let text = ''
  let endLine = startIdx

  // Check for template literal (backtick)
  const btIdx = line.indexOf('`')
  if (btIdx !== -1) {
    let buf = line.slice(btIdx + 1)
    let i = startIdx
    while (i < lines.length) {
      const closeIdx = buf.indexOf('`')
      if (closeIdx !== -1) {
        text += buf.slice(0, closeIdx)
        endLine = i
        break
      }
      text += buf + '\n'
      i++
      if (i < lines.length) buf = lines[i]
    }
    if (text.trim()) return { text: text.trim().slice(0, 2000), endLine }
  }

  // Check for regular string (single/double quote)
  const match = line.match(/[=:]\s*(['"])([\s\S]*?)$/)
  if (match) {
    const quote = match[1]
    let buf = match[2]
    let i = startIdx
    const closeIdx = buf.indexOf(quote)
    if (closeIdx !== -1) {
      text = buf.slice(0, closeIdx)
      endLine = i
    } else {
      // Multi-line string concatenation
      text = buf
      i++
      while (i < lines.length && i < startIdx + 30) {
        const l = lines[i].trim()
        if (l.startsWith('+') || l.startsWith(quote)) {
          text += '\n' + l.replace(/^[+'"\s]+|[+'"\s]+$/g, '')
        } else {
          break
        }
        endLine = i
        i++
      }
    }
    if (text.trim()) return { text: text.trim().slice(0, 2000), endLine }
  }

  // Fallback — just return the line content
  const fallback = line.replace(/^[^'"`]*['"`]/, '').replace(/['"`][^'"`]*$/, '').trim()
  if (fallback.length > 10) {
    return { text: fallback.slice(0, 2000), endLine: startIdx }
  }

  return null
}

async function detectMetadata(repo, branch, configItems, token) {
  const metadata = {
    repo,
    branch,
    tech_stack: [],
    frameworks: [],
    languages: [],
    has_ai_dependencies: false,
    ai_dependencies: [],
    dependencies: {},
  }

  // Fetch config files in parallel — just grab package.json and a few key ones
  const cfgItems = configItems.slice(0, 5)
  const cfgContents = await Promise.all(
    cfgItems.map((item) => fetchFileContent(repo, branch, item.path, token).catch(() => null))
  )

  for (let ci = 0; ci < cfgItems.length; ci++) {
    const item = cfgItems[ci]
    const content = cfgContents[ci]
    if (!content) continue
    const basename = getBasename(item.path)

    if (basename === 'package.json') {
      try {
        const pkg = JSON.parse(content)
        const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
        metadata.dependencies = allDeps

        // Detect frameworks
        if (allDeps.next) metadata.frameworks.push('Next.js')
        if (allDeps.react) metadata.frameworks.push('React')
        if (allDeps.vue) metadata.frameworks.push('Vue')
        if (allDeps.svelte || allDeps['@sveltejs/kit']) metadata.frameworks.push('Svelte')
        if (allDeps.express) metadata.frameworks.push('Express')
        if (allDeps.fastify) metadata.frameworks.push('Fastify')
        if (allDeps.nuxt) metadata.frameworks.push('Nuxt')
        if (allDeps.angular || allDeps['@angular/core']) metadata.frameworks.push('Angular')
        if (allDeps.vite) metadata.tech_stack.push('Vite')
        if (allDeps.webpack) metadata.tech_stack.push('Webpack')
        if (allDeps.tailwindcss) metadata.tech_stack.push('Tailwind CSS')
        if (allDeps.typescript) metadata.languages.push('TypeScript')

        // Detect AI dependencies
        for (const dep of Object.keys(allDeps)) {
          for (const sdk of AI_SDK_IMPORTS) {
            if (dep === sdk || dep.startsWith(sdk)) {
              metadata.has_ai_dependencies = true
              metadata.ai_dependencies.push(dep)
            }
          }
        }

        metadata.languages.push('JavaScript')
      } catch {
        // ignore parse errors
      }
    }

    if (basename.startsWith('next.config')) metadata.frameworks.push('Next.js')
    if (basename.startsWith('tailwind.config')) metadata.tech_stack.push('Tailwind CSS')
    if (basename === 'tsconfig.json') metadata.languages.push('TypeScript')
    if (basename === 'vite.config.ts' || basename === 'vite.config.js') metadata.tech_stack.push('Vite')
    if (basename === 'pyproject.toml') metadata.languages.push('Python')
    if (basename === 'Cargo.toml') metadata.languages.push('Rust')
    if (basename === 'go.mod') metadata.languages.push('Go')
  }

  // De-duplicate arrays
  metadata.tech_stack = [...new Set(metadata.tech_stack)]
  metadata.frameworks = [...new Set(metadata.frameworks)]
  metadata.languages = [...new Set(metadata.languages)]
  metadata.ai_dependencies = [...new Set(metadata.ai_dependencies)]

  return metadata
}

function buildCondensedTree(paths) {
  const tree = {}
  for (const p of paths) {
    const parts = p.split('/')
    let node = tree
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (i === parts.length - 1) {
        // Leaf file
        node[part] = null
      } else {
        if (!node[part] || typeof node[part] !== 'object') {
          node[part] = {}
        }
        node = node[part]
      }
    }
  }
  return tree
}
