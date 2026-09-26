<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

<!-- BEGIN:repopilot-project-context -->

# RepoPilot 2.0 — Project Context

> "Understand the codebase. Find where to work. Make the change. Verify the result."

RepoPilot 2.0 is a codebase intelligence and developer navigation platform. It connects to GitHub repositories, generates structural X-Ray snapshots, provides evidence-backed Q&A, and orchestrates task planning with IBM watsonx / IBM Bob 2.0.

## Core User Workflow

```
Connect repository
  → Build mental model (X-Ray analysis)
  → Identify likely work areas
  → Ask codebase questions (grounded Q&A)
  → Create a task / implementation plan (IBM Bob)
  → Make changes
  → Verify the result
```

---

## Architecture

### Framework & Language

- **Next.js 16.3.6** — App Router, Turbopack, React Server Components
- **TypeScript 5** — strict mode enforced throughout
- **React 19** — client and server components
- Before modifying any Next.js API, read `node_modules/next/dist/docs/` for the exact current conventions; this version has breaking changes from prior releases.

### Directory Structure

```
repopilot/
├── src/
│   ├── app/
│   │   ├── (app)/                  # Protected authenticated routes (requires session)
│   │   │   ├── layout.tsx          # Server-side auth check + AppShell
│   │   │   ├── dashboard/          # Dashboard: repos + tasks summary
│   │   │   ├── repositories/       # Repo list, connect, X-Ray, Q&A
│   │   │   │   └── [id]/ask/       # Evidence-backed codebase Q&A
│   │   │   ├── tasks/              # Task list, create, detail + plan
│   │   │   ├── explore/            # Explore (stub)
│   │   │   └── ask/                # Cross-repo Q&A selector
│   │   ├── api/
│   │   │   ├── auth/               # login, signup, logout, me, github OAuth
│   │   │   ├── repositories/       # connect, list, analyze, ask
│   │   │   ├── tasks/              # create, list, plan
│   │   │   ├── bob/                # IBM watsonx / Bob gateway
│   │   │   └── health/             # health check
│   │   ├── login/                  # Sign-in page
│   │   ├── register/               # Sign-up page
│   │   ├── globals.css             # Design tokens, shared component styles
│   │   └── page.tsx                # Public landing page
│   ├── components/layout/
│   │   └── AppShell.tsx            # Collapsible sidebar, topbar, IBM Bob widget
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── github.ts           # OAuth helpers (state, scopes, callback URL)
│   │   │   ├── password.ts         # PBKDF2 hash + verify (100,000 iterations, SHA-512)
│   │   │   └── session.ts          # HMAC-SHA256 JWT create + verify
│   │   ├── db/
│   │   │   └── localDb.ts          # JSON-file dev store + in-memory cache
│   │   ├── github/
│   │   │   └── client.ts           # Token lookup, profile fetch, repo access check
│   │   ├── supabase/
│   │   │   ├── server.ts           # Dual-mode client (Supabase or local adapter)
│   │   │   ├── client.ts           # Browser Supabase client
│   │   │   └── database.types.ts   # Generated Supabase type definitions
│   │   └── utils.ts                # Formatting, classification, styling helpers
│   ├── proxy.ts                    # Next.js middleware — route protection + auth redirects
│   └── types/
│       └── index.ts                # Core domain interfaces
├── supabase/
│   └── schema.sql                  # PostgreSQL schema, RLS policies, pgvector function
├── bob_sessions/                   # Bob IDE session screenshots (PNG files go here)
└── .data/
    └── repopilot-dev.json          # Local dev persistent store (gitignored)
```

### Data Layer

- **Supabase PostgreSQL** (production): `repositories`, `repository_snapshots`, `repository_files`, `tasks`, `task_plans`, `conversations`, `conversation_messages`, `verification_runs`
- **Row Level Security** enforced on all tables — users can only read and write their own data
- **pgvector** extension present — `vector(768)` column on `repository_files`, `search_repository_files` RPC function defined in schema
- **Local JSON adapter** (development): `src/lib/db/localDb.ts` — activated automatically when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent or set to placeholder values. The Supabase `createClient()` in `server.ts` transparently returns either a real Supabase client or the local adapter.

### Authentication

- **Dual-mode**: Supabase Auth when real credentials configured; local PBKDF2 + HMAC-SHA256 JWT when not
- **GitHub OAuth 2.0**: fully implemented — `GET /api/auth/github/start` (redirect) → `GET /api/auth/github/callback` (code exchange, profile fetch, upsert user, issue session)
- **Session cookie**: `repopilot_session` — httpOnly, SameSite=Lax, 7-day expiry
- **Middleware guard**: `src/proxy.ts` protects `/dashboard`, `/repositories`, `/tasks`, `/ask`, `/onboarding`, `/verification`, `/settings`, `/activity`
- OAuth scopes requested: `read:user user:email repo`

### GitHub Integration

- User's OAuth access token is stored on the user record after GitHub login
- `src/lib/github/client.ts` retrieves the token and makes authenticated GitHub REST API calls
- APIs used: `GET /user`, `GET /user/emails`, `GET /repos/{owner}/{repo}`, `GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1`, `GET /repos/{owner}/{repo}/contents/{path}`
- Do not re-implement or bypass this integration — extend `client.ts` if new GitHub API calls are needed

### AI / LLM Integration

- **IBM watsonx.ai** (`/api/bob`): calls `{IBM_BOB_API_URL}/ml/v1/text/chat?version=2024-05-31`, model `ibm/granite-13b-chat-v2`. Operates in modes: `ask`, `plan`, `code`, `review`, `orchestrator`.
- **Google Gemini 1.5 Flash** (`/api/repositories/[id]/ask`, `/api/bob`): REST endpoint, used for repository Q&A and as Bob fallback when IBM credentials absent.
- **Heuristic fallback**: keyword-matching on file paths — requires no API keys, always available.
- Graceful degradation: IBM → Gemini → heuristic. Never fabricate a "connected" status that does not reflect actual credential state.

### UI / Styling

- **Tailwind CSS 4** with `@tailwindcss/postcss`
- **Radix UI** primitives: Avatar, Dialog, DropdownMenu, Progress, Select, Separator, Switch, Tabs, Tooltip
- **Lucide React** icons
- Design tokens defined as CSS custom properties in `globals.css` — use these (`--color-*`, `--color-text-*`, `--color-bg-*`, `--color-border-*`, `--color-accent-*`) rather than hard-coded colours
- Shared component classes: `card`, `btn`, `btn-primary`, `btn-secondary`, `btn-ghost`, `badge`, `badge-success`, `badge-warning`, `badge-danger`, `nav-item`, `skeleton`
- Framer Motion: landing page only

### Validation

- Use **Zod** schemas for all request body validation in API routes (pattern already established throughout the codebase)

---

## Environment Variables

Names only — values must never appear in any file, log, or output.

| Variable | Purpose | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server admin) | Optional |
| `AUTH_SECRET` | Signing secret for session JWTs | Optional (has dev default) |
| `AUTH_MODE` | `local` or `supabase` | Optional |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID | For GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret | For GitHub OAuth |
| `GITHUB_CALLBACK_URL` | OAuth redirect URI override | Optional |
| `NEXT_PUBLIC_APP_URL` | Base URL for the app | Optional (defaults to localhost:3000) |
| `NEXT_PUBLIC_APP_NAME` | Display name | Optional |
| `GEMINI_API_KEY` | Google Gemini API key | Optional (enables AI Q&A) |
| `IBM_BOB_API_URL` | IBM watsonx.ai endpoint | Optional (enables Bob modes) |
| `IBM_BOB_API_KEY` | IBM Cloud API key for watsonx | Optional |
| `IBM_BOB_PROJECT_ID` | IBM watsonx Project ID | Optional |
| `GITHUB_PAT` | GitHub Personal Access Token | Optional (documented, not yet consumed) |

---

## Development Principles

1. **Inspect before modifying.** Read the relevant existing file in full before changing it. Never assume the implementation matches a familiar pattern.
2. **Reuse existing components and services.** `AppShell`, design tokens, auth helpers, and GitHub client are established — extend them rather than replacing them.
3. **Do not rewrite working authentication or GitHub OAuth.** These are complete and tested paths. Add to them only if a new requirement demands it.
4. **Keep server credentials on the server.** Variables without `NEXT_PUBLIC_` prefix must never appear in client-side code or be returned in API responses.
5. **Never hard-code secrets.** API keys, OAuth secrets, tokens, and passwords must come from environment variables only.
6. **Use Zod validation in API routes.** Follow the existing schema + `safeParse` + structured error response pattern.
7. **Preserve TypeScript strictness.** No `any` unless the existing code already uses it at that location. Prefer typed interfaces.
8. **Prefer small, targeted changes.** Edit only the files necessary to accomplish the task. Do not clean up unrelated code.
9. **Test changes before considering a task complete.** At minimum: `npx tsc --noEmit` and `npm run lint`. If a test file exists, run it.
10. **Do not fabricate evidence.** Do not programmatically set verification fields to "verified" without real underlying evidence.

---

## Hackathon Evidence Principles

The IBM Bob 2.0 Hackathon requires **genuine** Bob IDE usage evidence.

---

## Known Technical Limitations

These are **known issues** — do not attempt to fix them unless the current task explicitly calls for it:

1. **IBM Bob connection indicator is cosmetic.** The sidebar "IBM Bob 2.0 Connected" badge and green dot are static. They do not reflect actual credential availability at runtime.
2. **IBM watsonx credentials may be absent.** `/api/bob` silently falls back to Gemini (or heuristic) if `IBM_BOB_API_URL` / `IBM_BOB_API_KEY` are not set. The response includes a `bobAvailable: false` flag that the UI should surface.
3. **GitHub PAT is documented but not consumed.** `GITHUB_PAT` appears in `.env.example` but no code reads it. All GitHub API calls use the user's OAuth token.
4. **Embedding column exists but semantic search is not implemented.** The `vector(768)` column and `search_repository_files` RPC are defined in the schema but no code path generates or stores embeddings. Semantic file search is non-functional.
5. **Analysis pipeline runs inline.** The repository analysis `runAnalysisPipeline()` is an un-awaited Promise inside an API route handler. A server restart mid-analysis will orphan the job with status "running".
6. **No test suite.** There is no Jest, Vitest, or Playwright configuration. TypeScript compile and ESLint are the only automated checks.
7. **File analysis capped at 2,000 files.** Large repositories have file metadata truncated at 2,000 paths to avoid database timeouts.

<!-- END:repopilot-project-context -->
