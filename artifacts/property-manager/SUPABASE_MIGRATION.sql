-- ============================================================
-- Livana KYC System Migration
-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard → Your Project → SQL Editor
-- ============================================================

-- 1. Add KYC fields to the landlords table
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS nin TEXT;
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS id_type TEXT;
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS kyc_notes TEXT;
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ;

-- 2. Update status column to allow new values
-- If you have a CHECK constraint on status, update it:
ALTER TABLE landlords DROP CONSTRAINT IF EXISTS landlords_status_check;
ALTER TABLE landlords ADD CONSTRAINT landlords_status_check
  CHECK (status IN ('not_submitted', 'pending', 'approved', 'rejected', 'suspended'));

-- 3. (Optional) Set existing unverified landlords to 'not_submitted'
--    Only run this if you want existing 'pending' landlords who haven't submitted KYC
--    to be reset. Skip if your existing pending landlords already have KYC data.
-- UPDATE landlords SET status = 'not_submitted' WHERE status = 'pending' AND nin IS NULL;

-- 4. Done! Your landlords table now supports the full KYC flow.
