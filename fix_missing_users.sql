-- Fix: Backfill users into tenants/landlords tables
-- Run this in Supabase SQL Editor

-- 1. First, check what's in auth.users vs public.tenants
SELECT 
  'Auth users' as source,
  COUNT(*) as count
FROM auth.users

UNION ALL

SELECT 
  'Tenants table' as source,
  COUNT(*) as count
FROM public.tenants

UNION ALL

SELECT 
  'Landlords table' as source,
  COUNT(*) as count
FROM public.landlords;

-- 2. Backfill: Create tenant rows for auth users who don't have one
-- (Exclude landlords and admins)
INSERT INTO public.tenants (user_id, full_name, email, avatar_url, provider)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'User'),
  u.email,
  COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
  COALESCE(u.raw_app_meta_data->>'provider', 'email')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.landlords l WHERE l.user_id = u.id)
  AND (u.raw_user_meta_data->>'role' IS NULL OR u.raw_user_meta_data->>'role' != 'landlord')
  AND (u.raw_app_meta_data->>'role' IS NULL OR u.raw_app_meta_data->>'role' != 'admin')
ON CONFLICT (user_id) DO NOTHING;

-- 3. Verify tenants were created
SELECT COUNT(*) as tenant_count FROM public.tenants;

-- 4. Check landlords
SELECT COUNT(*) as landlord_count FROM public.landlords;

-- 5. If landlords are missing their rows, backfill them too:
-- (This handles landlords created via the API that might not have rows)
INSERT INTO public.landlords (user_id, full_name, whatsapp, city, bio, status, is_verified)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Landlord'),
  COALESCE(u.raw_user_meta_data->>'whatsapp', ''),
  u.raw_user_meta_data->>'city',
  u.raw_user_meta_data->>'bio',
  'not_submitted',
  false
FROM auth.users u
WHERE (u.raw_user_meta_data->>'role' = 'landlord' OR u.raw_user_meta_data->>'whatsapp' IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM public.landlords l WHERE l.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;
