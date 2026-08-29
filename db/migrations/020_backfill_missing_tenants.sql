-- Migration: 020_backfill_missing_tenants.sql
-- Backfills missing tenant/landlord rows for users who signed up before fixes were applied.

BEGIN;

-- 1. Ensure provider column exists on landlords (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'landlords' AND column_name = 'provider'
  ) THEN
    ALTER TABLE public.landlords ADD COLUMN provider TEXT DEFAULT 'email';
  END IF;
END $$;

-- 2. Backfill tenants from landlords who are missing a tenants row
--    (only uses columns that actually exist in landlords: user_id, full_name, status, created_at)
INSERT INTO public.tenants (user_id, full_name, provider, status, created_at)
SELECT
  l.user_id,
  l.full_name,
  COALESCE(l.provider, 'email'),
  COALESCE(l.status, 'not_submitted'),
  l.created_at
FROM public.landlords l
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE user_id = l.user_id)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Backfill tenants for auth.users who have no landlords row and no tenants row
INSERT INTO public.tenants (user_id, full_name, email, provider, status, created_at)
SELECT
  au.id,
  COALESCE(
    (SELECT full_name FROM public.landlords WHERE user_id = au.id LIMIT 1),
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1))
  ),
  au.email,
  CASE WHEN au.raw_app_meta_data->>'provider' = 'google' THEN 'google' ELSE 'email' END,
  'not_submitted',
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.landlords WHERE user_id = au.id)
  AND NOT EXISTS (SELECT 1 FROM public.tenants WHERE user_id = au.id)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Backfill landlords for Google OAuth tenants who have no landlords row
INSERT INTO public.landlords (user_id, full_name, provider, status, created_at)
SELECT
  t.user_id,
  t.full_name,
  COALESCE(t.provider, 'google'),
  COALESCE(t.status, 'pending'),
  t.created_at
FROM public.tenants t
WHERE NOT EXISTS (SELECT 1 FROM public.landlords WHERE user_id = t.user_id)
  AND t.provider = 'google'
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
