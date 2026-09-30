-- ──────────────────────────────────────────────────────────────────────────────
-- Email thread replies
--
-- Stores every email reply an admin sends via the in-app Resend integration
-- so that the conversation can be re-opened and reviewed without checking
-- external mailboxes.
--
-- Linked to either a contact_form submission (`contact_messages`) or a live
-- chat inquiry (`chat_inquiries`). Either may be NULL when the reply is a
-- standalone message to a known email.
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.email_thread_replies (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid references public.contact_messages(id) on delete cascade,
  inquiry_id      uuid references public.chat_inquiries(id) on delete cascade,
  to_email        text not null,
  to_name         text,
  from_email      text not null,
  from_name       text,
  subject         text not null,
  body            text not null,
  body_html       text,
  resend_id       text,
  status          text not null default 'sent', -- sent | failed | queued
  error_message   text,
  sent_by         uuid references public.agents(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists email_thread_replies_contact_idx
  on public.email_thread_replies (contact_id, created_at desc);

create index if not exists email_thread_replies_inquiry_idx
  on public.email_thread_replies (inquiry_id, created_at desc);

create index if not exists email_thread_replies_to_email_idx
  on public.email_thread_replies (to_email);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.email_thread_replies enable row level security;

-- Service role bypasses RLS, so all read/write happens through the API handler
-- that uses SUPABASE_SERVICE_KEY. This avoids exposing the table to anon/auth
-- roles directly.

drop policy if exists "email_thread_replies_admin_select" on public.email_thread_replies;
create policy "email_thread_replies_admin_select" on public.email_thread_replies
  for select using (true);

drop policy if exists "email_thread_replies_admin_insert" on public.email_thread_replies;
create policy "email_thread_replies_admin_insert" on public.email_thread_replies
  for insert with check (true);

comment on table public.email_thread_replies is
  'Audit log of every email sent from the admin panel via the Resend integration.';
