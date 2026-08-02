-- Migration: support, enquiries, and contact tables
--
-- Creates the tables used by the Support Dashboard, notification bell, contact
-- form, property enquiries, and admin notification emails. Safe to re-run.
--
-- Apply with:
--   psql "$DATABASE_URL" -f db/migrations/003_support_and_contact.sql
-- or:
--   supabase db push --file db/migrations/003_support_and_contact.sql

-- ── enquiries ─────────────────────────────────────────────────────────────────
-- Property inspection / enquiry requests from tenants (and anonymous visitors).

CREATE TABLE IF NOT EXISTS public.enquiries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  landlord_id UUID REFERENCES public.landlords(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  name        TEXT,
  email       TEXT,
  phone       TEXT,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('new', 'open', 'replied', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enquiries_property_id_idx ON public.enquiries (property_id);
CREATE INDEX IF NOT EXISTS enquiries_landlord_id_idx ON public.enquiries (landlord_id);
CREATE INDEX IF NOT EXISTS enquiries_status_idx       ON public.enquiries (status);

CREATE OR REPLACE FUNCTION update_enquiries_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_enquiries_updated_at ON public.enquiries;
CREATE TRIGGER trg_enquiries_updated_at
  BEFORE UPDATE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION update_enquiries_updated_at();

-- ── enquiry_replies ───────────────────────────────────────────────────────────
-- Admin / landlord replies to an enquiry thread.

CREATE TABLE IF NOT EXISTS public.enquiry_replies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id  UUID NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  landlord_id UUID REFERENCES public.landlords(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'landlord'
              CHECK (sender_role IN ('landlord', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enquiry_replies_enquiry_id_idx ON public.enquiry_replies (enquiry_id);

-- ── support_tickets ───────────────────────────────────────────────────────────
-- User-initiated support requests (tenant or landlord).

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject     TEXT NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'normal'
              CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  tenant_id   UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  landlord_id UUID REFERENCES public.landlords(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS support_tickets_tenant_id_idx ON public.support_tickets (tenant_id);
CREATE INDEX IF NOT EXISTS support_tickets_landlord_id_idx ON public.support_tickets (landlord_id);

CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_support_tickets_updated_at();

-- ── support_messages ──────────────────────────────────────────────────────────
-- Per-ticket chat thread.

CREATE TABLE IF NOT EXISTS public.support_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('tenant', 'landlord', 'admin')),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_ticket_id_idx ON public.support_messages (ticket_id, created_at);

-- ── contact_messages ──────────────────────────────────────────────────────────
-- Contact-page form submissions (also used by the property-alert signup form).

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  role       TEXT,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON public.contact_messages (created_at);

-- ── admins (join target for enquiry_replies.admins.email) ─────────────────────
-- Lightweight table of admin users so the support UI can resolve sender names.
-- Real admin rows are populated via the Admin Users page / dashboard.

CREATE TABLE IF NOT EXISTS public.admins (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Anonymous visitors can submit enquiries + contact messages. Authenticated
-- users (tenants/landlords/admins) can read and update their own threads;
-- non-anonymous users (admins) can read/update everything.

CREATE OR REPLACE FUNCTION public.is_not_anonymous()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'is_anonymous') IS DISTINCT FROM 'true';
$$;

-- enquiries
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_enquiries" ON public.enquiries;
CREATE POLICY "anon_insert_enquiries"
  ON public.enquiries FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_enquiries" ON public.enquiries;
CREATE POLICY "auth_select_enquiries"
  ON public.enquiries FOR SELECT TO authenticated
  USING (public.is_not_anonymous() OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "auth_update_enquiries" ON public.enquiries;
CREATE POLICY "auth_update_enquiries"
  ON public.enquiries FOR UPDATE TO authenticated
  USING (public.is_not_anonymous());

-- enquiry_replies
ALTER TABLE public.enquiry_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_enquiry_replies" ON public.enquiry_replies;
CREATE POLICY "auth_select_enquiry_replies"
  ON public.enquiry_replies FOR SELECT TO authenticated
  USING (public.is_not_anonymous());

DROP POLICY IF EXISTS "auth_insert_enquiry_replies" ON public.enquiry_replies;
CREATE POLICY "auth_insert_enquiry_replies"
  ON public.enquiry_replies FOR INSERT TO authenticated
  WITH CHECK (public.is_not_anonymous());

-- support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_support_tickets" ON public.support_tickets;
CREATE POLICY "anon_insert_support_tickets"
  ON public.support_tickets FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_support_tickets" ON public.support_tickets;
CREATE POLICY "auth_select_support_tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (
    public.is_not_anonymous()
    OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
    OR landlord_id IN (SELECT id FROM public.landlords WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "auth_update_support_tickets" ON public.support_tickets;
CREATE POLICY "auth_update_support_tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_not_anonymous());

-- support_messages
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_support_messages" ON public.support_messages;
CREATE POLICY "anon_insert_support_messages"
  ON public.support_messages FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_support_messages" ON public.support_messages;
CREATE POLICY "auth_select_support_messages"
  ON public.support_messages FOR SELECT TO authenticated
  USING (
    public.is_not_anonymous()
    OR EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = support_messages.ticket_id
        AND (st.tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
          OR st.landlord_id IN (SELECT id FROM public.landlords WHERE user_id = auth.uid()))
    )
  );

-- contact_messages
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_contact_messages" ON public.contact_messages;
CREATE POLICY "anon_insert_contact_messages"
  ON public.contact_messages FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_contact_messages" ON public.contact_messages;
CREATE POLICY "auth_select_contact_messages"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (public.is_not_anonymous());

-- admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_admins" ON public.admins;
CREATE POLICY "auth_select_admins"
  ON public.admins FOR SELECT TO authenticated
  USING (public.is_not_anonymous());

DROP POLICY IF EXISTS "auth_insert_admins" ON public.admins;
CREATE POLICY "auth_insert_admins"
  ON public.admins FOR INSERT TO authenticated
  WITH CHECK (public.is_not_anonymous());

DROP POLICY IF EXISTS "auth_update_admins" ON public.admins;
CREATE POLICY "auth_update_admins"
  ON public.admins FOR UPDATE TO authenticated
  USING (public.is_not_anonymous());

-- ── Realtime ───────────────────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['enquiries','enquiry_replies','support_tickets','support_messages','contact_messages']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;
