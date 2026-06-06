-- Backfill all auth.users into tenants/landlords tables
-- Run this in Supabase SQL Editor

-- 1. Create tenant rows for regular users
INSERT INTO public.tenants (user_id, full_name, email, avatar_url, provider, status)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'User'),
  u.email,
  COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
  COALESCE(u.raw_app_meta_data->>'provider', 'email'),
  'active'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.landlords l WHERE l.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Create landlord rows for users with whatsapp or role=landlord
INSERT INTO public.landlords (user_id, full_name, whatsapp, city, bio, status, is_verified)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Landlord'),
  COALESCE(u.raw_user_meta_data->>'whatsapp', ''),
  u.raw_user_meta_data->>'city',
  u.raw_user_meta_data->>'bio',
  COALESCE(u.raw_user_meta_data->>'status', 'not_submitted'),
  COALESCE((u.raw_user_meta_data->>'is_verified')::boolean, false)
FROM auth.users u
WHERE (u.raw_user_meta_data->>'whatsapp' IS NOT NULL OR u.raw_user_meta_data->>'role' = 'landlord')
  AND NOT EXISTS (SELECT 1 FROM public.landlords l WHERE l.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Verify counts
SELECT 'Tenants' as table_name, COUNT(*) as count FROM public.tenants
UNION ALL
SELECT 'Landlords', COUNT(*) FROM public.landlords;
