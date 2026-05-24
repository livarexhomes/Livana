-- ============================================================
-- Livana Migration 11 — Support Tickets & Live Chat
-- Run this in Supabase → SQL Editor
-- ============================================================

-- 1. Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'normal'
                CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- 2. Support messages (the live chat thread per ticket)
CREATE TABLE IF NOT EXISTS support_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('tenant', 'admin')),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);

-- 3. Auto-update updated_at on tickets when a new message arrives
CREATE OR REPLACE FUNCTION update_ticket_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE support_tickets SET updated_at = NOW() WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_message_update_ticket ON support_messages;
CREATE TRIGGER trg_support_message_update_ticket
  AFTER INSERT ON support_messages
  FOR EACH ROW EXECUTE FUNCTION update_ticket_updated_at();

-- 4. Row Level Security
ALTER TABLE support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Tenants: full access to their own tickets
CREATE POLICY "Tenants manage own tickets"
  ON support_tickets FOR ALL
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    )
  );

-- Tenants: read/insert messages on their own tickets
CREATE POLICY "Tenants read own ticket messages"
  ON support_messages FOR SELECT
  USING (
    ticket_id IN (
      SELECT st.id FROM support_tickets st
      JOIN tenants t ON t.id = st.tenant_id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants send messages on own tickets"
  ON support_messages FOR INSERT
  WITH CHECK (
    sender_role = 'tenant'
    AND ticket_id IN (
      SELECT st.id FROM support_tickets st
      JOIN tenants t ON t.id = st.tenant_id
      WHERE t.user_id = auth.uid()
    )
  );

-- Admins: full access (admins.id references auth.users.id directly)
CREATE POLICY "Admins full access to tickets"
  ON support_tickets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

CREATE POLICY "Admins full access to messages"
  ON support_messages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- 5. Enable Realtime on support_messages so the chat is live
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
