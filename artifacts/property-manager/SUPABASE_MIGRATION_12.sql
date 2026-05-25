-- Migration 12: RLS policies for properties and property_images
-- Fixes IDOR vulnerability: without these policies any authenticated user
-- could update or delete any property row via the Supabase client.
-- Run this in Supabase → SQL Editor.

-- ── properties ────────────────────────────────────────────────────────────────

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can read published properties.
DROP POLICY IF EXISTS "Public can read properties" ON public.properties;
CREATE POLICY "Public can read properties"
  ON public.properties FOR SELECT
  USING (true);

-- A landlord can insert properties only for themselves.
DROP POLICY IF EXISTS "Landlord can insert own properties" ON public.properties;
CREATE POLICY "Landlord can insert own properties"
  ON public.properties FOR INSERT
  WITH CHECK (
    landlord_id IN (
      SELECT id FROM public.landlords WHERE user_id = auth.uid()
    )
  );

-- A landlord can update only their own properties.
DROP POLICY IF EXISTS "Landlord can update own properties" ON public.properties;
CREATE POLICY "Landlord can update own properties"
  ON public.properties FOR UPDATE
  USING (
    landlord_id IN (
      SELECT id FROM public.landlords WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    landlord_id IN (
      SELECT id FROM public.landlords WHERE user_id = auth.uid()
    )
  );

-- A landlord can delete only their own properties.
DROP POLICY IF EXISTS "Landlord can delete own properties" ON public.properties;
CREATE POLICY "Landlord can delete own properties"
  ON public.properties FOR DELETE
  USING (
    landlord_id IN (
      SELECT id FROM public.landlords WHERE user_id = auth.uid()
    )
  );

-- Admins have full access.
DROP POLICY IF EXISTS "Admins full access to properties" ON public.properties;
CREATE POLICY "Admins full access to properties"
  ON public.properties FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

-- ── property_images ───────────────────────────────────────────────────────────
-- Replace the overly-permissive "any authenticated user" policies from
-- Migration 9 with ownership-scoped ones.

-- Read: public (images are displayed on listing pages).
DROP POLICY IF EXISTS "Anyone can read property images" ON public.property_images;
CREATE POLICY "Anyone can read property images"
  ON public.property_images FOR SELECT
  USING (true);

-- Insert: only the landlord who owns the property.
DROP POLICY IF EXISTS "Authenticated can insert property images" ON public.property_images;
DROP POLICY IF EXISTS "Landlord can insert own property images" ON public.property_images;
CREATE POLICY "Landlord can insert own property images"
  ON public.property_images FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.landlords l ON l.id = p.landlord_id
      WHERE l.user_id = auth.uid()
    )
  );

-- Update: only the owning landlord.
DROP POLICY IF EXISTS "Landlord can update own property images" ON public.property_images;
CREATE POLICY "Landlord can update own property images"
  ON public.property_images FOR UPDATE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.landlords l ON l.id = p.landlord_id
      WHERE l.user_id = auth.uid()
    )
  );

-- Delete: only the owning landlord.
DROP POLICY IF EXISTS "Authenticated can delete property images" ON public.property_images;
DROP POLICY IF EXISTS "Landlord can delete own property images" ON public.property_images;
CREATE POLICY "Landlord can delete own property images"
  ON public.property_images FOR DELETE
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.landlords l ON l.id = p.landlord_id
      WHERE l.user_id = auth.uid()
    )
  );

-- Admins have full access.
DROP POLICY IF EXISTS "Admins full access to property images" ON public.property_images;
CREATE POLICY "Admins full access to property images"
  ON public.property_images FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

-- ── storage.objects (property-images bucket) ──────────────────────────────────
-- Replace the "any authenticated user" storage policies from Migration 10
-- with per-landlord ownership checks. Upload paths follow the pattern:
--   {user_id}/{property_id}/{filename}
-- so the first folder segment is the uploader's auth.uid().

DROP POLICY IF EXISTS "Authenticated property image upload" ON storage.objects;
CREATE POLICY "Landlord property image upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Authenticated property image update" ON storage.objects;
CREATE POLICY "Landlord property image update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Authenticated property image delete" ON storage.objects;
CREATE POLICY "Landlord property image delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
