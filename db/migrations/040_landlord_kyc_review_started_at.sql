ALTER TABLE public.landlords
  ADD COLUMN IF NOT EXISTS kyc_review_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_review_completed_at timestamptz;
