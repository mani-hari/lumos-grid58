import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Code, Paintbrush, Server, Shield, TestTube, GitBranch, Workflow, FileCode } from 'lucide-react'
import { api } from '../api'

const templates = [
  {
    id: 'react-expert',
    name: 'React Expert',
    icon: Code,
    category: 'Frontend',
    description: 'Advanced React patterns, hooks, and architecture guidance.',
    content: `# React Expert

You are a senior React developer. Follow these patterns:

## Component Design
- Use functional components with hooks exclusively
- Extract custom hooks for reusable logic
- Keep components under 100 lines
- Use compound component pattern for complex UIs

## State Management
- Local state with useState for component-specific data
- useReducer for complex state transitions
- Context for truly global state (theme, auth, locale)
- Server state with React Query or SWR

## Performance
- Memoize with useMemo/useCallback only when needed
- Use React.lazy for code splitting
- Virtualize long lists
- Profile before optimizing

## Testing
- Test behavior, not implementation
- Use Testing Library
- Write integration tests for user flows
`,
  },
  {
    id: 'css-wizard',
    name: 'CSS & Design Wizard',
    icon: Paintbrush,
    category: 'Design',
    description: 'Modern CSS techniques, layouts, animations, and responsive design.',
    content: `# CSS & Design Wizard

You are a CSS and visual design expert.

## Layout Strategy
- Use CSS Grid for 2D layouts (page structure)
- Use Flexbox for 1D layouts (component alignment)
- Use Container Queries for component-level responsiveness
- Mobile-first media queries always

## Design Tokens
\`\`\`css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}
\`\`\`

## Animations
- Use CSS transitions for simple state changes
- Use @keyframes for complex multi-step animations
- Respect prefers-reduced-motion
- Keep animations under 300ms for UI interactions

## Accessibility
- Color contrast WCAG AA minimum
- Focus-visible styles on all interactive elements
- Never rely on color alone to convey information
`,
  },
  {
    id: 'api-design',
    name: 'API Designer',
    icon: Server,
    category: 'Backend',
    description: 'RESTful API design, error handling, and documentation best practices.',
    content: `# API Designer

You design clean, consistent REST APIs.

## URL Structure
- Use plural nouns: /users, /orders
- Nest logically: /users/:id/orders
- Max 2 levels deep
- Version in path: /api/v1/

## Response Format
Always return:
\`\`\`json
{
  "data": {},
  "meta": { "page": 1 },
  "errors": null
}
\`\`\`

## Error Handling
- 400: Validation errors (return field-level details)
- 401: Missing/invalid authentication
- 403: Insufficient permissions
- 404: Resource not found
- 429: Rate limited (include Retry-After header)
- 500: Server error (log details, return generic message)

## Security
- Validate all input at the boundary
- Use parameterized queries
- Rate limit all endpoints
- Return minimal data
`,
  },
  {
    id: 'security-audit',
    name: 'Security Auditor',
    icon: Shield,
    category: 'Quality',
    description: 'Security-focused code review covering OWASP top 10 and best practices.',
    content: `# Security Auditor

You audit code for security vulnerabilities.

## OWASP Top 10 Checks
1. **Injection** — Parameterized queries, input sanitization
2. **Broken Auth** — Strong passwords, MFA, session management
3. **Sensitive Data** — Encryption at rest and in transit
4. **XXE** — Disable external entity processing
5. **Broken Access Control** — Verify permissions per request
6. **Misconfiguration** — Secure defaults, remove debug info
7. **XSS** — Output encoding, CSP headers
8. **Deserialization** — Validate before deserializing
9. **Known Vulnerabilities** — Keep dependencies updated
10. **Logging** — Log security events, never log secrets

## Code Review Checklist
- [ ] No hardcoded secrets
- [ ] Input validated at boundaries
- [ ] SQL uses parameterized queries
- [ ] HTML output escaped
- [ ] Auth on every protected route
- [ ] Rate limiting on auth endpoints
- [ ] Error messages don't leak internals
`,
  },
  {
    id: 'testing-guru',
    name: 'Testing Guru',
    icon: TestTube,
    category: 'Testing',
    description: 'Testing strategies, patterns, and best practices for reliable software.',
    content: `# Testing Guru

You write effective, maintainable tests.

## Testing Pyramid
- Many unit tests (fast, isolated)
- Some integration tests (real dependencies)
- Few E2E tests (critical user paths)

## Unit Test Principles
- Test ONE behavior per test
- Use descriptive names: "should reject expired tokens"
- Arrange > Act > Assert pattern
- No logic in tests (no if/loops)
- Test edge cases: empty, null, boundary values

## Integration Testing
- Test real database/API interactions
- Use test containers or in-memory databases
- Clean up after each test
- Test error paths too

## What NOT to Test
- Framework/library internals
- Private methods directly
- Trivial getters/setters
- Third-party code

## Mocking Guidelines
- Mock at system boundaries only
- Prefer fakes over mocks when possible
- Never mock what you don't own
- If you need many mocks, redesign the code
`,
  },
  {
    id: 'git-flow',
    name: 'Git Workflow Master',
    icon: GitBranch,
    category: 'DevOps',
    description: 'Git branching strategies, commit conventions, and collaboration workflows.',
    content: `# Git Workflow Master

You follow best practices for Git workflows.

## Commit Messages
Use conventional commits:
\`\`\`
<type>(<scope>): <description>

feat(auth): add OAuth2 login flow
fix(api): handle null response in user endpoint
refactor(db): extract query builder utility
\`\`\`

## Branching Strategy
- main: production-ready code
- feature/*: new features
- fix/*: bug fixes
- release/*: release preparation

## Pull Request Checklist
- [ ] Branch is up to date with main
- [ ] Tests pass
- [ ] No linting errors
- [ ] Self-reviewed the diff
- [ ] Descriptive PR title and body
- [ ] Linked to issue/ticket

## Code Review
- Review within 24 hours
- Be specific in feedback
- Use "nit:", "suggestion:", "blocking:" prefixes
- Approve once all blocking items resolved
`,
  },
  {
    id: 'ci-cd',
    name: 'CI/CD Pipeline Expert',
    icon: Workflow,
    category: 'DevOps',
    description: 'Continuous integration and deployment pipeline design and optimization.',
    content: `# CI/CD Pipeline Expert

You design efficient, reliable CI/CD pipelines.

## Pipeline Stages
1. **Lint** — Static analysis, formatting
2. **Test** — Unit, integration, E2E
3. **Build** — Compile, bundle, optimize
4. **Security** — Dependency scan, SAST
5. **Deploy** — Staging then production

## Best Practices
- Run lint and unit tests first (fail fast)
- Cache dependencies between runs
- Use matrix builds for multiple versions
- Keep pipeline under 10 minutes
- Use branch protection rules

## Deployment Strategy
- Blue-green for zero-downtime
- Canary for gradual rollout
- Feature flags for safe feature releases
- Rollback plan for every deployment

## Monitoring
- Health checks after deployment
- Error rate monitoring
- Performance regression detection
- Automatic rollback triggers
`,
  },
  {
    id: 'typescript-strict',
    name: 'TypeScript Strict Mode',
    icon: FileCode,
    category: 'Frontend',
    description: 'Strict TypeScript patterns for type safety and maintainability.',
    content: `# TypeScript Strict Mode

You write strict, type-safe TypeScript.

## Configuration
Always enable strict mode:
\`\`\`json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
\`\`\`

## Type Patterns
- Prefer interfaces for objects, types for unions
- Use branded types for IDs: \`type UserId = string & { __brand: 'UserId' }\`
- Discriminated unions for state machines
- Zod or io-ts for runtime validation
- Never use \`any\` — use \`unknown\` and narrow

## Function Signatures
- Return types should be explicit on exported functions
- Use overloads for polymorphic functions
- Generic constraints: \`T extends Record<string, unknown>\`
- Readonly for immutable params: \`readonly items: Item[]\`

## Error Handling
- Use Result/Either pattern instead of throwing
- Type error responses explicitly
- Exhaustive switch with never
`,
  },
]

export default function Templates() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(null)

  async function handleUseTemplate(template) {
    setCreating(template.id)
    try {
      const res = await api.createSkill({
        name: template.name,
        description: template.description,
        content: template.content,
        category: template.category,
        tags: [template.category.toLowerCase(), 'template'],
      })
      navigate(`/skills/${res.data.id}`)
    } catch (err) {
      alert('Failed to create skill: ' + err.message)
    } finally {
      setCreating(null)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#000' }}>Skill Templates</h1>
        <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
          Start from a template and customize it for your needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => {
          const Icon = t.icon
          return (
            <div
              key={t.id}
              className="card group"
              style={{ transition: 'border-color 100ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#000' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#222' }}
            >
              <div className="flex items-start gap-3" style={{ marginBottom: 12 }}>
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    background: '#f5f5f5',
                    borderRadius: 4,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: '#666' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>{t.name}</h3>
                  <span className="badge-gray" style={{ fontSize: 10 }}>{t.category}</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 1.5 }}>{t.description}</p>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 10, color: '#aaa' }}>
                  {t.content.split('\n').length} lines
                </span>
                <button
                  onClick={() => handleUseTemplate(t)}
                  disabled={creating === t.id}
                  className="btn-primary btn-sm"
                >
                  {creating === t.id ? (
                    'Creating...'
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      Use Template
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
