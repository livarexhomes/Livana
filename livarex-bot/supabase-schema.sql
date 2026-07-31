-- ── Livarex WhatsApp Bot — Supabase Schema ─────────────────────────────────
-- Run this once in your Supabase project: https://app.supabase.com → SQL Editor
--
-- Creates every table the bot depends on plus the RPC it calls. The bot
-- silently falls back to in-memory storage when these don't exist, so until
-- this runs the bot "works" but forgets everything on restart.

-- ── Conversation memory (memory.js) ────────────────────────────────────────
create table if not exists bot_messages (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);
create index if not exists bot_messages_phone_idx on bot_messages (phone, created_at);

-- ── Lead tracking (leads.js) ───────────────────────────────────────────────
create table if not exists bot_leads (
  phone text primary key,
  name text,
  last_message text,
  last_message_at timestamptz default now(),
  follow_up_count int default 0,
  follow_up_due_at timestamptz,
  follow_up_sent_at timestamptz,
  created_at timestamptz default now()
);

-- Atomic follow-up counter used by markFollowUpSent()
create or replace function increment_follow_up_count(p_phone text)
returns void
language plpgsql
security definer
as $$
begin
  update bot_leads
     set follow_up_count = follow_up_count + 1
   where phone = p_phone;
end;
$$;

-- ── Bot-sourced inspection requests (inspections.js) ───────────────────────
-- WhatsApp leads are just phone numbers — they have no tenants row / auth
-- account, so they can't write to the website's `enquiries` table (which
-- requires tenant_id). This table is the bot's own record; admin reviews it
-- and manually converts worthwhile leads into a real `enquiries` row.
create table if not exists bot_inspection_requests (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  name text not null,
  property_id uuid references properties(id),
  property_title text,
  preferred_date text,
  preferred_time text,
  status text not null default 'pending' check (status in ('pending','contacted','confirmed','rejected')),
  created_at timestamptz default now()
);
create index if not exists bot_inspection_requests_phone_idx on bot_inspection_requests (phone, created_at);
create index if not exists bot_inspection_requests_status_idx on bot_inspection_requests (status);
