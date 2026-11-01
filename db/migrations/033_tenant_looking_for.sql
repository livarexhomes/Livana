-- Store each tenant's property search preference.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS looking_for TEXT;

-- Keep the new self-service field within the existing tenant profile update guard.
CREATE OR REPLACE FUNCTION public.guard_tenant_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  profile_columns CONSTANT TEXT[] := ARRAY[
    'full_name',
    'phone',
    'email',
    'avatar_url',
    'provider',
    'city',
    'marital_status',
    'occupation',
    'employment_type',
    'household_size',
    'move_in_timeline',
    'looking_for',
    'updated_at'
  ];
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - profile_columns) IS DISTINCT FROM (to_jsonb(OLD) - profile_columns) THEN
    RAISE EXCEPTION 'Tenant updates may only change profile fields'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
