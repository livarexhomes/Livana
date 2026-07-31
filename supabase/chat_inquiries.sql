-- Run this in the Supabase SQL editor: https://app.supabase.com → SQL Editor
-- Safe to re-run: upgrades an existing chat_inquiries table and creates chat_messages.

CREATE TABLE IF NOT EXISTS chat_inquiries (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT         NOT NULL,
  note          TEXT         NOT NULL,
  phone         TEXT,
  visitor_id    UUID,        -- anonymous auth uid of the website visitor (NULL for legacy rows)
  read_by_admin BOOLEAN      NOT NULL DEFAULT false, -- false = admin has not read/replied yet
  status        TEXT         NOT NULL DEFAULT 'open'
                           CHECK (status IN ('open', 'replied', 'closed')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Upgrade existing tables that predate the two-way chat columns
ALTER TABLE chat_inquiries ADD COLUMN IF NOT EXISTS visitor_id UUID;
ALTER TABLE chat_inquiries ADD COLUMN IF NOT EXISTS read_by_admin BOOLEAN NOT NULL DEFAULT false;

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_chat_inquiries_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_chat_inquiries_updated_at ON chat_inquiries;
CREATE TRIGGER trg_chat_inquiries_updated_at
  BEFORE UPDATE ON chat_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_chat_inquiries_updated_at();

-- Helpers: anonymous sign-in users are role "authenticated" but carry
-- is_anonymous = true in their JWT. "Admins" below means authenticated
-- users who are NOT anonymous.
CREATE OR REPLACE FUNCTION public.is_not_anonymous()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'is_anonymous') IS DISTINCT FROM 'true';
$$;

-- RLS
ALTER TABLE chat_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous website visitors) can submit an inquiry.
-- A visitor can only claim their own uid as visitor_id.
DROP POLICY IF EXISTS "anon_insert_chat_inquiries" ON chat_inquiries;
CREATE POLICY "anon_insert_chat_inquiries"
  ON chat_inquiries FOR INSERT TO anon, authenticated
  WITH CHECK (visitor_id IS NULL OR visitor_id = auth.uid());

-- Admins (non-anonymous authenticated users) can read and update all
DROP POLICY IF EXISTS "auth_select_chat_inquiries" ON chat_inquiries;
CREATE POLICY "auth_select_chat_inquiries"
  ON chat_inquiries FOR SELECT TO authenticated
  USING (public.is_not_anonymous());

DROP POLICY IF EXISTS "auth_update_chat_inquiries" ON chat_inquiries;
CREATE POLICY "auth_update_chat_inquiries"
  ON chat_inquiries FOR UPDATE TO authenticated
  USING (public.is_not_anonymous()) WITH CHECK (public.is_not_anonymous());

-- Visitors (anonymous sign-in) can read and update only their own inquiry
DROP POLICY IF EXISTS "visitor_select_own_chat_inquiries" ON chat_inquiries;
CREATE POLICY "visitor_select_own_chat_inquiries"
  ON chat_inquiries FOR SELECT TO anon, authenticated
  USING (visitor_id = auth.uid());

DROP POLICY IF EXISTS "visitor_update_own_chat_inquiries" ON chat_inquiries;
CREATE POLICY "visitor_update_own_chat_inquiries"
  ON chat_inquiries FOR UPDATE TO anon, authenticated
  USING (visitor_id = auth.uid()) WITH CHECK (visitor_id = auth.uid());

-- Allow realtime on this table (no-op if already a member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_inquiries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_inquiries;
  END IF;
END $$;

-- ── Two-way chat messages ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_messages (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id    UUID         NOT NULL REFERENCES chat_inquiries(id) ON DELETE CASCADE,
  sender        TEXT         NOT NULL CHECK (sender IN ('visitor', 'admin')),
  body          TEXT         NOT NULL,
  read_by_admin BOOLEAN      NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_inquiry_id_idx
  ON chat_messages (inquiry_id, created_at);

-- RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Visitors can read/insert messages only in their own inquiry thread,
-- and only as the visitor (never impersonate the admin)
DROP POLICY IF EXISTS "visitor_select_own_chat_messages" ON chat_messages;
CREATE POLICY "visitor_select_own_chat_messages"
  ON chat_messages FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_inquiries ci
      WHERE ci.id = inquiry_id
        AND ci.visitor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "visitor_insert_own_chat_messages" ON chat_messages;
CREATE POLICY "visitor_insert_own_chat_messages"
  ON chat_messages FOR INSERT TO anon, authenticated
  WITH CHECK (
    sender = 'visitor'
    AND EXISTS (
      SELECT 1 FROM chat_inquiries ci
      WHERE ci.id = inquiry_id
        AND ci.visitor_id = auth.uid()
    )
  );

-- Admins (non-anonymous authenticated users) can read/insert/update all
DROP POLICY IF EXISTS "admin_select_chat_messages" ON chat_messages;
CREATE POLICY "admin_select_chat_messages"
  ON chat_messages FOR SELECT TO authenticated
  USING (public.is_not_anonymous());

DROP POLICY IF EXISTS "admin_insert_chat_messages" ON chat_messages;
CREATE POLICY "admin_insert_chat_messages"
  ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender = 'admin' AND public.is_not_anonymous());

DROP POLICY IF EXISTS "admin_update_chat_messages" ON chat_messages;
CREATE POLICY "admin_update_chat_messages"
  ON chat_messages FOR UPDATE TO authenticated
  USING (public.is_not_anonymous()) WITH CHECK (public.is_not_anonymous());

-- Allow realtime on this table (no-op if already a member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;
