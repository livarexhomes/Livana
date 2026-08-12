-- Migration: fix support ticket RLS so admin agents can see and manage tickets
--
-- Problem: the SELECT/UPDATE/INSERT policies on support_tickets and
-- support_messages gate access via is_admin(), which checks JWT app_metadata
-- for role='admin'. Admin staff who are in the agents table but whose JWT
-- app_metadata is not yet updated cannot see any tickets.
--
-- Fix: introduce is_agent() — a stable function that returns true for any
-- authenticated non-anonymous user who has a row in the agents table. Add it
-- as an alternative path alongside is_admin() on every support policy.
--
-- Safe to re-run. Apply with:
--   psql "$DATABASE_URL" -f db/migrations/012_fix_support_agent_rls.sql
-- or run in the Supabase SQL editor.

-- ── 1. is_agent() helper ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_not_anonymous()
    AND EXISTS (
      SELECT 1 FROM public.agents WHERE user_id = auth.uid()
    );
$$;

-- ── 2. support_tickets: SELECT — admins + agents + ticket owners ──────────────
DROP POLICY IF EXISTS "auth_select_support_tickets" ON public.support_tickets;
CREATE POLICY "auth_select_support_tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_agent()
    OR tenant_id   IN (SELECT id FROM public.tenants   WHERE user_id = auth.uid())
    OR landlord_id IN (SELECT id FROM public.landlords WHERE user_id = auth.uid())
  );

-- ── 3. support_tickets: UPDATE — admins + agents ─────────────────────────────
DROP POLICY IF EXISTS "auth_update_support_tickets" ON public.support_tickets;
CREATE POLICY "auth_update_support_tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_agent())
  WITH CHECK (public.is_admin() OR public.is_agent());

-- ── 4. support_messages: SELECT — admins + agents + ticket participants ───────
DROP POLICY IF EXISTS "auth_select_support_messages" ON public.support_messages;
CREATE POLICY "auth_select_support_messages"
  ON public.support_messages FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_agent()
    OR EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = support_messages.ticket_id
        AND (
          st.tenant_id   IN (SELECT id FROM public.tenants   WHERE user_id = auth.uid())
          OR st.landlord_id IN (SELECT id FROM public.landlords WHERE user_id = auth.uid())
        )
    )
  );

-- ── 5. support_messages: INSERT ───────────────────────────────────────────────
-- Admins + agents can insert (admin replies).
-- The existing "anon_insert_support_messages" policy already allows any
-- authenticated user to insert (tenants / landlords). This policy makes the
-- intent explicit and adds the agent path for admin reply attribution.
DROP POLICY IF EXISTS "auth_insert_support_messages" ON public.support_messages;
CREATE POLICY "auth_insert_support_messages"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.is_agent()
    OR EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id
        AND (
          st.tenant_id   IN (SELECT id FROM public.tenants   WHERE user_id = auth.uid())
          OR st.landlord_id IN (SELECT id FROM public.landlords WHERE user_id = auth.uid())
        )
    )
  );

-- ── 6. support_ticket_events: SELECT — admins + agents ───────────────────────
DROP POLICY IF EXISTS "admin_select_support_ticket_events" ON public.support_ticket_events;
CREATE POLICY "admin_select_support_ticket_events"
  ON public.support_ticket_events FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_agent());
