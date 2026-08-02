-- Migration: add optional property charges + admin settings table
--
-- Adds the optional charge columns (agreement_fee, commission_fee,
-- other_charges) to `properties` and creates the `admin_settings` table that
-- backs Admin → Settings (key/value JSONB rows: platform, notifications,
-- security, listing_rules, email_config).
--
-- Safe to re-run. Apply with:
--   psql "$DATABASE_URL" -f db/migrations/002_add_property_charges.sql
-- or:
--   supabase db push --file db/migrations/002_add_property_charges.sql

-- ── Optional charge columns on `properties` ───────────────────────────────────

ALTER TABLE properties ADD COLUMN IF NOT EXISTS agreement_fee NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS commission_fee NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS other_charges NUMERIC;

-- ── admin_settings table (Admin → Settings persistence) ───────────────────────

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT NOT NULL UNIQUE,
  value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  category   TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_settings_key_idx ON public.admin_settings (key);

-- Convenience column: the Agency Fee percentage can live either in the
-- `listing_rules` JSONB value (`agencyFeePercent`) or in this column.
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS agency_fee_percent NUMERIC;

-- ── RLS: only authenticated users (admins) can read/write settings ────────────

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_admin_settings" ON admin_settings;
CREATE POLICY "auth_read_admin_settings"
  ON admin_settings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "auth_write_admin_settings" ON admin_settings;
CREATE POLICY "auth_write_admin_settings"
  ON admin_settings FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_admin_settings" ON admin_settings;
CREATE POLICY "auth_update_admin_settings"
  ON admin_settings FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Allow realtime (no-op if already a member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admin_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE admin_settings;
  END IF;
END $$;
