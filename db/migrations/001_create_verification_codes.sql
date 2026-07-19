-- Migration: create verification_codes table
-- Adds a table to store email OTP codes sent via Resend

-- Enable pgcrypto for gen_random_uuid() if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Optional index for lookups by email and code
CREATE INDEX IF NOT EXISTS verification_codes_email_code_idx ON public.verification_codes (email, code);
