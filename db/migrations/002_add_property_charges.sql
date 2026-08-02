-- Add optional property charge columns (Total Payable = Rent + Agency Fee + Agreement Fee + Commission Fee + Other Charges).
-- Agency Fee itself is NEVER stored — it is always computed as Rent × (agency_fee_percent / 100) at render time,
-- so the admin-configured percentage remains the single source of truth.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS agreement_fee  numeric,
  ADD COLUMN IF NOT EXISTS commission_fee numeric,
  ADD COLUMN IF NOT EXISTS other_charges  numeric;

-- Agency Fee percentage is stored in the admin_settings `listing_rules` JSONB value (agencyFeePercent).
-- The column below is an optional convenience column and is NOT required for the feature to work.
-- NOTE: If the `admin_settings` table does not exist yet in your database, create it first, e.g.:
--   CREATE TABLE IF NOT EXISTS public.admin_settings (
--     key text PRIMARY KEY,
--     value jsonb NOT NULL,
--     category text,
--     updated_by uuid,
--     updated_at timestamptz NOT NULL DEFAULT now()
--   );
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS agency_fee_percent numeric;
