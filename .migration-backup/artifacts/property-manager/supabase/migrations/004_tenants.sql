-- ============================================================
-- 004_tenants.sql
-- Tenant (user) layer: profiles, saved properties, enquiries
-- ============================================================

-- ── Tenants ──────────────────────────────────────────────────
-- One row per registered tenant, linked to auth.users.
create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.tenants enable row level security;

-- Tenants can read and update only their own row
create policy "tenant: select own row"
  on public.tenants for select
  using (auth.uid() = user_id);

create policy "tenant: insert own row"
  on public.tenants for insert
  with check (auth.uid() = user_id);

create policy "tenant: update own row"
  on public.tenants for update
  using (auth.uid() = user_id);

-- Admins can read all tenant rows
create policy "admin: select all tenants"
  on public.tenants for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();


-- ── Saved Properties ─────────────────────────────────────────
-- Tenants can bookmark listings. One row per (tenant, property) pair.
create table if not exists public.saved_properties (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (tenant_id, property_id)
);

alter table public.saved_properties enable row level security;

create policy "tenant: manage own saved properties"
  on public.saved_properties for all
  using (
    tenant_id = (
      select id from public.tenants where user_id = auth.uid()
    )
  )
  with check (
    tenant_id = (
      select id from public.tenants where user_id = auth.uid()
    )
  );


-- ── Enquiries ────────────────────────────────────────────────
-- Tenants send enquiries about specific properties.
-- Landlords and admins can read enquiries directed at them.
create type public.enquiry_status as enum ('open', 'replied', 'closed');

create table if not exists public.enquiries (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  landlord_id uuid references public.landlords(id) on delete set null,
  message     text not null,
  status      public.enquiry_status not null default 'open',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.enquiries enable row level security;

-- Tenants see their own enquiries
create policy "tenant: select own enquiries"
  on public.enquiries for select
  using (
    tenant_id = (
      select id from public.tenants where user_id = auth.uid()
    )
  );

create policy "tenant: insert own enquiry"
  on public.enquiries for insert
  with check (
    tenant_id = (
      select id from public.tenants where user_id = auth.uid()
    )
  );

-- Landlords see enquiries for their properties
create policy "landlord: select enquiries for own properties"
  on public.enquiries for select
  using (
    landlord_id = (
      select id from public.landlords where user_id = auth.uid()
    )
  );

-- Admins see all enquiries
create policy "admin: select all enquiries"
  on public.enquiries for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create trigger enquiries_updated_at
  before update on public.enquiries
  for each row execute function public.set_updated_at();
