-- Migration 6: Add admins table and assigned_to column on properties
-- Run this in the Supabase SQL Editor

-- Table that mirrors auth.users for admin accounts
create table if not exists public.admins (
  id    uuid primary key references auth.users(id) on delete cascade,
  email text not null unique
);

-- Seed existing auth users who should be admins (adjust emails as needed)
insert into public.admins (id, email)
select id, email
from auth.users
on conflict (id) do nothing;

-- RLS
alter table public.admins enable row level security;

create policy "Admins can read admins"
  on public.admins for select
  using (auth.role() = 'authenticated');

-- Column on properties that references the assigned admin
alter table public.properties
  add column if not exists assigned_to uuid references public.admins(id) on delete set null;
