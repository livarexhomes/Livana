-- Migration 4: property-images storage bucket
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- This is required for property listing photos to upload and display correctly.

-- 1. Create the property-images bucket (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  10485760,  -- 10 MB per file
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif'];

-- 2. Public read (anyone can view property photos)
CREATE POLICY "Public property image read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

-- 3. Authenticated landlords can upload photos into their own folder
CREATE POLICY "Landlord property image upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. Landlords can update (overwrite) their own photos
CREATE POLICY "Landlord property image update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. Landlords can delete their own photos
CREATE POLICY "Landlord property image delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
