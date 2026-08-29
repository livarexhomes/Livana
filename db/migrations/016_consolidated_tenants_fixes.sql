-- Migration: consolidated — tenants/landlords fixes for OAuth and admin access
-- Run in Supabase SQL Editor or: psql "$DATABASE_URL" -f db/migrations/016_consolidated_tenants_fixes.sql
-- Safe to re-run: all checks use DO $$ blocks with IF EXISTS guards.
-- Rollup: 016, 017, 018 from separate files.

-- ── 1. UNIQUE constraint on tenants.user_id ─────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_user_id_key'
  ) THEN
    RAISE NOTICE 'tenants_user_id_key already exists, skipping.';
  ELSE
    -- Remove duplicates (keep first seen, delete rest)
    IF EXISTS (
      SELECT 1 FROM public.tenants GROUP BY user_id HAVING COUNT(*) > 1
    ) THEN
      RAISE WARNING 'Duplicate user_id found in tenants — cleaning up...';
      DELETE FROM public.tenants a
      USING public.tenants b
      WHERE a.ctid < b.ctid
        AND a.user_id = b.user_id;
    END IF;

    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_user_id_key UNIQUE (user_id);

    RAISE NOTICE 'tenants_user_id_key applied.';
  END IF;
END $$;

-- ── 2. provider column on tenants ─────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'tenants'
      AND column_name  = 'provider'
  ) THEN
    RAISE NOTICE 'tenants.provider already exists, skipping.';
  ELSE
    ALTER TABLE public.tenants
      ADD COLUMN provider TEXT DEFAULT 'email'
      CHECK (provider IN ('email', 'google', 'apple', 'facebook'));

    RAISE NOTICE 'tenants.provider column added.';
  END IF;
END $$;

-- ── 3. provider column on landlords ─────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'landlords'
      AND column_name  = 'provider'
  ) THEN
    RAISE NOTICE 'landlords.provider already exists, skipping.';
  ELSE
    ALTER TABLE public.landlords
      ADD COLUMN provider TEXT DEFAULT 'email'
      CHECK (provider IN ('email', 'google', 'apple', 'facebook'));

    RAISE NOTICE 'landlords.provider column added.';
  END IF;
END $$;

-- ── 4. RLS policies on tenants ─────────────────────────────────────────────────
DO $$
BEGIN
  -- Skip if already applied (check by existence of our specific policy name)
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'admin_select_tenants'
      AND schemaname = 'public' AND tablename = 'tenants'
  ) THEN
    RAISE NOTICE 'tenants RLS policies already exist, skipping.';
  ELSE
    ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "auth_insert_tenants" ON public.tenants;
    CREATE POLICY "auth_insert_tenants"
      ON public.tenants FOR INSERT TO authenticated
      WITH CHECK (true);

    DROP POLICY IF EXISTS "admin_select_tenants" ON public.tenants;
    CREATE POLICY "admin_select_tenants"
      ON public.tenants FOR SELECT TO authenticated
      USING (public.is_admin() OR user_id = auth.uid());

    RAISE NOTICE 'tenants RLS policies applied.';
  END IF;
END $$;
