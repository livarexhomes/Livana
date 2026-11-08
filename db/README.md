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
| `013_drop_duplicate_landlord_trigger.sql` | Drops `on_landlord_signup` trigger + `handle_new_landlord` function — a second trigger on `auth.users` that was creating landlord rows for every new signup, bypassing the migration 010 fix |
| `015_support_ticket_history.sql` | Adds the `support_tickets.archived` flag and index for moving preserved conversations between the active workspace and History |
| `030_site_visitor_analytics.sql` | Records approximate unique public-site browsers and page views for the admin dashboard |
| `036_property_analytics.sql` | Private property interaction records, daily aggregates, and admin access audit log |
| `037_site_visitor_activity.sql` | Anonymous public-page history and audited admin detail access |
| `038_site_visitor_country.sql` | Coarse hosting-edge country code for anonymous site visitors |
| `039_website_visitor_intelligence.sql` | Website-wide anonymous events, attribution, configurable server-side pagination, and retention |

**To apply a new migration:** paste the SQL into the Supabase SQL Editor and run it.
Then add the file here with the next sequential number.

Apply migrations 036, 037, 038, and 039 before deploying the property visitor API:
`supabase functions deploy property-intelligence`. Set the Edge Function secrets
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; the service-role
key must remain server-side.

Migration 037 adds page-path history for future public-site visits. Existing visitor
counts and timestamps remain available, but page paths cannot be reconstructed for
records collected before the migration. Public-site records remain anonymous and are
not linked to account profiles; opening a detailed record is audited.
Migration 038 records only a country code supplied by the hosting edge; it does not
store raw IP addresses or call a third-party geolocation service. Location remains
unavailable when the hosting edge does not provide a country code.

Migration 039 records pseudonymous public website page visits and selected
interactions (navigation, search/filter actions, authentication page/form actions,
and property contact/enquiry actions). It does not collect credentials, private
form content, raw IP addresses, or account identities. Traffic source and campaign
data use the external referrer hostname and validated UTM values; device/browser
categories are derived from the request header and the raw user-agent is not kept.
Approximate city/region are stored only when supplied by the hosting edge. The
admin API paginates and filters visitor records in the database with 20, 30, 50,
or 100 records per page. Website activity remains separate from registered
property-interaction sessions.

The migration schedules daily retention cleanup through `pg_cron` when that
extension is enabled. If it is unavailable, schedule
`SELECT public.prune_site_visitor_activity()` daily through the deployment's
existing maintenance mechanism. Journey events are retained for 180 days and
inactive pseudonymous visitor records are deleted after 180 days; restricted
visitor access logs are retained for 365 days.

The analytics and visitor-activity grant regression assertions are in
`db/tests/036_property_analytics_security.sql` and
`db/tests/037_site_visitor_activity_security.sql` and
`db/tests/038_site_visitor_country_security.sql` and
`db/tests/039_website_visitor_intelligence_security.sql`.

## Setup scripts (`*.sql`)

These are one-time setup scripts (idempotent — safe to re-run):

| File | Description |
|---|---|
| `chat_inquiries.sql` | Chat inquiries + messages tables with RLS |
| `projects.sql` | Projects table with RLS and storage bucket |
