-- Migration 010: Fix signup failure caused by landlords.whatsapp NOT NULL
-- ============================================================================
-- Root cause: the handle_new_user trigger inserts a row into public.landlords
-- for every new auth.users entry, reading whatsapp from raw_user_meta_data.
-- Regular tenant signups never supply a whatsapp value, so the insert fails
-- with "null value in column whatsapp violates not-null constraint" → HTTP 500.
--
-- Fix 1: Make whatsapp nullable so the trigger insert succeeds without it.
-- Fix 2: Recreate the trigger function to use COALESCE so it is safe even if
--         the column is later re-constrained, and to avoid inserting a landlord
--         row for users whose role is 'tenant' or 'admin'.
--
-- Run this in the Supabase SQL editor (project dashboard → SQL editor → New query).
-- ============================================================================

-- Step 1: drop the NOT NULL constraint on landlords.whatsapp
ALTER TABLE public.landlords
  ALTER COLUMN whatsapp DROP NOT NULL;

-- Step 2: recreate the handle_new_user function so it is safe regardless of
--         whether whatsapp is present in user metadata.
--         If a handle_new_user function already exists, this replaces it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role TEXT;
BEGIN
  -- Read the role from signup metadata (defaults to 'tenant')
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'tenant');

  -- Only create a landlord profile when the user explicitly signs up as a landlord.
  -- Tenant and admin signups must NOT create a landlords row.
  IF _role = 'landlord' THEN
    INSERT INTO public.landlords (user_id, full_name, whatsapp)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.raw_user_meta_data->>'whatsapp'   -- nullable; NULL is fine
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 3: ensure the trigger is attached to auth.users (create if missing,
--         replace is not supported for triggers so we drop-and-recreate).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
