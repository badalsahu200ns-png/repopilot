# Data Sources & Compliance Manifest

**Project:** RepoPilot 2.0
**Scope:** Repository evidence only
**Last Updated:** 2026-09-25

This manifest records only sources that are directly referenced in the repository code and configuration. It does not claim any licenses, permissions, datasets, or external terms beyond what is explicitly present in the codebase.

## Referenced data sources

### 1. GitHub REST API
- Code path: [src/lib/github/client.ts](src/lib/github/client.ts)
- Repository references: `GET /user`, `GET /user/emails`, `GET /repos/{owner}/{repo}`, `GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1`, `GET /repos/{owner}/{repo}/contents/{path}`
- Used for: repository metadata, file tree inspection, repository contents, authenticated profile lookup, and GitHub OAuth identity data.
- Evidence in repo: the app requests GitHub OAuth and reads repository metadata as part of analysis and compliance flows.

### 2. Supabase PostgreSQL
- Code path: [src/lib/supabase/server.ts](src/lib/supabase/server.ts), [src/lib/supabase/client.ts](src/lib/supabase/client.ts)
- Used for: persistent storage of repositories, task plans, conversations, verification runs, and compliance state.
- Repository evidence: the schema in [supabase/schema.sql](supabase/schema.sql) defines the tables and RLS policies.

### 3. Google Gemini API
- Code path: [src/app/api/repositories/[id]/ask/route.ts](src/app/api/repositories/[id]/ask/route.ts)
- Environment variable: `GEMINI_API_KEY`
- Used for: evidence-backed repository Q&A and as an AI fallback for repository analysis workflows.

### 4. IBM watsonx.ai / IBM Bob API
- Code path: [src/app/api/bob/route.ts](src/app/api/bob/route.ts)
- Environment variables: `IBM_BOB_API_URL`, `IBM_BOB_API_KEY`, `IBM_BOB_PROJECT_ID`
- Used for: Bob-mode orchestration and chat generation when the IBM environment is configured.
- Important note: the current environment has no available Bob usage budget, so no Bob session or Bob evidence is fabricated in this repository state.

### 5. Local filesystem JSON store
- Code path: [src/lib/db/localDb.ts](src/lib/db/localDb.ts)
- Used for: local development persistence when Supabase is unavailable or not configured.
- Evidence in repo: the app stores development data in `.data/repopilot-dev.json`.

### 6. Bob session screenshots in repository
- Code path: [src/lib/compliance/service.ts](src/lib/compliance/service.ts)
- Used for: server-side scan of the `bob_sessions/` directory and screenshot metadata validation.
- Evidence in repo: the compliance logic scans for PNG files under the repository-level `bob_sessions/` folder.

## Repository-only compliance statement

The sources above are the only ones actually referenced in the repository as currently checked in. No additional dataset, license, permission record, or external source is claimed by the application code itself.

The compliance implementation intentionally avoids inventing Bob usage, Bobcoin consumption, IBMid validation, or screenshot evidence that is not present in the repository and its genuine server-side filesystem scan.
