-- Migration: enforce unique user_id on tenants table
-- Run in Supabase SQL Editor or: psql "$DATABASE_URL" -f db/migrations/016_tenants_user_id_unique.sql
-- Safe to re-run: DROP IF EXISTS is idempotent.

-- The tenants.user_id column must be unique — it is the primary way to link a
-- Supabase auth.users row to a tenant profile.  Several upsert operations in the
-- codebase rely on onConflict: 'user_id', and future INSERT-or-UPDATE flows
-- (e.g. Google OAuth re-logins) need this constraint to guarantee a single row
-- per user.

-- Remove any existing duplicate user_id rows before adding the constraint,
-- keeping the row with the most recent updated_at (or created_at as fallback).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_user_id_key'
  ) THEN
    RAISE NOTICE 'Constraint tenants_user_id_key already exists, skipping.';
    RETURN;
  END IF;

  -- Detect duplicates
  IF EXISTS (
    SELECT 1 FROM public.tenants GROUP BY user_id HAVING COUNT(*) > 1
  ) THEN
    RAISE WARNING 'Duplicate user_id values found in tenants — cleaning up...';

    DELETE FROM public.tenants a
    USING public.tenants b
    WHERE a.ctid < b.ctid
      AND a.user_id = b.user_id;

    RAISE NOTICE 'Duplicates cleaned up.';
  END IF;

  ALTER TABLE public.tenants
    ADD CONSTRAINT tenants_user_id_key UNIQUE (user_id);

  RAISE NOTICE 'Constraint tenants_user_id_key applied successfully.';
END $$;
