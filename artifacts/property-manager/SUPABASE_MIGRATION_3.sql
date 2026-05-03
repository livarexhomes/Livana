-- Migration 3: Landlord avatar photo storage
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Create the landlord-avatars storage bucket (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landlord-avatars',
  'landlord-avatars',
  true,
  5242880,  -- 5 MB limit
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif'];

-- 2. Public read policy (anyone can view avatars)
CREATE POLICY "Public avatar read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'landlord-avatars');

-- 3. Authenticated landlords can upload/overwrite their own avatar
CREATE POLICY "Landlord avatar upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'landlord-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. Authenticated landlords can update (overwrite) their own avatar
CREATE POLICY "Landlord avatar update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'landlord-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. Authenticated landlords can delete their own avatar
CREATE POLICY "Landlord avatar delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'landlord-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
