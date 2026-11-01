-- Store the tenant details collected during profile setup.
-- This changes table metadata and update permissions; it does not delete tenant rows.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS employment_type TEXT,
  ADD COLUMN IF NOT EXISTS household_size INTEGER,
  ADD COLUMN IF NOT EXISTS move_in_timeline TEXT;

-- Keep self-service updates from changing internal tenant fields.
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

-- Replace only this migration's trigger and policies. These DROP statements
-- remove database rules, not tenant data.
DROP TRIGGER IF EXISTS tenant_profile_updates_guard ON public.tenants;
CREATE TRIGGER tenant_profile_updates_guard
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_tenant_profile_updates();

-- Tenants can update their own profile; admins can manage tenant records.
DROP POLICY IF EXISTS "tenants_update_own" ON public.tenants;
CREATE POLICY "tenants_update_own"
  ON public.tenants FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "tenants_update_admin" ON public.tenants;
CREATE POLICY "tenants_update_admin"
  ON public.tenants FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());