How to apply database migrations

This repository stores simple SQL migrations under `db/migrations`.

Recommended ways to apply the migration to your Supabase Postgres database:

1) Using the `psql` CLI:

   psql "$DATABASE_URL" -f db/migrations/001_create_verification_codes.sql

2) Using the Supabase CLI (recommended if you use Supabase projects):

   supabase db remote set <PROJECT_REF>
   supabase db push --file db/migrations/001_create_verification_codes.sql

Notes:
- The migration enables `pgcrypto` for `gen_random_uuid()`. If your project uses a different UUID extension (like `uuid-ossp`), adjust the SQL accordingly.
- Ensure the `SUPABASE_SERVICE_KEY` has permissions to modify the schema if you run migrations from the server.
