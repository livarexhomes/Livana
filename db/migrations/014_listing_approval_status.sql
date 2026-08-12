-- Migration 014: Add pending_review status to properties
-- Landlord-submitted listings start as pending_review and must be approved
-- by an admin before becoming visible on the platform.

-- Drop the existing check constraint on properties.status and replace it
-- with one that also allows 'pending_review'.
-- (The constraint name may vary; use DO block to handle both cases.)

DO $$
BEGIN
  -- Try the most common name first
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_status_check'
      AND conrelid = 'properties'::regclass
  ) THEN
    ALTER TABLE properties DROP CONSTRAINT properties_status_check;
  END IF;

  -- Drop any other check constraint on the status column
  -- by querying pg_constraint for check constraints on this table
  PERFORM constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc USING (constraint_name, constraint_schema)
  WHERE tc.table_name = 'properties'
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%status%';
END $$;

-- Add the updated check constraint
ALTER TABLE properties
  ADD CONSTRAINT properties_status_check
  CHECK (status IN ('available', 'taken', 'coming_soon', 'under_negotiation', 'pending_review'));
