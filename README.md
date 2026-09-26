# RepoPilot 2.0

> **"From unfamiliar codebase to verified contribution."**

RepoPilot 2.0 is a **developer navigation and change-impact platform** that helps developers understand an unfamiliar GitHub repository, identify where a requested change belongs, understand the potential impact, generate an implementation-ready task plan, hand that plan to IBM Bob for execution, and verify the resulting work.

---

## The Core Workflow

```
Connect → X-Ray → Ask → Change Impact → Plan → IBM Bob → Verify
```

RepoPilot is **not** a GitHub viewer, chatbot, or README generator. It is a structured workflow tool that reduces the time and uncertainty between:

> "I need to change something in this unfamiliar repository"

and

> "I know what to change, why, where, how, and how to verify it."

**RepoPilot handles: Understand + Plan**  
**IBM Bob handles: Implement + Iterate**  
**Verification: Prove the result**

---

## Problem Statement

When developers join a project or need to modify an unfamiliar codebase, navigating the architecture, identifying relevant files, and understanding cascading side effects is slow and error-prone. Generic AI assistants hallucinate without ground-truth citations.

RepoPilot solves this by grounding every insight in real repository data:
- Inspects real files and dependencies from GitHub
- Produces classified answers (`VERIFIED`, `INFERRED`, `RECOMMENDATION`, `UNKNOWN`) with explicit file citations
- Generates structured change impact analysis with file-level evidence
- Creates IBM Bob-optimized task packages ready for implementation

---

## Target Users

- Developers who need to modify an unfamiliar codebase
- New engineers joining a project
- Contributors to open-source repositories
- Software teams maintaining legacy applications
- Technical leads performing impact analysis
- Developers preparing changes for AI coding agents like IBM Bob

---

## Main Features

### 1. Repository Connection
Connect any public GitHub repository by URL. RepoPilot retrieves repository metadata and immediately kicks off analysis.

### 2. Codebase X-Ray
Deep structural analysis powered by GitHub API:
- Language breakdown with percentages
- Framework detection from `package.json`, `requirements.txt`, etc.
- Architecture layers (Frontend, Backend, Data)
- Entry points detection
- Key modules identification
- Risk observations
- Real-time polling during analysis

### 3. Evidence-Backed Codebase Q&A
Natural language questions answered using repository context:
- Every answer classified as `VERIFIED`, `INFERRED`, `RECOMMENDATION`, or `UNKNOWN`
- Explicit file citations as evidence
- Confidence levels (high/medium/low)
- Built-in heuristic fallback without API keys

### 4. Change Impact Analysis — The Differentiating Feature
> "I need to add rate limiting to the API."

RepoPilot produces a structured Change Impact Analysis:
- **Objective** — what the change is
- **Affected areas** — architectural layers likely impacted
- **Likely files** — real files from the repository (never fabricated)
- **Dependencies** — internal and external impacts
- **Test impact** — existing tests that may be affected
- **API/Config impact** — data flow and configuration changes
- **Risk assessment** — Low/Medium/High with rationale
- **Implementation plan** — ordered steps with file references
- **Acceptance criteria** — verifiable success conditions

### 5. IBM Bob Task Package
After impact analysis, generate a structured task package optimized for IBM Bob IDE:
- Full repository context
- Relevant files
- Implementation plan
- Constraints and acceptance criteria
- Verification commands
- **"Copy Bob Task"** — one click to clipboard

### 6. IBM Bob Task Workflow
Create development tasks linked to repositories:
- Plan mode — IBM Bob generates ordered implementation steps
- Code mode — IBM Bob provides implementation guidance
- Review mode — security and quality audit
- Human-in-the-loop approval gate before saving plans

### 7. Verification Center
Final workflow stage — verify the change is complete:
- Test suite checklist
- Lint verification
- Build verification
- Type check
- Code review
- Changed files review
- Acceptance criteria tracker
- Contribution summary generation

---

## Architecture

RepoPilot 2.0 follows a modern Next.js App Router architecture:

```
repopilot/
├── src/
│   ├── app/
│   │   ├── (app)/                        # Protected authenticated routes
│   │   │   ├── layout.tsx                # Server-side auth + AppShell
│   │   │   ├── dashboard/page.tsx        # Overview dashboard
│   │   │   ├── repositories/
│   │   │   │   ├── page.tsx              # Repository list
│   │   │   │   ├── new/page.tsx          # Connect repository form
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx          # Codebase X-Ray ⭐
│   │   │   │       ├── ask/page.tsx      # Evidence-backed Q&A ⭐
│   │   │   │       ├── change/page.tsx   # Change Impact Analysis ⭐
│   │   │   │       └── verify/page.tsx   # Verification Center ⭐
│   │   │   ├── tasks/
│   │   │   │   ├── page.tsx              # Task list (Bob Tasks)
│   │   │   │   ├── new/page.tsx          # Create task + IBM Bob workflow ⭐
│   │   │   │   └── [id]/page.tsx         # Task detail with plan steps
│   │   ├── api/
│   │   │   ├── repositories/
│   │   │   │   ├── route.ts              # Connect/list repositories
│   │   │   │   └── [id]/
│   │   │   │       ├── analyze/route.ts  # Analysis pipeline ⭐
│   │   │   │       ├── ask/route.ts      # Evidence Q&A (Gemini) ⭐
│   │   │   │       └── change-impact/    # Change impact analysis ⭐
│   │   │   ├── tasks/route.ts            # Task CRUD
│   │   │   ├── tasks/[id]/plan/          # Plan management
│   │   │   └── bob/route.ts              # IBM Bob / Gemini fallback ⭐
│   │   ├── login/page.tsx                # Authentication
│   │   └── register/page.tsx
│   ├── components/layout/AppShell.tsx    # Sidebar + topbar
│   ├── lib/
│   │   ├── auth/session.ts               # JWT session management
│   │   ├── db/localDb.ts                 # Local JSON database adapter
│   │   ├── github/client.ts              # GitHub API client
│   │   └── supabase/                     # Supabase client (optional)
│   └── types/index.ts                    # Full domain type system
├── bob_sessions/                         # IBM Bob session screenshots
├── supabase/schema.sql                   # Database schema
└── .env.example                          # Environment template
```

⭐ = Core product features

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| UI Components | Radix UI primitives, custom design system |
| State | React useState/useEffect, Zustand (available) |
| Database | Local JSON flat-file (dev) / Supabase (production) |
| Authentication | Custom JWT (HMAC-SHA256) + Supabase Auth |
| GitHub Integration | GitHub REST API v3 |
| AI (primary) | Google Gemini 1.5 Flash |
| AI (IBM Bob) | IBM watsonx Granite 13B Chat v2 |
| Data Fetching | SWR, native fetch |
| Validation | Zod |
| Animations | Framer Motion |
| Flow Visualization | ReactFlow |

---

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm 9+
- GitHub account (for repository access)

### Quick Start

```bash
# 1. Navigate to the project
cd repopilot

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Edit .env.local with your credentials (see below)

# 5. Start development server
npm run dev

# 6. Open http://localhost:3000
```

---

## Environment Variables

```bash
# Required for operation
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Auth (works without changes in local mode)
AUTH_SECRET=repopilot-2.0-dev-session-secret-key-32chars
AUTH_MODE=local

# AI — optional but strongly recommended
GEMINI_API_KEY=your_google_gemini_api_key

# IBM Bob / watsonx — for Plan/Code/Review modes
IBM_BOB_API_URL=your_ibm_watsonx_endpoint
IBM_BOB_API_KEY=your_ibm_bob_api_key
IBM_BOB_PROJECT_ID=your_watsonx_project_id

# GitHub — increases API rate limits (optional)
# GITHUB_PAT=ghp_your_token_here

# Database — optional (local JSON store used by default)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Without any API keys
RepoPilot works with zero API keys:
- Repository analysis: ✅ (uses GitHub public API)
- Codebase Q&A: ✅ (heuristic keyword matching)
- Change Impact: ✅ (heuristic structural analysis)
- IBM Bob tasks: ✅ (heuristic plan generation)

### With Gemini API key
All AI-powered features unlock:
- Evidence-backed Q&A with semantic understanding
- AI-powered change impact analysis
- Better implementation plans

### With IBM watsonx / Bob credentials
- IBM Granite model for Plan/Code/Review modes
- Full IBM Bob workflow integration

---

## GitHub Integration

RepoPilot uses the GitHub REST API for:
1. **Repository metadata** — name, description, language, stars, forks
2. **File tree** — recursive file listing for analysis
3. **Key files** — `package.json`, `requirements.txt`, etc. for framework detection

Authentication: GitHub OAuth via `/api/auth/github`. Users authorize RepoPilot to read their repositories.

Rate limits:
- Without auth: 60 requests/hour
- With GitHub PAT: 5,000 requests/hour

---

## IBM Bob Role

IBM Bob is the **execution partner** in the RepoPilot workflow.

### Where Bob is used:

**1. Task Planning (`/tasks/new`)**  
RepoPilot creates development tasks linked to analyzed repositories, then calls the IBM Bob API in Plan mode (`/api/bob`). Bob receives:
- Task description
- Repository architecture context
- Codebase snapshot

Bob returns a structured implementation plan with ordered steps, affected files, and risk identification.

**2. Bob Task Package (`/repositories/[id]/change`)**  
After Change Impact Analysis, RepoPilot generates a structured task package optimized for pasting directly into IBM Bob IDE. The package includes:
- Full repository context
- Affected files (evidence-backed)
- Implementation plan
- Constraints and acceptance criteria
- Verification commands

**3. Code Mode**  
Bob provides implementation guidance for specific file changes.

**4. Review Mode (`/review`)**  
Bob performs security and quality audit of proposed changes.

**5. Orchestrator Mode**  
Available for multi-step workflows.

### IBM Bob API Integration
The `/api/bob/route.ts` endpoint calls:
- `IBM_BOB_API_URL/ml/v1/text/chat?version=2024-05-31`
- Model: `ibm/granite-13b-chat-v2`
- Fallback: Google Gemini 1.5 Flash when Bob credentials unavailable

### Bob Sessions
See `bob_sessions/` directory for task session screenshots demonstrating IBM Bob usage during development.

---

## Demo — 3-Minute Hackathon Story

### 0:00 — Problem
"Developers waste time understanding unfamiliar repositories before making changes."

### 0:20 — Connect (`/repositories/new`)
Enter: `https://github.com/owner/repository`  
RepoPilot retrieves metadata and starts analysis.

### 0:40 — X-Ray (`/repositories/[id]`)
Show: architecture layers, language breakdown, frameworks, entry points, key modules, risks.  
"RepoPilot has built a mental model of this codebase."

### 1:00 — Ask (`/repositories/[id]/ask`)
Question: "Where is authentication handled?"  
Show: evidence-backed answer with file citations, VERIFIED/INFERRED badges.

### 1:20 — Change Impact (`/repositories/[id]/change`)
Enter: "I need to add rate limiting to the API."  
Show: affected areas, likely files (from real repository), risk level, implementation steps.

### 1:55 — Bob Task Package
Click "Copy Bob Task" — structured package copied to clipboard.

### 2:10 — IBM Bob
Paste task package into IBM Bob IDE. Show Bob executing Plan mode.

### 2:35 — Verify (`/repositories/[id]/verify`)
Show: test checklist, lint, build, acceptance criteria tracker.

### 2:50 — Result
"From unfamiliar codebase to verified contribution."

---

## Known Limitations

1. **Analysis depth**: Repository analysis uses file tree heuristics and package manifests. Deep code-level analysis (AST, import graphs) is not performed.
2. **File fabrication prevention**: Likely files in Change Impact Analysis are filtered to only show files that exist in the repository snapshot. If GEMINI_API_KEY is not set, heuristic keyword matching is used.
3. **GitHub rate limits**: Analysis of large repositories (>5,000 files) is rate-limited. A GitHub PAT is recommended.
4. **IBM Bob integration**: Direct web-to-Bob API integration requires IBM watsonx credentials. The "Copy Bob Task" feature works without credentials — the task package is designed for manual paste into IBM Bob IDE.
5. **Real-time execution**: RepoPilot does not execute terminal commands. The Verification Center provides commands and a manual status tracker.
6. **Database**: By default, uses a local JSON flat-file. For production, configure Supabase.

---

## Future Roadmap

- [ ] AST-level code analysis for higher-confidence impact assessment
- [ ] GitHub webhook integration for automatic re-analysis on push
- [ ] Live IBM Bob workflow streaming
- [ ] Work Queue (AI-suggested tasks from repository analysis)
- [ ] Contribution Readiness scoring
- [ ] Onboarding Mode for new team members
- [ ] File impact map visualization (ReactFlow)
- [ ] "Why this file?" deep-dive panel
- [ ] Multi-repository dependency graphs
- [ ] CI/CD integration for verification

---

## IBM Bob Usage Evidence

See `bob_sessions/` directory for session screenshots.

**Bob was used for:**
- Task 01: Analyzing and understanding the existing RepoPilot codebase
- Task 02: Redesigning the application architecture around the RepoPilot 2.0 workflow
- Task 03: Implementing the Codebase X-Ray and evidence model
- Task 04: Implementing Change Impact Analysis
- Task 05: Implementing Bob Task Package generation
- Task 06: Implementing Verification Center
- Task 07: Polishing UX and responsive layout
- Task 08: Running testing/build/review and fixing remaining issues

---

## License

MIT License — see LICENSE file.

---

*RepoPilot 2.0 — IBM Bob Hackathon 2026*  
*Built with IBM Bob 2.0, Next.js 16, Google Gemini, and GitHub API*
