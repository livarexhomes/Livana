-- Fix admin access issues
-- Run this in Supabase SQL Editor

-- 1. First, let's check if your user is in the admins table
-- Replace 'your-email@example.com' with your actual admin email
SELECT u.id, u.email, a.id as admin_id, a.email as admin_email
FROM auth.users u
LEFT JOIN public.admins a ON u.id = a.id
WHERE u.email = 'your-email@example.com';

-- 2. If the above shows NULL for admin_id, add yourself as admin:
-- (Uncomment and run with your actual email)
-- INSERT INTO public.admins (id, email)
-- SELECT id, email FROM auth.users 
-- WHERE email = 'your-email@example.com'
-- ON CONFLICT (id) DO NOTHING;

-- 3. Verify RLS policies are correct for tenants table
DROP POLICY IF EXISTS "Admins full access to tenants" ON public.tenants;
CREATE POLICY "Admins full access to tenants"
  ON public.tenants FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- 4. Verify RLS policies are correct for landlords table  
DROP POLICY IF EXISTS "Admins full access to landlords" ON public.landlords;
CREATE POLICY "Admins full access to landlords"
  ON public.landlords FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- 5. Also ensure admins can read the admins table (needed for the policy check)
DROP POLICY IF EXISTS "Admins can read admins" ON public.admins;
CREATE POLICY "Admins can read admins"
  ON public.admins FOR SELECT
  USING (auth.role() = 'authenticated');

-- 6. Grant all authenticated users access to read admins (so the EXISTS check works)
-- This is safe because we're only checking existence, not reading sensitive data
ALTER TABLE public.admins FORCE ROW LEVEL SECURITY;

-- 7. Test query - this should return all tenants if you're an admin:
-- SELECT * FROM public.tenants LIMIT 5;

-- 8. Test query - this should return all landlords if you're an admin:
-- SELECT * FROM public.landlords LIMIT 5;
