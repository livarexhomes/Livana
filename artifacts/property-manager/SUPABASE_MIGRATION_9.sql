-- Migration 9: Fix property_images visibility
-- Run this in the Supabase SQL Editor

-- 1. Create property_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.property_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  alt_text     TEXT,
  is_cover     BOOLEAN NOT NULL DEFAULT false,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_images_property_id
  ON public.property_images(property_id);

-- 2. Enable RLS and allow anyone to read rows
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read property images" ON public.property_images;
CREATE POLICY "Anyone can read property images"
  ON public.property_images FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert property images" ON public.property_images;
CREATE POLICY "Authenticated can insert property images"
  ON public.property_images FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can delete property images" ON public.property_images;
CREATE POLICY "Authenticated can delete property images"
  ON public.property_images FOR DELETE
  USING (auth.role() = 'authenticated');

-- 3. Ensure property-images storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  10485760,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. Public read policy on storage objects
DROP POLICY IF EXISTS "Public property image read" ON storage.objects;
CREATE POLICY "Public property image read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

-- 5. Authenticated users can upload/update/delete
DROP POLICY IF EXISTS "Authenticated property image upload" ON storage.objects;
CREATE POLICY "Authenticated property image upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated property image update" ON storage.objects;
CREATE POLICY "Authenticated property image update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated property image delete" ON storage.objects;
CREATE POLICY "Authenticated property image delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');
