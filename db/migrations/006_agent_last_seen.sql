-- Migration: agent last-seen timestamps
--
-- Adds a durable `last_seen_at` to the agents roster so the Support page can
-- show "Online" / "Offline · last seen 2h ago" relative-time presence instead
-- of a static boolean. Written by the admin-presence heartbeat (a lightweight
-- UPDATE from the client, allowed by the existing auth_update_agents policy).
--
-- Safe to re-run.

-- ── agents: last_seen_at ──────────────────────────────────────────────────────
-- Updated on a throttled heartbeat (~60s) while the agent has an admin page
-- open, and on explicit presence transitions. NULL = never seen.

ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS agents_last_seen_idx ON public.agents (last_seen_at);
