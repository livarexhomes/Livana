# Database

## Migrations (`migrations/`)

Sequential Supabase migrations applied in order. Each file represents a single schema change
and has already been run against the production database.

| File | Description |
|---|---|
| `001_create_verification_codes.sql` | Phone OTP verification codes table |
| `002_add_property_charges.sql` | Property charge/fee columns |
| `003_support_and_contact.sql` | Support tickets and contact requests |
| `004_live_support_redesign.sql` | Live support chat redesign |
| `005_live_support_multi_agent.sql` | Multi-agent support routing |
| `006_agent_last_seen.sql` | Support agent presence tracking |
| `007_security_hardening.sql` | RLS policy hardening |
| `008_presence_and_availability.sql` | Agent availability status |
| `009_support_ticket_workspace.sql` | Support workspace views |
| `010_fix_signup_trigger.sql` | Fix handle_new_user trigger (tenants no longer get landlord rows) |
| `011_visitor_chat_rls.sql` | RLS for anonymous visitor chat sessions |
| `012_fix_support_agent_rls.sql` | Adds `is_agent()`; updates support ticket/message policies so `agents` table members can see and manage all tickets (fixes admin ticket visibility) |

**To apply a new migration:** paste the SQL into the Supabase SQL Editor and run it.
Then add the file here with the next sequential number.

## Setup scripts (`*.sql`)

These are one-time setup scripts (idempotent — safe to re-run):

| File | Description |
|---|---|
| `chat_inquiries.sql` | Chat inquiries + messages tables with RLS |
| `projects.sql` | Projects table with RLS and storage bucket |
