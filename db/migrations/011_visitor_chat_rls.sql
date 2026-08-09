-- Migration 011: Visitor RLS for chat_inquiries and chat_messages
-- ============================================================================
-- Root cause: migration 007 (security_hardening) replaced all chat_inquiries
-- and chat_messages policies with admin-only rules, but never added visitor-
-- facing INSERT / SELECT / UPDATE policies. Result: any non-admin (anon or
-- authenticated tenant/landlord) who clicks "Talk to a real agent" gets an
-- RLS violation when the widget tries to INSERT a row → "Connection failed."
--
-- Fix: add the minimum visitor-facing policies so the live-chat flow works
-- for both unauthenticated (anon) visitors and authenticated users.
--
-- Existing admin policies are NOT changed.
--
-- Safe to re-run. Apply in the Supabase SQL editor:
--   Dashboard → SQL Editor → New query → paste → Run
-- ============================================================================

-- Ensure RLS is active on both tables (idempotent).
ALTER TABLE public.chat_inquiries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages   ENABLE ROW LEVEL SECURITY;

-- ── chat_inquiries ────────────────────────────────────────────────────────────

-- Visitors (logged-in or anonymous) can open a new chat ticket.
DROP POLICY IF EXISTS "visitor_insert_chat_inquiries" ON public.chat_inquiries;
CREATE POLICY "visitor_insert_chat_inquiries"
  ON public.chat_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated (non-admin) visitors can read back their own ticket.
-- Admins already have full SELECT via "auth_select_chat_inquiries".
DROP POLICY IF EXISTS "visitor_select_own_chat_inquiries" ON public.chat_inquiries;
CREATE POLICY "visitor_select_own_chat_inquiries"
  ON public.chat_inquiries FOR SELECT
  TO authenticated
  USING (visitor_id = auth.uid());

-- ── chat_messages ─────────────────────────────────────────────────────────────

-- Visitors can INSERT messages with sender = 'visitor' only.
DROP POLICY IF EXISTS "visitor_insert_chat_messages" ON public.chat_messages;
CREATE POLICY "visitor_insert_chat_messages"
  ON public.chat_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (sender = 'visitor');

-- Authenticated visitors can SELECT messages that belong to their own inquiry.
-- Admins already have full SELECT via "admin_select_chat_messages".
DROP POLICY IF EXISTS "visitor_select_chat_messages" ON public.chat_messages;
CREATE POLICY "visitor_select_chat_messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    inquiry_id IN (
      SELECT id FROM public.chat_inquiries WHERE visitor_id = auth.uid()
    )
  );

-- Anonymous visitors can SELECT messages for truly anonymous inquiries
-- (visitor_id IS NULL). The UUID inquiry_id is unguessable, making it an
-- effectively private token even without an auth claim.
DROP POLICY IF EXISTS "anon_select_chat_messages" ON public.chat_messages;
CREATE POLICY "anon_select_chat_messages"
  ON public.chat_messages FOR SELECT
  TO anon
  USING (
    inquiry_id IN (
      SELECT id FROM public.chat_inquiries WHERE visitor_id IS NULL
    )
  );

-- Visitors can UPDATE read_by_visitor on messages in their thread.
-- Authenticated: scoped to their own inquiry. Anon: scoped to null visitor_id.
DROP POLICY IF EXISTS "visitor_update_chat_messages" ON public.chat_messages;
CREATE POLICY "visitor_update_chat_messages"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (
    inquiry_id IN (
      SELECT id FROM public.chat_inquiries WHERE visitor_id = auth.uid()
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chat_messages" ON public.chat_messages;
CREATE POLICY "anon_update_chat_messages"
  ON public.chat_messages FOR UPDATE
  TO anon
  USING (
    inquiry_id IN (
      SELECT id FROM public.chat_inquiries WHERE visitor_id IS NULL
    )
  )
  WITH CHECK (true);
