-- ============================================================
-- 005_contact_messages.sql
-- General contact form submissions (not tied to a property).
-- ============================================================

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  role       text not null default 'other',
  subject    text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Only admins can read submissions
create policy "admin: select all contact messages"
  on public.contact_messages for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Anyone (including anonymous visitors) can insert
create policy "public: insert contact message"
  on public.contact_messages for insert
  with check (true);
