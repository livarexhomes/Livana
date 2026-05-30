-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Google OAuth users visible in admin dashboard
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Safe to re-run — all statements are idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add missing columns to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS email      TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS provider   TEXT NOT NULL DEFAULT 'email';

-- 2. Trigger function: auto-create/update tenant row on every auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_provider   TEXT;
  v_full_name  TEXT;
  v_email      TEXT;
  v_avatar_url TEXT;
BEGIN
  v_provider   := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  v_full_name  := COALESCE(
                    NEW.raw_user_meta_data->>'full_name',
                    NEW.raw_user_meta_data->>'name',
                    split_part(NEW.email, '@', 1),
                    'User'
                  );
  v_email      := NEW.email;
  v_avatar_url := COALESCE(
                    NEW.raw_user_meta_data->>'avatar_url',
                    NEW.raw_user_meta_data->>'picture'
                  );

  INSERT INTO public.tenants (user_id, full_name, email, avatar_url, provider)
  VALUES (NEW.id, v_full_name, v_email, v_avatar_url, v_provider)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    email      = EXCLUDED.email,
    avatar_url = COALESCE(EXCLUDED.avatar_url, tenants.avatar_url),
    provider   = EXCLUDED.provider,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- 3. Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill: create tenant rows for existing Google users with no tenant row
INSERT INTO public.tenants (user_id, full_name, email, avatar_url, provider)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1),
    'User'
  ),
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  ),
  COALESCE(u.raw_app_meta_data->>'provider', 'email')
FROM auth.users u
WHERE
  NOT EXISTS (SELECT 1 FROM public.tenants  t WHERE t.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.landlords l WHERE l.user_id = u.id)
  AND (u.raw_app_meta_data->>'role' IS NULL OR u.raw_app_meta_data->>'role' != 'admin')
ON CONFLICT (user_id) DO NOTHING;
