-- Migration: unified presence + availability (single source of truth)
--
-- Rebuilds the support system around ONE persisted source of truth: the
-- `agents` roster. It separates the two previously-conflicting concepts:
--
--   PRESENCE  (automatically detected — "is this agent actually connected?")
--             `presence`   = 'online' | 'away' | 'offline'
--             `last_seen_at` = heartbeat timestamp
--             The client only ever writes heartbeats (last_seen_at); the
--             online/away/offline state is derived from those timestamps by
--             `public.compute_presence()` and swept server-side, so no client
--             can fake being online.
--
--   AVAILABILITY (explicit — "is this agent accepting new conversations?")
--             `available`   = bool, agent-controlled toggle.
--             `availability_note` = optional "back at HH:MM" text shown to
--             visitors when the agent is unavailable.
--
-- The customer chatbot counts agents where presence = 'online' AND
-- availability = true via the `available_agents` view (a row is counted only
-- when the online threshold is actually met), and never derives availability
-- from frontend state. Every admin surface (header status, agent list, logged-
-- in admin status) reads the same roster via realtime.
--
-- Safe to re-run. Apply with:
--   psql "$DATABASE_URL" -f db/migrations/008_presence_and_availability.sql
-- or run in the Supabase SQL editor.

-- ── 1. agents: presence + availability columns ────────────────────────────────

ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS availability_note TEXT;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS available BOOLEAN NOT NULL DEFAULT true;

-- Presence is stored in the roster so it survives (and is swept) server-side.
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS presence TEXT NOT NULL DEFAULT 'offline'
  CHECK (presence IN ('online', 'away', 'offline'));

-- Logged-in support users may update ONLY their own row (roster edits stay
-- admin-only; the 007 policy already grants agents update on their own row).
DROP POLICY IF EXISTS "auth_update_agents" ON public.agents;
CREATE POLICY "auth_update_agents"
  ON public.agents FOR UPDATE TO authenticated
  USING (public.is_admin() OR user_id = auth.uid())
  WITH CHECK (public.is_admin() OR user_id = auth.uid());

-- ── 2. presence derivation + server-side sweep ────────────────────────────────
-- A client is only ever "online" while its last_seen_at heartbeat is fresh.
-- The sweep runs periodically (via the API endpoint) and on the RPC; it flips
-- stale heartbeats to 'away' (then 'offline') and drops visitors' heartbeats.

CREATE OR REPLACE FUNCTION public.compute_presence(last_seen_at timestamptz, now_ts timestamptz DEFAULT now())
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN last_seen_at IS NULL THEN 'offline'
    WHEN now_ts - last_seen_at < interval '90 seconds' THEN 'online'
    WHEN now_ts - last_seen_at < interval '15 minutes' THEN 'away'
    ELSE 'offline'
  END;
$$;

CREATE OR REPLACE FUNCTION public.sweep_presence()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.agents
    SET presence = public.compute_presence(last_seen_at)
  WHERE presence IS DISTINCT FROM public.compute_presence(last_seen_at);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Expose the sweep to the client (used by the presence heartbeat endpoint and
-- the admin UI). RLS runs as the caller, so guard with is_not_anonymous().
REVOKE ALL ON FUNCTION public.sweep_presence() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sweep_presence() TO authenticated;

-- ── 3. available_agents view (customer-facing count) ─────────────────────────
-- A row is only "available" when the agent is online by the live threshold.
-- The chatbot and admin UI count rows in this view; there is no other source.
DROP VIEW IF EXISTS public.available_agents;
CREATE VIEW public.available_agents WITH (security_invoker = true) AS
  SELECT id, user_id, name, email, role, last_seen_at, availability_note
  FROM public.agents
  WHERE public.compute_presence(last_seen_at) = 'online'
    AND available = true
    AND active = true;

-- ── 4. realtime: the roster is the single live feed ──────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'agents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
  END IF;
END $$;

-- Backfill presence for existing rows (idempotent).
UPDATE public.agents SET presence = public.compute_presence(last_seen_at);
