-- Fix for trigger function to handle errors gracefully
-- This prevents "Database error creating new user" when the trigger fails
-- Also fixes: landlords being inserted into tenants table

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_provider   TEXT;
  v_full_name  TEXT;
  v_email      TEXT;
  v_avatar_url TEXT;
  v_role       TEXT;
BEGIN
  BEGIN
    -- Skip if this is a landlord (they have role='landlord' in metadata)
    v_role := NEW.raw_user_meta_data->>'role';
    IF v_role = 'landlord' THEN
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
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the auth transaction
    RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Also fix the landlord trigger
CREATE OR REPLACE FUNCTION public.handle_new_landlord()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    IF (NEW.raw_user_meta_data->>'whatsapp') IS NOT NULL THEN
      INSERT INTO public.landlords (user_id, full_name, whatsapp, city, bio, status, is_verified)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Landlord'),
        NEW.raw_user_meta_data->>'whatsapp',
        NEW.raw_user_meta_data->>'city',
        NEW.raw_user_meta_data->>'bio',
        'not_submitted',
        false
      )
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the auth transaction
    RAISE WARNING 'handle_new_landlord trigger error: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Recreate triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_landlord_signup ON auth.users;
CREATE TRIGGER on_landlord_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_landlord();

-- Clean up: Remove any landlords that were incorrectly added to tenants table
DELETE FROM public.tenants 
WHERE user_id IN (SELECT user_id FROM public.landlords);
