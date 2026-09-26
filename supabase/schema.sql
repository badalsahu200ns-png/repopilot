-- RepoPilot 2.0 — Supabase Database Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- Or via: supabase db push

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ── repositories ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.repositories (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_url       TEXT NOT NULL,
  github_owner     TEXT NOT NULL,
  github_repo      TEXT NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  default_branch   TEXT NOT NULL DEFAULT 'main',
  language         TEXT,
  analysis_status  TEXT NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending','running','completed','failed')),
  analyzed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, github_owner, github_repo)
);

-- ── repository_snapshots ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.repository_snapshots (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id       UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  commit_sha          TEXT,
  branch              TEXT NOT NULL DEFAULT 'HEAD',
  file_count          INTEGER NOT NULL DEFAULT 0,
  language_breakdown  JSONB NOT NULL DEFAULT '{}',
  framework_detected  JSONB NOT NULL DEFAULT '[]',
  architecture        JSONB NOT NULL DEFAULT '{}',
  tech_stack          JSONB NOT NULL DEFAULT '{}',
  risks               JSONB NOT NULL DEFAULT '[]',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── repository_files ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.repository_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  path          TEXT NOT NULL,
  language      TEXT,
  is_test       BOOLEAN NOT NULL DEFAULT FALSE,
  is_doc        BOOLEAN NOT NULL DEFAULT FALSE,
  embedding     vector(768),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (repository_id, path)
);

-- ── tasks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id   UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','planned','in_progress','complete','failed')),
  impact_analysis JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── task_plans ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  steps       JSONB NOT NULL DEFAULT '[]',
  generated_by TEXT NOT NULL DEFAULT 'repopilot',
  bob_plan_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── conversations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── conversation_messages ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content         TEXT NOT NULL,
  classification  TEXT CHECK (classification IN ('verified','inferred','recommendation','unknown')),
  confidence      TEXT CHECK (confidence IN ('high','medium','low')),
  evidence        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── verification_runs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.verification_runs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id       UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','passed','failed','partial')),
  checks        JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- ── Timestamps trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER repositories_updated_at BEFORE UPDATE ON public.repositories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated_at        BEFORE UPDATE ON public.tasks        FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.repositories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_plans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_runs    ENABLE ROW LEVEL SECURITY;

-- repositories: user owns their data
CREATE POLICY "Users own repositories" ON public.repositories
  FOR ALL USING (auth.uid() = user_id);

-- snapshots: accessible if user owns the repository
CREATE POLICY "Users see their snapshots" ON public.repository_snapshots
  FOR ALL USING (EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = repository_id AND r.user_id = auth.uid()));

-- files: accessible if user owns the repository
CREATE POLICY "Users see their files" ON public.repository_files
  FOR ALL USING (EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = repository_id AND r.user_id = auth.uid()));

-- tasks
CREATE POLICY "Users own tasks" ON public.tasks
  FOR ALL USING (auth.uid() = user_id);

-- task plans: via task ownership
CREATE POLICY "Users see their plans" ON public.task_plans
  FOR ALL USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.user_id = auth.uid()));

-- conversations
CREATE POLICY "Users own conversations" ON public.conversations
  FOR ALL USING (auth.uid() = user_id);

-- conversation messages: via conversation ownership
CREATE POLICY "Users see their messages" ON public.conversation_messages
  FOR ALL USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));

-- verification runs
CREATE POLICY "Users own verification runs" ON public.verification_runs
  FOR ALL USING (auth.uid() = user_id);

-- ── Vector search function ────────────────────────────────────
CREATE OR REPLACE FUNCTION search_repository_files(
  p_repository_id UUID,
  p_query_embedding vector(768),
  p_match_count INT DEFAULT 10
)
RETURNS TABLE(id UUID, path TEXT, language TEXT, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT
    rf.id,
    rf.path,
    rf.language,
    1 - (rf.embedding <=> p_query_embedding) AS similarity
  FROM public.repository_files rf
  WHERE rf.repository_id = p_repository_id
    AND rf.embedding IS NOT NULL
  ORDER BY rf.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

-- ── compliance_records ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.compliance_records (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state      JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TRIGGER compliance_records_updated_at
  BEFORE UPDATE ON public.compliance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.compliance_records ENABLE ROW LEVEL SECURITY;

-- Users can only access their own compliance record
CREATE POLICY "Users own compliance records" ON public.compliance_records
  FOR ALL USING (auth.uid() = user_id);
