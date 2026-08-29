-- Migration: contact management hub — tables, columns, and RLS
-- Run in Supabase SQL Editor or: psql "$DATABASE_URL" -f db/migrations/017_contact_management.sql
-- Safe to re-run: all ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS are idempotent.

-- ── 1. Tenants — add missing columns ─────────────────────────────────────────────
DO $$
BEGIN
  -- Email (Supabase Auth already has email; mirroring here for admin query convenience)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='email') THEN
    ALTER TABLE public.tenants ADD COLUMN email TEXT;
  END IF;

  -- Avatar URL (from Google OAuth picture or uploaded)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='avatar_url') THEN
    ALTER TABLE public.tenants ADD COLUMN avatar_url TEXT;
  END IF;

  -- OAuth provider (google, apple, email, etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='provider') THEN
    ALTER TABLE public.tenants ADD COLUMN provider TEXT DEFAULT 'email';
  END IF;

  -- Admin internal notes (private — not visible to user)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='admin_notes') THEN
    ALTER TABLE public.tenants ADD COLUMN admin_notes TEXT;
  END IF;

  -- Location / city (user-supplied or inferred)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='city') THEN
    ALTER TABLE public.tenants ADD COLUMN city TEXT;
  END IF;

  -- Status (active, new, inactive)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='status') THEN
    ALTER TABLE public.tenants ADD COLUMN status TEXT DEFAULT 'active';
  END IF;

  RAISE NOTICE 'tenants columns added.';
END $$;

-- ── 2. Landlords — add missing columns ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='landlords' AND column_name='provider') THEN
    ALTER TABLE public.landlords ADD COLUMN provider TEXT DEFAULT 'email';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='landlords' AND column_name='admin_notes') THEN
    ALTER TABLE public.landlords ADD COLUMN admin_notes TEXT;
  END IF;
  RAISE NOTICE 'landlords columns added.';
END $$;

-- ── 3. Contact notes — dedicated table for per-contact internal notes ─────────────
CREATE TABLE IF NOT EXISTS public.contact_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID NOT NULL,                          -- tenants.id or landlords.id
  contact_type TEXT NOT NULL CHECK (contact_type IN ('tenant', 'landlord')),
  author_id   UUID,                                   -- auth.users.id of admin who wrote it
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_notes_contact_idx
  ON public.contact_notes (contact_id, contact_type, created_at DESC);

-- ── 4. Contact communications — audit trail for all comms sent to a contact ────────
CREATE TABLE IF NOT EXISTS public.contact_communications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   UUID NOT NULL,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('tenant', 'landlord')),
  channel      TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'message', 'advert')),
  subject      TEXT,                                  -- email subject or advert property title
  body         TEXT,                                   -- message content
  property_id  UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  sent_by      UUID,                                   -- auth.users.id of admin who sent it
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_communications_contact_idx
  ON public.contact_communications (contact_id, contact_type, created_at DESC);

-- ── 5. RLS policies ─────────────────────────────────────────────────────────────
ALTER TABLE public.contact_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_communications ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write contact notes
CREATE POLICY IF NOT EXISTS "admin_all_contact_notes"
  ON public.contact_notes FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can read/write all communications; a user can read their own
CREATE POLICY IF NOT EXISTS "admin_all_contact_communications"
  ON public.contact_communications FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS "owner_read_contact_communications"
  ON public.contact_communications FOR SELECT TO authenticated
  USING (
    -- Allow tenant/landlord to read communications addressed to them
    (contact_type = 'tenant'   AND contact_id IN (SELECT id FROM public.tenants   WHERE user_id = auth.uid())) OR
    (contact_type = 'landlord' AND contact_id IN (SELECT id FROM public.landlords WHERE user_id = auth.uid()))
  );

-- ── 6. Enforce UNIQUE on tenants.user_id ───────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_user_id_key'
  ) THEN
    -- Clean up duplicates if any exist
    DELETE FROM public.tenants a
    USING public.tenants b
    WHERE a.ctid < b.ctid AND a.user_id = b.user_id;

    ALTER TABLE public.tenants ADD CONSTRAINT tenants_user_id_key UNIQUE (user_id);
    RAISE NOTICE 'tenants_user_id_key applied.';
  ELSE
    RAISE NOTICE 'tenants_user_id_key already exists.';
  END IF;
END $$;

-- ── 7. Existing tenants — backfill email/status from auth.users ───────────────────
-- Run separately if needed; here we do it safely so it won't fail on null constraints
DO $$
BEGIN
  -- Backfill email from auth.users where tenants.email is null
  UPDATE public.tenants t
  SET email = au.email
  FROM auth.users au
  WHERE t.user_id = au.id AND t.email IS NULL AND au.email IS NOT NULL;

  RAISE NOTICE 'tenants email backfill done.';
END $$;
