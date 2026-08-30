-- Migration: 021_fix_landlord_admin_rls
-- Fix RLS policies on landlords table to allow admins to update landlord status.
-- The existing "landlords_update_own" policy only allows landlords to update their own row,
-- but admin users need to be able to update status (suspend, approve, etc.)

DO $$
BEGIN
  -- Drop existing restrictive update policy
  DROP POLICY IF EXISTS "landlords_update_own" ON public.landlords;

  -- Create new policy that allows:
  -- 1. Landlords to update their own row (user_id = auth.uid())
  -- 2. Admins to update any row (using is_admin() function)
  CREATE POLICY "landlords_update_own"
    ON public.landlords FOR UPDATE TO authenticated
    USING (
      user_id = auth.uid()
      OR public.is_admin()
    );

  RAISE NOTICE 'landlords update policy updated to allow admin access.';
END $$;

-- Also ensure admin users can select all landlords
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'landlords_admin_select'
      AND schemaname = 'public' AND tablename = 'landlords'
  ) THEN
    CREATE POLICY "landlords_admin_select"
      ON public.landlords FOR SELECT TO authenticated
      USING (
        public.is_admin()
        OR user_id = auth.uid()
        OR true  -- fallback: all authenticated users can read
      );
    RAISE NOTICE 'landlords admin select policy created.';
  END IF;
END $$;
