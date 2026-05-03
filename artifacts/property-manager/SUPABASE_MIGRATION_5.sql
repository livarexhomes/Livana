-- Migration 5: Create project-images storage bucket for admin project cover photos
-- Run this in the Supabase SQL Editor

insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

-- Public read
create policy "Public read project images"
  on storage.objects for select
  using (bucket_id = 'project-images');

-- Authenticated users (admins) can upload
create policy "Authenticated upload project images"
  on storage.objects for insert
  with check (bucket_id = 'project-images' and auth.role() = 'authenticated');

-- Authenticated users can update their uploads
create policy "Authenticated update project images"
  on storage.objects for update
  using (bucket_id = 'project-images' and auth.role() = 'authenticated');

-- Authenticated users can delete uploads
create policy "Authenticated delete project images"
  on storage.objects for delete
  using (bucket_id = 'project-images' and auth.role() = 'authenticated');
