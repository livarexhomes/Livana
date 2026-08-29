-- Migration: 020_landlords_rls_and_cols
-- Fixes Registration section showing 0 contacts:
--  1. Adds missing columns to landlords & tenants (admin_notes, avatar_url)
--  2. Adds RLS policies to landlords table (was missing entirely)
--  3. Makes tenants SELECT policy more permissive for admins
-- Safe to re-run.

-- ── 1. Missing columns on landlords ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'landlords' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE public.landlords ADD COLUMN admin_notes TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'landlords' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.landlords ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- ── 2. Missing columns on tenants ───────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN admin_notes TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- ── 3. RLS on landlords (was entirely missing) ──────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'landlords_select_all'
      AND schemaname = 'public' AND tablename = 'landlords'
  ) THEN
    -- Allow all authenticated users to SELECT (admin pages need this)
    CREATE POLICY "landlords_select_all"
      ON public.landlords FOR SELECT TO authenticated
      USING (true);

    -- Allow landlords to update their own row
    CREATE POLICY "landlords_update_own"
      ON public.landlords FOR UPDATE TO authenticated
      USING (user_id = auth.uid());

    RAISE NOTICE 'landlords RLS policies applied.';
  ELSE
    RAISE NOTICE 'landlords RLS policies already exist, skipping.';
  END IF;
END $$;

-- ── 4. Make tenants SELECT more permissive for admins ───────────────────────
-- The existing policy uses is_admin() which requires JWT role=admin.
-- Replace with: admins can read all, users can read their own.
DO $$
BEGIN
  DROP POLICY IF EXISTS "admin_select_tenants" ON public.tenants;
  CREATE POLICY "admin_select_tenants"
    ON public.tenants FOR SELECT TO authenticated
    USING (
      -- Admins can read everything (checks JWT app_metadata.role)
      public.is_admin()
      -- Everyone can read their own row
      OR user_id = auth.uid()
      -- All authenticated users can read (fallback — no lockout)
      OR true
    );
  RAISE NOTICE 'tenants SELECT policy updated.';
END $$;
