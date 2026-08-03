-- Migration: live support multi-agent
--
-- Adds a durable `agents` roster and per-inquiry assignment state so the
-- live-support system can route conversations to specific agents, queue them
-- when no one is available, and support transfers. Also adds visitor-side
-- read receipts and image attachments to chat messages.
--
-- Assignment state lives in chat_inquiries.agent_id + agent_status
-- ('unassigned' | 'queued' | 'assigned'). There is intentionally NO separate
-- `assigned_to` column — agent_status/agent_id are the single source of truth.
--
-- Safe to re-run.
--
-- Apply with:
--   psql "$DATABASE_URL" -f db/migrations/005_live_support_multi_agent.sql
-- or run in the Supabase SQL editor.

-- ── agents roster ──────────────────────────────────────────────────────────────
-- Durable record of who can handle support. Rows are created/updated by the
-- service-role endpoint api/register-support-agent.ts (first login of an admin
-- or agent), so there is no public INSERT policy.

CREATE TABLE IF NOT EXISTS public.agents (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'agent'
              CHECK (role IN ('agent', 'support', 'admin')),
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agents_active_idx ON public.agents (active);

-- RLS: any authenticated non-anonymous user can read/update the roster
-- (the chat widget, assignment UI, and roster page all need it). Writes to the
-- roster are only possible via the service-role endpoint.
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_agents" ON public.agents;
CREATE POLICY "auth_select_agents"
  ON public.agents FOR SELECT TO authenticated
  USING (public.is_not_anonymous());

DROP POLICY IF EXISTS "auth_update_agents" ON public.agents;
CREATE POLICY "auth_update_agents"
  ON public.agents FOR UPDATE TO authenticated
  USING (public.is_not_anonymous()) WITH CHECK (public.is_not_anonymous());

-- Realtime for the roster (no-op if already a member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'agents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
  END IF;
END $$;

-- ── chat_inquiries: per-conversation assignment ────────────────────────────────
-- agent_status machine: 'unassigned' (new, not routed yet), 'queued' (no agent
-- was available — waitlist), 'assigned' (an agent owns this conversation).

ALTER TABLE public.chat_inquiries ADD COLUMN IF NOT EXISTS agent_id UUID
  REFERENCES public.agents(id) ON DELETE SET NULL;

ALTER TABLE public.chat_inquiries ADD COLUMN IF NOT EXISTS agent_status TEXT
  NOT NULL DEFAULT 'unassigned'
  CHECK (agent_status IN ('unassigned', 'queued', 'assigned'));

CREATE INDEX IF NOT EXISTS chat_inquiries_agent_status_idx
  ON public.chat_inquiries (agent_status, created_at);

-- Backfill existing rows (idempotent)
UPDATE public.chat_inquiries SET agent_status = 'unassigned' WHERE agent_status IS NULL;

-- ── chat_messages: visitor read receipts + attachments ─────────────────────────
-- read_by_admin already exists (admin read state). read_by_visitor tracks
-- whether the visitor has seen the message so the admin inbox can show ✓✓.
-- attachment_url/attachment_name support image attachments in live threads.
-- RLS needs no change — the existing chat_messages policies cover all columns.

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS read_by_visitor BOOLEAN
  NOT NULL DEFAULT false;

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
