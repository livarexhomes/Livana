-- ============================================================
-- Livana — Complete Supabase Schema
-- Run this entire file in Supabase → SQL Editor
-- This is the single source of truth, consolidating all
-- migrations (SUPABASE_MIGRATION.sql through _12.sql).
-- ============================================================


-- ── Helpers ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ── landlords ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.landlords (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        TEXT        NOT NULL,
  whatsapp         TEXT        NOT NULL,
  bio              TEXT,
  avatar_url       TEXT,
  -- Location
  city             TEXT,
  -- KYC fields
  nin              TEXT,
  dob              DATE,
  id_type          TEXT,
  id_number        TEXT,
  bank_name        TEXT,
  account_number   TEXT,
  state            TEXT,
  kyc_notes        TEXT,
  kyc_submitted_at TIMESTAMPTZ,
  -- Profile extras
  years_experience TEXT,
  specialization   TEXT,
  website          TEXT,
  linkedin         TEXT,
  twitter          TEXT,
  instagram        TEXT,
  -- Status supports full KYC lifecycle
  status           TEXT        NOT NULL DEFAULT 'not_submitted'
                     CHECK (status IN ('not_submitted', 'pending', 'approved', 'rejected', 'suspended')),
  is_verified      BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns to existing deployments that predate this schema version
ALTER TABLE public.landlords ADD COLUMN IF NOT EXISTS city             TEXT;
ALTER TABLE public.landlords ADD COLUMN IF NOT EXISTS years_experience TEXT;
ALTER TABLE public.landlords ADD COLUMN IF NOT EXISTS specialization   TEXT;
ALTER TABLE public.landlords ADD COLUMN IF NOT EXISTS website          TEXT;
ALTER TABLE public.landlords ADD COLUMN IF NOT EXISTS linkedin         TEXT;
ALTER TABLE public.landlords ADD COLUMN IF NOT EXISTS twitter          TEXT;
ALTER TABLE public.landlords ADD COLUMN IF NOT EXISTS instagram        TEXT;

CREATE OR REPLACE TRIGGER landlords_updated_at
  BEFORE UPDATE ON public.landlords
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;

-- Public can read approved landlords
DROP POLICY IF EXISTS "Public can read approved landlords" ON public.landlords;
CREATE POLICY "Public can read approved landlords"
  ON public.landlords FOR SELECT
  USING (status = 'approved');

-- Landlord can read their own profile regardless of status
DROP POLICY IF EXISTS "Landlord can read own profile" ON public.landlords;
CREATE POLICY "Landlord can read own profile"
  ON public.landlords FOR SELECT
  USING (auth.uid() = user_id);

-- Landlord can insert their own profile (registration)
DROP POLICY IF EXISTS "Landlord can insert own profile" ON public.landlords;
CREATE POLICY "Landlord can insert own profile"
  ON public.landlords FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Landlord can update their own profile
DROP POLICY IF EXISTS "Landlord can update own profile" ON public.landlords;
CREATE POLICY "Landlord can update own profile"
  ON public.landlords FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins have full access
DROP POLICY IF EXISTS "Admins full access to landlords" ON public.landlords;
CREATE POLICY "Admins full access to landlords"
  ON public.landlords FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));


-- ── tenants ──────────────────────────────────────────────────
-- NOTE: status and email columns are used by AdminUsers.tsx
-- but are NOT in the original schema. Add them here.

CREATE TABLE IF NOT EXISTS public.tenants (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT        NOT NULL,
  phone      TEXT,
  email      TEXT,                          -- displayed in admin user list
  status     TEXT        NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant select own row" ON public.tenants;
CREATE POLICY "Tenant select own row"
  ON public.tenants FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Tenant insert own row" ON public.tenants;
CREATE POLICY "Tenant insert own row"
  ON public.tenants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Tenant update own row" ON public.tenants;
CREATE POLICY "Tenant update own row"
  ON public.tenants FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins full access to tenants" ON public.tenants;
CREATE POLICY "Admins full access to tenants"
  ON public.tenants FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));


-- ── admins ───────────────────────────────────────────────────
-- Mirrors auth.users for admin accounts (Migration 6).
-- NOTE: must be created before tables that reference it in policies.

CREATE TABLE IF NOT EXISTS public.admins (
  id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read admins" ON public.admins;
CREATE POLICY "Admins can read admins"
  ON public.admins FOR SELECT
  USING (auth.role() = 'authenticated');

-- Seed: promote existing auth users to admin by inserting their id+email here.
-- Example:
--   INSERT INTO public.admins (id, email)
--   SELECT id, email FROM auth.users WHERE email = 'admin@example.com'
--   ON CONFLICT (id) DO NOTHING;


-- ── properties ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.properties (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id   UUID         REFERENCES public.landlords(id) ON DELETE SET NULL,
  assigned_to   UUID         REFERENCES public.admins(id) ON DELETE SET NULL,  -- Migration 6
  title         TEXT         NOT NULL,
  description   TEXT,
  address       TEXT,                                                           -- nullable since Migration 8
  city          TEXT         NOT NULL,
  state         TEXT,                                                           -- Migration 7
  property_type TEXT,                                                           -- Migration 7
  price         NUMERIC(12,2) NOT NULL,
  bedrooms      SMALLINT     NOT NULL DEFAULT 0,
  bathrooms     SMALLINT     NOT NULL DEFAULT 0,
  area_sqft     NUMERIC(10,2),
  type          TEXT         NOT NULL CHECK (type IN ('sale', 'rent')),
  status        TEXT         NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'taken', 'coming_soon', 'under_negotiation')),
  featured      BOOLEAN      NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON public.properties(landlord_id);

CREATE OR REPLACE TRIGGER properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Anyone can read properties
DROP POLICY IF EXISTS "Public can read properties" ON public.properties;
CREATE POLICY "Public can read properties"
  ON public.properties FOR SELECT
  USING (true);

-- Landlord can insert their own properties
DROP POLICY IF EXISTS "Landlord can insert own properties" ON public.properties;
CREATE POLICY "Landlord can insert own properties"
  ON public.properties FOR INSERT
  WITH CHECK (
    landlord_id IN (
      SELECT id FROM public.landlords WHERE user_id = auth.uid()
    )
  );

-- Landlord can update their own properties
DROP POLICY IF EXISTS "Landlord can update own properties" ON public.properties;
CREATE POLICY "Landlord can update own properties"
  ON public.properties FOR UPDATE
  USING (
    landlord_id IN (SELECT id FROM public.landlords WHERE user_id = auth.uid())
  )
  WITH CHECK (
    landlord_id IN (SELECT id FROM public.landlords WHERE user_id = auth.uid())
  );

-- Landlord can delete their own properties
DROP POLICY IF EXISTS "Landlord can delete own properties" ON public.properties;
CREATE POLICY "Landlord can delete own properties"
  ON public.properties FOR DELETE
  USING (
    landlord_id IN (SELECT id FROM public.landlords WHERE user_id = auth.uid())
  );

-- Admins have full access
DROP POLICY IF EXISTS "Admins full access to properties" ON public.properties;
CREATE POLICY "Admins full access to properties"
  ON public.properties FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));


-- ── property_images ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.property_images (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  storage_path TEXT        NOT NULL,
  alt_text     TEXT,
  is_cover     BOOLEAN     NOT NULL DEFAULT false,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON public.property_images(property_id);

ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read property images" ON public.property_images;
CREATE POLICY "Anyone can read property images"
  ON public.property_images FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Landlord can insert own property images" ON public.property_images;
CREATE POLICY "Landlord can insert own property images"
  ON public.property_images FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.landlords l ON l.id = p.landlord_id
      WHERE l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Landlord can update own property images" ON public.property_images;
CREATE POLICY "Landlord can update own property images"
  ON public.property_images FOR UPDATE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.landlords l ON l.id = p.landlord_id
      WHERE l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Landlord can delete own property images" ON public.property_images;
CREATE POLICY "Landlord can delete own property images"
  ON public.property_images FOR DELETE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.landlords l ON l.id = p.landlord_id
      WHERE l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins full access to property images" ON public.property_images;
CREATE POLICY "Admins full access to property images"
  ON public.property_images FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));


-- ── saved_properties ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_properties (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, property_id)
);

ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant manage own saved properties" ON public.saved_properties;
CREATE POLICY "Tenant manage own saved properties"
  ON public.saved_properties FOR ALL
  USING (
    tenant_id = (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id = (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );


-- ── enquiries ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.enquiries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id UUID        REFERENCES public.landlords(id) ON DELETE SET NULL,
  message     TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'replied', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER enquiries_updated_at
  BEFORE UPDATE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant select own enquiries" ON public.enquiries;
CREATE POLICY "Tenant select own enquiries"
  ON public.enquiries FOR SELECT
  USING (
    tenant_id = (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Tenant insert own enquiry" ON public.enquiries;
CREATE POLICY "Tenant insert own enquiry"
  ON public.enquiries FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Landlord select enquiries for own properties" ON public.enquiries;
CREATE POLICY "Landlord select enquiries for own properties"
  ON public.enquiries FOR SELECT
  USING (
    landlord_id = (SELECT id FROM public.landlords WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Landlord update enquiry status" ON public.enquiries;
CREATE POLICY "Landlord update enquiry status"
  ON public.enquiries FOR UPDATE
  USING (
    landlord_id = (SELECT id FROM public.landlords WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins full access to enquiries" ON public.enquiries;
CREATE POLICY "Admins full access to enquiries"
  ON public.enquiries FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));


-- ── enquiry_replies ──────────────────────────────────────────
-- Stores landlord replies to tenant enquiries

CREATE TABLE IF NOT EXISTS public.enquiry_replies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id  UUID        NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  landlord_id UUID        NOT NULL REFERENCES public.landlords(id) ON DELETE CASCADE,
  message     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enquiry_replies_enquiry ON public.enquiry_replies(enquiry_id);

ALTER TABLE public.enquiry_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Landlord insert own replies" ON public.enquiry_replies;
CREATE POLICY "Landlord insert own replies"
  ON public.enquiry_replies FOR INSERT
  WITH CHECK (
    landlord_id = (SELECT id FROM public.landlords WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Landlord select own replies" ON public.enquiry_replies;
CREATE POLICY "Landlord select own replies"
  ON public.enquiry_replies FOR SELECT
  USING (
    landlord_id = (SELECT id FROM public.landlords WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Tenant select replies on own enquiries" ON public.enquiry_replies;
CREATE POLICY "Tenant select replies on own enquiries"
  ON public.enquiry_replies FOR SELECT
  USING (
    enquiry_id IN (
      SELECT id FROM public.enquiries
      WHERE tenant_id = (SELECT id FROM public.tenants WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins full access to enquiry_replies" ON public.enquiry_replies;
CREATE POLICY "Admins full access to enquiry_replies"
  ON public.enquiry_replies FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));


-- ── contact_messages ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  role       TEXT,
  subject    TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert contact message" ON public.contact_messages;
CREATE POLICY "Public insert contact message"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read contact messages" ON public.contact_messages;
CREATE POLICY "Admins read contact messages"
  ON public.contact_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));


-- ── property_comments ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.property_comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id   UUID        REFERENCES public.tenants(id) ON DELETE SET NULL,
  tenant_name TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_comments_property_id ON public.property_comments(property_id);

ALTER TABLE public.property_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read comments" ON public.property_comments;
CREATE POLICY "Anyone can read comments"
  ON public.property_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Tenants can post comments" ON public.property_comments;
CREATE POLICY "Tenants can post comments"
  ON public.property_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- ── support_tickets ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subject    TEXT        NOT NULL,
  priority   TEXT        NOT NULL DEFAULT 'normal'
               CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status     TEXT        NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON public.support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants manage own tickets" ON public.support_tickets;
CREATE POLICY "Tenants manage own tickets"
  ON public.support_tickets FOR ALL
  USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins full access to tickets" ON public.support_tickets;
CREATE POLICY "Admins full access to tickets"
  ON public.support_tickets FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));


-- ── support_messages ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.support_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID        NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_role TEXT        NOT NULL CHECK (sender_role IN ('tenant', 'admin')),
  body        TEXT        NOT NULL DEFAULT '',
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add image_url if upgrading an existing database
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants read own ticket messages" ON public.support_messages;
CREATE POLICY "Tenants read own ticket messages"
  ON public.support_messages FOR SELECT
  USING (
    ticket_id IN (
      SELECT st.id FROM public.support_tickets st
      JOIN public.tenants t ON t.id = st.tenant_id
      WHERE t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tenants send messages on own tickets" ON public.support_messages;
CREATE POLICY "Tenants send messages on own tickets"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    sender_role = 'tenant'
    AND ticket_id IN (
      SELECT st.id FROM public.support_tickets st
      JOIN public.tenants t ON t.id = st.tenant_id
      WHERE t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins full access to messages" ON public.support_messages;
CREATE POLICY "Admins full access to messages"
  ON public.support_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- Auto-bump ticket updated_at when a message is added
CREATE OR REPLACE FUNCTION public.update_ticket_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.support_tickets SET updated_at = NOW() WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_message_update_ticket ON public.support_messages;
CREATE TRIGGER trg_support_message_update_ticket
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_ticket_updated_at();

-- Enable Realtime (safe to run even if already added)
DO $$
DECLARE
  tables TEXT[] := ARRAY['support_messages','support_tickets','enquiries','tenants','landlords'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END;
$$;


-- ── Storage buckets ──────────────────────────────────────────

-- property-images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images', 'property-images', true,
  10485760,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif'];

DROP POLICY IF EXISTS "Public property image read" ON storage.objects;
CREATE POLICY "Public property image read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

-- Upload path: {user_id}/{property_id}/{filename}
DROP POLICY IF EXISTS "Landlord property image upload" ON storage.objects;
CREATE POLICY "Landlord property image upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Landlord property image update" ON storage.objects;
CREATE POLICY "Landlord property image update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Landlord property image delete" ON storage.objects;
CREATE POLICY "Landlord property image delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- landlord-avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landlord-avatars', 'landlord-avatars', true,
  5242880,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif'];

DROP POLICY IF EXISTS "Public avatar read" ON storage.objects;
CREATE POLICY "Public avatar read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'landlord-avatars');

DROP POLICY IF EXISTS "Landlord avatar upload" ON storage.objects;
CREATE POLICY "Landlord avatar upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'landlord-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Landlord avatar update" ON storage.objects;
CREATE POLICY "Landlord avatar update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'landlord-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Landlord avatar delete" ON storage.objects;
CREATE POLICY "Landlord avatar delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'landlord-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- project-images
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read project images" ON storage.objects;
CREATE POLICY "Public read project images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-images');

DROP POLICY IF EXISTS "Authenticated upload project images" ON storage.objects;
CREATE POLICY "Authenticated upload project images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update project images" ON storage.objects;
CREATE POLICY "Authenticated update project images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'project-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete project images" ON storage.objects;
CREATE POLICY "Authenticated delete project images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-images' AND auth.role() = 'authenticated');

-- support-attachments (chat image uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments', 'support-attachments', true,
  10485760,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif'];

DROP POLICY IF EXISTS "Public support attachment read" ON storage.objects;
CREATE POLICY "Public support attachment read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'support-attachments');

DROP POLICY IF EXISTS "Authenticated support attachment upload" ON storage.objects;
CREATE POLICY "Authenticated support attachment upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'support-attachments' AND auth.role() = 'authenticated');
