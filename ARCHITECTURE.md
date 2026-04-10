# doso.dev — Architecture & Feature Documentation

> Internal reference. Not shipped to users.

## Vision

**Core thesis: separation of code and prompts.** AI prompts/skills should be centrally hosted, versioned, and optimized — not embedded in application codebases. doso.dev is a hosted platform that lets teams create, manage, analyze, and serve AI agent skills with full observability.

Target: Vercel AI Accelerator demo. Domain: `doso.dev` (app at `app.doso.dev`).

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite 6, Tailwind CSS 3 |
| Backend | Express 4 (ES modules) |
| Persistence | In-memory store + Upstash Redis (fire-and-forget) |
| AI | Anthropic SDK (`claude-sonnet-4-20250514`) |
| Deploy | Vercel (static CDN + serverless function) |
| CLI | Zero-dependency Node.js package (`@doso-dev/cli`) |

---

## Project Structure

```
├── api/index.js              # Vercel serverless entry (re-exports Express app)
├── vercel.json                # Rewrites: /api/* → serverless, /* → SPA
├── server/
│   ├── index.js               # Express app, middleware, route mounting
│   ├── store.js               # In-memory store with Redis + local JSON persistence
│   ├── seeds.js               # 5 seed skills for cold starts
│   └── routes/
│       ├── skills.js          # CRUD, fork, export/import, versions, raw content
│       ├── projects.js        # Projects CRUD, API keys, webhooks
│       ├── analytics.js       # Global/skill stats, access logs with pagination
│       ├── optimizer.js       # Rule-based model-specific optimization
│       ├── github.js          # OAuth flow + repo scanning
│       └── analyze.js         # Claude-powered skill analysis
├── src/
│   ├── main.jsx               # React entry with BrowserRouter
│   ├── App.jsx                # Route definitions
│   ├── api.js                 # Frontend API client (all endpoints)
│   ├── index.css              # Monochrome design system
│   ├── components/
│   │   ├── Layout.jsx         # Flex layout: sidebar + outlet
│   │   ├── Sidebar.jsx        # Collapsible icon-to-label nav (48px ↔ 200px)
│   │   ├── SkillCard.jsx      # Grid + compact list views
│   │   ├── EndpointPanel.jsx  # REST/Raw/MCP endpoints with copy buttons
│   │   ├── MarkdownPreview.jsx # Renders markdown via `marked`
│   │   └── UsageChart.jsx     # Recharts: area, pie, horizontal bar
│   └── pages/
│       ├── Dashboard.jsx      # Skills grid or onboarding (when empty)
│       ├── SkillEditor.jsx    # Split-pane editor with analysis integration
│       ├── RepoConnect.jsx    # GitHub scan flow: input → scanning → results
│       ├── Projects.jsx       # Project management, API keys, webhooks
│       ├── Analytics.jsx      # Charts + access log table
│       ├── Templates.jsx      # 8 skill templates library
│       └── Settings.jsx       # API docs, agent integration guides
└── cli/
    ├── package.json           # @doso-dev/cli, zero deps
    ├── bin/doso.js            # Entry point, arg parser, 9 commands
    └── lib/
        ├── scanner.js         # Walks dirs, finds .md + embedded prompts
        ├── display.js         # ANSI colors, box, tree, table, spinner, diff
        ├── api.js             # Native https client, ~/.doso/config.json auth
        └── server.js          # Local HTTP skill server for `doso serve`
```

---

## Key Implementation Details

### Persistence Pattern

The `Store` class (`server/store.js`) keeps all data in memory. Reads are synchronous. Writes call `_save()` which:
1. Writes to `data/db.json` locally (skipped on Vercel via `IS_SERVERLESS` flag)
2. Fire-and-forget `redis.set()` to Upstash — does not block the response

On cold start, `ensureLoaded()` middleware loads from Redis once, then sets `_loaded = true`. All subsequent requests skip the async load.

Redis key: `doso_db`. Single JSON blob for the entire store.

### Vercel Deployment

- `api/index.js` re-exports the Express app as a default export → Vercel treats it as a serverless function
- `vercel.json` rewrites `/api/*` to the function; all other routes serve `index.html` (SPA fallback)
- Static frontend served by Vercel CDN from `dist/`
- Redis credentials via `KV_REST_API_URL` / `KV_REST_API_TOKEN` (Vercel KV) or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`

### GitHub Repo Scanning (`server/routes/github.js`)

1. OAuth flow: `/auth` returns GitHub OAuth URL → `/callback` exchanges code for access token
2. `/scan` endpoint accepts `{ repo, branch, token }`:
   - Fetches full repo tree via `GET /git/trees/{branch}?recursive=1`
   - Classifies files: `.md` → skill files, `.ts/.tsx/.js/.jsx` → code to scan
   - Fetches .md contents in parallel batches of 10 (capped at 50 files)
   - Scans code files for prompts (capped at 200 files) using three detection strategies:
     - **Variable names**: `systemPrompt`, `SYSTEM_PROMPT`, `instructions`, etc.
     - **Phrase detection**: "you are", "as an ai", "your role", etc. inside string literals
     - **AI SDK imports**: `@anthropic-ai/sdk`, `openai`, `langchain`, `@ai-sdk`
   - Detects tech stack from `package.json`, config files (Next.js, Vite, Tailwind, etc.)
   - Classifies .md files by filename and content (claude_instructions, cursor_rules, prompt, readme, etc.)
   - Returns condensed tree of relevant paths only

### Claude Analysis Engine (`server/routes/analyze.js`)

Three endpoints, all using `claude-sonnet-4-20250514` with structured JSON responses:

- **`POST /analyze/skill`**: Returns contradictions (with severity), token/cost estimates, optimization suggestions (with token savings), quality score (0-100 across 5 dimensions), and model-specificity analysis (portability score)
- **`POST /analyze/project`**: Multi-skill analysis — cross-skill contradictions, redundancies, coverage gaps, health score, prioritized recommendations
- **`POST /analyze/optimize`**: Three modes — `token_reduction`, `clarity`, `model_specific`. Returns optimized content + diff summary with token change metrics

All responses parsed as JSON with fallback regex extraction (`/\{[\s\S]*\}/`) if the model wraps in markdown fences.

### Design System

Monochrome palette: `#000` (primary), `#fff` (background), `#D4A843` (ochre accent), grays for hierarchy. Fonts: Inter for UI, JetBrains Mono for code/endpoints. No color-coded badges — severity conveyed through borders and weight.

Key CSS classes: `.btn-primary` (black), `.btn-secondary` (outlined), `.btn-ghost` (underline hover), `.badge-ochre`, `.badge-gray`, `.card` (white, 1px #222 border), `.endpoint-box`, `.terminal-box` (black bg), `.health-bar`, `.sidebar-nav-item`.

### Sidebar

Hover-expand pattern: 48px collapsed (icon only) → 200px expanded (icon + label). Uses `onMouseEnter`/`onMouseLeave` with CSS `transition-all duration-150`. Logo shows "d" collapsed, "doso" expanded.

### Onboarding Flow

Dashboard shows `OnboardingView` when `skills.length === 0` (after loading). Contains:
- Repo URL input with dashed border
- "Connect with GitHub" button → navigates to `/connect` with URL in `location.state`
- Terminal box with `npx @doso-dev/cli scan ./` and copy button

### CLI (`cli/`)

Zero dependencies. Uses only `node:fs`, `node:path`, `node:https`, `node:http`, `node:os`.

- **Auth**: Token from `DOSO_TOKEN` env var or `~/.doso/config.json`
- **API base**: `DOSO_API_URL` env var, defaults to `https://app.doso.dev`
- **`doso scan`**: Walks filesystem, skips `node_modules`/.git/build dirs, extracts titles from YAML frontmatter or first `# heading`, estimates tokens at ~4 chars/token
- **`doso serve`**: Bare `http.createServer`, discovers .md files, serves as JSON or raw text, CORS enabled, prints endpoint table on start
- **Display**: Raw ANSI escape codes (`\x1b[`), no chalk/ora. Tree rendering with `├──`/`└──` box-drawing characters. Spinner at 80ms interval on stderr.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | For analysis | Claude API key |
| `GITHUB_CLIENT_ID` | For OAuth | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | For OAuth | GitHub OAuth app client secret |
| `KV_REST_API_URL` | For Vercel | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | For Vercel | Upstash Redis REST token |

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1` | API info |
| GET/POST/PUT/DELETE | `/api/v1/skills` | Skills CRUD |
| GET | `/api/v1/skills/:id/raw` | Raw markdown content |
| POST | `/api/v1/skills/:id/fork` | Fork a skill |
| POST | `/api/v1/skills/import` | Import skill JSON |
| GET | `/api/v1/skills/:id/versions` | Version history |
| GET/POST/PUT/DELETE | `/api/v1/projects` | Projects CRUD |
| POST | `/api/v1/projects/:id/keys` | API key management |
| POST | `/api/v1/projects/:id/webhooks` | Webhook management |
| GET | `/api/v1/analytics` | Global stats |
| GET | `/api/v1/analytics/skills/:id` | Per-skill stats |
| GET | `/api/v1/optimizer/skills/:id` | Rule-based optimization |
| GET | `/api/v1/github/auth` | GitHub OAuth URL |
| GET | `/api/v1/github/callback` | OAuth token exchange |
| GET | `/api/v1/github/repos` | List user repos |
| POST | `/api/v1/github/scan` | Scan repo for skills |
| POST | `/api/v1/analyze/skill` | Claude skill analysis |
| POST | `/api/v1/analyze/project` | Claude project analysis |
| POST | `/api/v1/analyze/optimize` | Claude skill optimization |
| GET | `/api/v1/mcp/skills/:id` | MCP resource format |

---

## What's Built (changelog)

1. **Express backend** with skills CRUD, versioning, projects, API keys, webhooks, access logging, health scores
2. **React frontend** with split-pane skill editor, markdown preview, endpoint panel, analytics charts
3. **Vercel deployment** — serverless function + static CDN, Upstash Redis persistence
4. **Rebrand to doso** — monochrome design system, editor-first UI, collapsible sidebar
5. **GitHub integration** — OAuth flow, repo scanning with prompt detection in code, tech stack analysis
6. **Claude analysis engine** — contradiction detection, token estimation, quality scoring, optimization with three modes
7. **Onboarding flow** — empty-state page with GitHub connect + CLI command
8. **RepoConnect page** — scan results with summary cards, tech stack badges, embedded prompt warnings, file tree
9. **CLI tool** (`@doso-dev/cli`) — 9 commands, zero dependencies, beautiful terminal output

## Not Yet Built

- PR creation flow from scan results (extract prompt → create skill → open PR replacing inline prompt with API call)
- Auto MCP endpoint generation from scanned skills
- Real-time collaboration / multi-user
- Billing / usage limits
- npm publish of CLI package
