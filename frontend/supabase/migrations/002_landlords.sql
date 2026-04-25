-- ============================================================
-- Landlords table
-- Links to Supabase auth.users via user_id
-- ============================================================
create table if not exists public.landlords (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  full_name     text not null,
  whatsapp      text not null,
  bio           text,
  avatar_url    text,
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  is_verified   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger landlords_updated_at
  before update on public.landlords
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- Link properties to landlords
-- ============================================================
alter table public.properties
  add column if not exists landlord_id uuid references public.landlords(id) on delete set null;

create index if not exists properties_landlord_id_idx on public.properties(landlord_id);

-- ============================================================
-- Row-Level Security for landlords
-- ============================================================
alter table public.landlords enable row level security;

-- Public can read approved landlords
create policy "Public can read approved landlords"
  on public.landlords for select
  using (status = 'approved');

-- Landlord can read their own profile regardless of status
create policy "Landlord can read own profile"
  on public.landlords for select
  using (auth.uid() = user_id);

-- Landlord can update their own profile
create policy "Landlord can update own profile"
  on public.landlords for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Landlord can insert their own profile (registration)
create policy "Landlord can insert own profile"
  on public.landlords for insert
  with check (auth.uid() = user_id);

-- Authenticated admin can manage all landlords
-- (Admin is identified by a custom claim set in Supabase dashboard)
create policy "Admin can manage all landlords"
  on public.landlords for all
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

-- ============================================================
-- Update properties RLS: landlords can only manage own listings
-- ============================================================

-- Drop the broad authenticated policy and replace with scoped ones
drop policy if exists "Authenticated users can manage properties" on public.properties;

-- Admin can manage all properties
create policy "Admin can manage all properties"
  on public.properties for all
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

-- Approved landlord can manage their own properties
create policy "Landlord can manage own properties"
  on public.properties for all
  using (
    landlord_id in (
      select id from public.landlords
      where user_id = auth.uid() and status = 'approved'
    )
  )
  with check (
    landlord_id in (
      select id from public.landlords
      where user_id = auth.uid() and status = 'approved'
    )
  );

-- ============================================================
-- Storage bucket for landlord avatars (run manually in dashboard)
-- ============================================================
-- insert into storage.buckets (id, name, public)
-- values ('avatars', 'avatars', true)
-- on conflict do nothing;
