-- Run this in the Supabase SQL editor: https://app.supabase.com → SQL Editor

CREATE TABLE IF NOT EXISTS chat_inquiries (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT         NOT NULL,
  note        TEXT         NOT NULL,
  phone       TEXT,
  status      TEXT         NOT NULL DEFAULT 'open'
                           CHECK (status IN ('open', 'replied', 'closed')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_chat_inquiries_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_chat_inquiries_updated_at ON chat_inquiries;
CREATE TRIGGER trg_chat_inquiries_updated_at
  BEFORE UPDATE ON chat_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_chat_inquiries_updated_at();

-- RLS
ALTER TABLE chat_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous website visitors) can submit an inquiry
CREATE POLICY "anon_insert_chat_inquiries"
  ON chat_inquiries FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users (admins) can read and update
CREATE POLICY "auth_select_chat_inquiries"
  ON chat_inquiries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "auth_update_chat_inquiries"
  ON chat_inquiries FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Allow realtime on this table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_inquiries;
