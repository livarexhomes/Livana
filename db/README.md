How to apply database migrations

This repository stores simple SQL migrations under `db/migrations`.

Recommended ways to apply the migration to your Supabase Postgres database:

1) Using the `psql` CLI:

   psql "$DATABASE_URL" -f db/migrations/001_create_verification_codes.sql
   psql "$DATABASE_URL" -f db/migrations/002_add_property_charges.sql

2) Using the Supabase CLI (recommended if you use Supabase projects):

   supabase db remote set <PROJECT_REF>
   supabase db push --file db/migrations/001_create_verification_codes.sql
   supabase db push --file db/migrations/002_add_property_charges.sql

Notes:
- The migration enables `pgcrypto` for `gen_random_uuid()`. If your project uses a different UUID extension (like `uuid-ossp`), adjust the SQL accordingly.
- `002_add_property_charges.sql` adds the optional charge columns (`agreement_fee`, `commission_fee`, `other_charges`) to `properties` and an optional `agency_fee_percent` column to `admin_settings`. The Agency Fee percentage is normally stored in the `admin_settings` `listing_rules` JSONB value (`agencyFeePercent`) — the column is a convenience. If `admin_settings` doesn't exist yet, create it first (see the SQL file header).
- Ensure the `SUPABASE_SERVICE_KEY` has permissions to modify the schema if you run migrations from the server.
