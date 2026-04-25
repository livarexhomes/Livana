-- ============================================================
-- Properties table
-- ============================================================
create table if not exists public.properties (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  address     text not null,
  city        text not null,
  price       numeric(12, 2) not null,
  bedrooms    smallint not null default 0,
  bathrooms   smallint not null default 0,
  area_sqft   numeric(10, 2),
  type        text not null check (type in ('sale', 'rent')),
  status      text not null default 'available' check (status in ('available', 'unavailable', 'pending')),
  featured    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at on row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger properties_updated_at
  before update on public.properties
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- Property images table
-- ============================================================
create table if not exists public.property_images (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,   -- path inside the Supabase storage bucket
  alt_text    text,
  is_cover    boolean not null default false,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now()
);

create index on public.property_images(property_id);

-- ============================================================
-- Availability / calendar table
-- ============================================================
create table if not exists public.availability (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  date        date not null,
  is_blocked  boolean not null default true,
  note        text,
  created_at  timestamptz not null default now(),
  unique (property_id, date)
);

create index on public.availability(property_id);

-- ============================================================
-- Row-Level Security
-- ============================================================

-- Properties: public read, authenticated write
alter table public.properties enable row level security;

create policy "Public can read properties"
  on public.properties for select
  using (true);

create policy "Authenticated users can manage properties"
  on public.properties for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Property images: same pattern
alter table public.property_images enable row level security;

create policy "Public can read property images"
  on public.property_images for select
  using (true);

create policy "Authenticated users can manage property images"
  on public.property_images for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Availability: same pattern
alter table public.availability enable row level security;

create policy "Public can read availability"
  on public.availability for select
  using (true);

create policy "Authenticated users can manage availability"
  on public.availability for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================
-- Storage bucket for property images
-- Run this in the Supabase dashboard SQL editor or via CLI:
-- ============================================================
-- insert into storage.buckets (id, name, public)
-- values ('property-images', 'property-images', true)
-- on conflict do nothing;
--
-- create policy "Public read property images"
--   on storage.objects for select
--   using (bucket_id = 'property-images');
--
-- create policy "Authenticated upload property images"
--   on storage.objects for insert
--   with check (bucket_id = 'property-images' and auth.role() = 'authenticated');
--
-- create policy "Authenticated delete property images"
--   on storage.objects for delete
--   using (bucket_id = 'property-images' and auth.role() = 'authenticated');
