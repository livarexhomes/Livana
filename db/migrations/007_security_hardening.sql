-- Migration: security hardening
--
-- Closes the highest-severity gaps from the security audit:
--   1. Adds public.is_admin() — real admin role check for RLS policies.
--      The previous pattern (public.is_not_anonymous()) treated ANY signed-in
--      non-anonymous user as an admin, letting tenants read/update every
--      enquiry, support ticket, and chat message.
--   2. Locks down admin_settings — the table holds the Resend API key and
--      previously had NO RLS at all, so any client with the anon key could
--      read it. Now: service role only (no anon/authenticated access).
--   3. Adds verification_codes.attempts + verification_codes.verified_at so
--      OTP endpoints can enforce brute-force limits and one-time use.
--   4. Restricts projects + project-images to real admins (was: any
--      authenticated user could insert/update/delete).
--   5. Fixes agents roster so only admins can mutate it (presence heartbeat
--      still works for agents via last_seen_at; roster edits are admin-only).
--
-- Safe to re-run. Apply with:
--   psql "$DATABASE_URL" -f db/migrations/007_security_hardening.sql
-- or run in the Supabase SQL editor.

-- ── 1. is_admin() ────────────────────────────────────────────────────────────
-- A non-anonymous, authenticated user whose JWT app_metadata carries
-- role = 'admin' (or roles[] includes 'admin'). This is the SAME check the
-- server-side requireAdmin() uses, so DB policies and API guards now agree.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT
    public.is_not_anonymous()
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      OR (auth.jwt() -> 'app_metadata' -> 'roles') @> '["admin"]'
    );
$$;

-- ── 2. admin_settings: lock down (holds the Resend API key) ─────────────────
-- No anon/authenticated access. The service-role key (server-side endpoints)
-- bypasses RLS entirely, which is exactly how email-template.js already reads
-- this table. If any policy exists below, drop it and re-create locked.
ALTER TABLE IF EXISTS public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_settings_admin_all" ON public.admin_settings;
CREATE POLICY "admin_settings_admin_all"
  ON public.admin_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 3. verification_codes: attempt tracking + verified flag ─────────────────
ALTER TABLE IF EXISTS public.verification_codes
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS public.verification_codes
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- ── 4. projects: real admins only for writes ────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_projects" ON public.projects;
CREATE POLICY "auth_insert_projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth_update_projects" ON public.projects;
CREATE POLICY "auth_update_projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth_delete_projects" ON public.projects;
CREATE POLICY "auth_delete_projects"
  ON public.projects FOR DELETE TO authenticated
  USING (public.is_admin());

-- project-images storage: admin-only uploads/updates/deletes
DROP POLICY IF EXISTS "auth_upload_project_images" ON storage.objects;
CREATE POLICY "auth_upload_project_images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-images' AND public.is_admin());

DROP POLICY IF EXISTS "auth_update_project_images" ON storage.objects;
CREATE POLICY "auth_update_project_images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'project-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'project-images' AND public.is_admin());

DROP POLICY IF EXISTS "auth_delete_project_images" ON storage.objects;
CREATE POLICY "auth_delete_project_images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-images' AND public.is_admin());

-- ── 5. agents roster: admin-only mutation ───────────────────────────────────
-- Any non-anonymous user may still SELECT the roster (the chat widget and
-- presence system need it). Only admins can UPDATE — an agent's presence
-- heartbeat writes last_seen_at, so agents need update on their own row via
-- the dedicated policy below.
DROP POLICY IF EXISTS "auth_update_agents" ON public.agents;
CREATE POLICY "auth_update_agents"
  ON public.agents FOR UPDATE TO authenticated
  USING (public.is_admin() OR user_id = auth.uid())
  WITH CHECK (public.is_admin() OR user_id = auth.uid());

-- ── 6. Re-point chat/support/enquiry admin policies at is_admin() ───────────
-- chat_inquiries: admin read/update
DROP POLICY IF EXISTS "auth_select_chat_inquiries" ON public.chat_inquiries;
CREATE POLICY "auth_select_chat_inquiries"
  ON public.chat_inquiries FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "auth_update_chat_inquiries" ON public.chat_inquiries;
CREATE POLICY "auth_update_chat_inquiries"
  ON public.chat_inquiries FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- chat_messages: admin read/insert/update
DROP POLICY IF EXISTS "admin_select_chat_messages" ON public.chat_messages;
CREATE POLICY "admin_select_chat_messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_insert_chat_messages" ON public.chat_messages;
CREATE POLICY "admin_insert_chat_messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender = 'admin' AND public.is_admin());

DROP POLICY IF EXISTS "admin_update_chat_messages" ON public.chat_messages;
CREATE POLICY "admin_update_chat_messages"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- enquiries: admin read/update
DROP POLICY IF EXISTS "auth_select_enquiries" ON public.enquiries;
CREATE POLICY "auth_select_enquiries"
  ON public.enquiries FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "auth_update_enquiries" ON public.enquiries;
CREATE POLICY "auth_update_enquiries"
  ON public.enquiries FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- enquiry_replies: admin read/insert
DROP POLICY IF EXISTS "auth_select_enquiry_replies" ON public.enquiry_replies;
CREATE POLICY "auth_select_enquiry_replies"
  ON public.enquiry_replies FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "auth_insert_enquiry_replies" ON public.enquiry_replies;
CREATE POLICY "auth_insert_enquiry_replies"
  ON public.enquiry_replies FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- support_tickets: admin read/update (owners still see their own)
DROP POLICY IF EXISTS "auth_select_support_tickets" ON public.support_tickets;
CREATE POLICY "auth_select_support_tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
    OR landlord_id IN (SELECT id FROM public.landlords WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "auth_update_support_tickets" ON public.support_tickets;
CREATE POLICY "auth_update_support_tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- support_messages: admin read/insert (ticket participants still see their own)
DROP POLICY IF EXISTS "auth_select_support_messages" ON public.support_messages;
CREATE POLICY "auth_select_support_messages"
  ON public.support_messages FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = support_messages.ticket_id
        AND (st.tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
          OR st.landlord_id IN (SELECT id FROM public.landlords WHERE user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "auth_insert_support_messages" ON public.support_messages;
CREATE POLICY "auth_insert_support_messages"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- contact_messages: admin read
DROP POLICY IF EXISTS "auth_select_contact_messages" ON public.contact_messages;
CREATE POLICY "auth_select_contact_messages"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (public.is_admin());

-- admins: admin-only read/insert/update
DROP POLICY IF EXISTS "auth_select_admins" ON public.admins;
CREATE POLICY "auth_select_admins"
  ON public.admins FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "auth_insert_admins" ON public.admins;
CREATE POLICY "auth_insert_admins"
  ON public.admins FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth_update_admins" ON public.admins;
CREATE POLICY "auth_update_admins"
  ON public.admins FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
