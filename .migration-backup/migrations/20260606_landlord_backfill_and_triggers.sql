-- Migration: Landlord trigger fixes, idempotent backfill, and admin seeding
-- Run this in Supabase → SQL Editor
-- Safe to re-run; statements are idempotent where possible

-- 1) Ensure admins table exists (safe to run)
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE
);

-- 2) Tenant auto-create trigger (skip landlords/admins)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_provider   TEXT;
  v_full_name  TEXT;
  v_email      TEXT;
  v_avatar_url TEXT;
  v_role       TEXT;
BEGIN
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.raw_app_meta_data->>'role'
  );

  -- Skip admin/landlord signups so they are not stored as tenants.
  IF v_role IN ('landlord', 'admin') OR (
       (NEW.raw_user_meta_data->>'whatsapp') IS NOT NULL
    OR (NEW.raw_user_meta_data->>'phone') IS NOT NULL
    OR (NEW.raw_user_meta_data->>'phone_number') IS NOT NULL
    OR (NEW.raw_user_meta_data->'user_metadata'->>'whatsapp') IS NOT NULL
  ) THEN
    RETURN NEW;
  END IF;

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

-- Attach tenant trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Landlord auto-create trigger (checks multiple metadata shapes)
CREATE OR REPLACE FUNCTION public.handle_new_landlord()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
       (NEW.raw_user_meta_data->>'whatsapp') IS NOT NULL
    OR (NEW.raw_user_meta_data->>'phone') IS NOT NULL
    OR (NEW.raw_user_meta_data->>'phone_number') IS NOT NULL
    OR (NEW.raw_user_meta_data->'user_metadata'->>'whatsapp') IS NOT NULL
  ) THEN
    INSERT INTO public.landlords (user_id, full_name, whatsapp, city, bio, status, is_verified)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Landlord'),
      COALESCE(NEW.raw_user_meta_data->>'whatsapp', COALESCE(NEW.raw_user_meta_data->>'phone', COALESCE(NEW.raw_user_meta_data->>'phone_number', ''))),
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'bio',
      'not_submitted',
      false
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach landlord trigger
DROP TRIGGER IF EXISTS on_landlord_signup ON auth.users;
CREATE TRIGGER on_landlord_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_landlord();

-- 4) Fixed admin notification function (avoid referencing obsolete columns)
CREATE OR REPLACE FUNCTION public.notify_admin_on_event()
RETURNS TRIGGER AS $$
DECLARE
  settings JSONB;
  event_type TEXT;
  subject TEXT;
  body TEXT;
BEGIN
  IF TG_TABLE_NAME = 'landlords' THEN
    event_type := 'new_landlord';
  ELSIF TG_TABLE_NAME = 'enquiries' THEN
    event_type := 'new_enquiry';
  ELSIF TG_TABLE_NAME = 'properties' THEN
    event_type := 'new_property';
  ELSE
    RETURN NEW;
  END IF;

  SELECT value INTO settings FROM public.admin_settings WHERE key = 'notifications';

  IF NOT COALESCE(
      CASE event_type
        WHEN 'new_landlord' THEN (settings->>'newLandlord')::boolean
        WHEN 'new_enquiry' THEN (settings->>'newEnquiry')::boolean
        WHEN 'new_property' THEN (settings->>'newProperty')::boolean
        ELSE false
      END, false) THEN
    RETURN NEW;
  END IF;

  -- build simple JSON body
  CASE event_type
    WHEN 'new_landlord' THEN
      subject := 'New Landlord Registration';
      body := json_build_object('type','new_landlord','landlordId',NEW.id,'landlordName',NEW.full_name,'landlordUserId',NEW.user_id,'timestamp',NOW())::text;
    WHEN 'new_enquiry' THEN
      subject := 'New Property Enquiry';
      body := json_build_object('type','new_enquiry','enquiryId',NEW.id,'propertyId',NEW.property_id,'tenantId',NEW.tenant_id,'timestamp',NOW())::text;
    WHEN 'new_property' THEN
      subject := 'New Property Listed';
      body := json_build_object('type','new_property','propertyId',NEW.id,'propertyTitle',NEW.title,'landlordId',NEW.landlord_id,'timestamp',NOW())::text;
  END CASE;

  INSERT INTO public.admin_email_notifications (admin_id, type, subject, body, status)
  SELECT id, event_type, subject, body, 'pending' FROM public.admins;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach notification triggers (idempotent)
DROP TRIGGER IF EXISTS notify_on_new_landlord ON public.landlords;
CREATE TRIGGER notify_on_new_landlord
  AFTER INSERT ON public.landlords
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_event();

DROP TRIGGER IF EXISTS notify_on_new_enquiry ON public.enquiries;
CREATE TRIGGER notify_on_new_enquiry
  AFTER INSERT ON public.enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_event();

DROP TRIGGER IF EXISTS notify_on_new_property ON public.properties;
CREATE TRIGGER notify_on_new_property
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_event();

-- 5) Idempotent backfill: create landlord rows for auth.users with contact metadata or landlord role
INSERT INTO public.landlords (user_id, full_name, whatsapp, city, bio, status, is_verified)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Landlord'),
  COALESCE(
    u.raw_user_meta_data->>'whatsapp',
    COALESCE(u.raw_user_meta_data->>'phone', u.raw_user_meta_data->>'phone_number', '')
  ),
  u.raw_user_meta_data->>'city',
  u.raw_user_meta_data->>'bio',
  COALESCE(u.raw_user_meta_data->>'status', 'not_submitted'),
  COALESCE((u.raw_user_meta_data->>'is_verified')::boolean, false)
FROM auth.users u
WHERE (
    (u.raw_user_meta_data->>'whatsapp') IS NOT NULL
 OR (u.raw_user_meta_data->>'phone') IS NOT NULL
 OR (u.raw_user_meta_data->>'phone_number') IS NOT NULL
 OR (u.raw_user_meta_data->'user_metadata'->>'whatsapp') IS NOT NULL
 OR (u.raw_user_meta_data->>'role' = 'landlord')
)
  AND NOT EXISTS (SELECT 1 FROM public.landlords l WHERE l.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- 6) Seed admin by email (id pulled from auth.users). Replace the email below if needed.
INSERT INTO public.admins (id, email)
SELECT id, email FROM auth.users WHERE email = 'admin@livarex.com'
ON CONFLICT (id) DO NOTHING;

-- 7) Verify counts (optional — will output rows)
SELECT 'Landlords' as table_name, COUNT(*) as count FROM public.landlords;
SELECT 'Admins' as table_name, COUNT(*) as count FROM public.admins;

-- End migration
