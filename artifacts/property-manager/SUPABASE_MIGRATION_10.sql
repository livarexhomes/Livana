-- Migration 10: Fix property-images storage upload policy
-- The previous policy required the first path segment to match auth.uid(),
-- but uploads use paths like properties/{propertyId}/... which never matched.
-- Run this in the Supabase SQL Editor.

-- Drop the old restrictive policies
DROP POLICY IF EXISTS "Landlord property image upload" ON storage.objects;
DROP POLICY IF EXISTS "Landlord property image update" ON storage.objects;
DROP POLICY IF EXISTS "Landlord property image delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated property image upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated property image update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated property image delete" ON storage.objects;

-- Allow any authenticated user to upload/update/delete in property-images bucket
CREATE POLICY "Authenticated property image upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated property image update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated property image delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');
