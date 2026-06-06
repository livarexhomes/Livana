-- Migration: Add admin reply support to enquiry_replies
-- This allows admins to respond to tenant enquiries in the support tab

-- Make landlord_id nullable since admins can also reply
ALTER TABLE public.enquiry_replies 
  ALTER COLUMN landlord_id DROP NOT NULL;

-- Add admin_id column for admin replies
ALTER TABLE public.enquiry_replies 
  ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL;

-- Add sender_role column to distinguish between landlord and admin replies
ALTER TABLE public.enquiry_replies 
  ADD COLUMN IF NOT EXISTS sender_role TEXT NOT NULL DEFAULT 'landlord'
  CHECK (sender_role IN ('landlord', 'admin'));

-- Update the admin policy to allow full access
DROP POLICY IF EXISTS "Admins full access to enquiry_replies" ON public.enquiry_replies;
CREATE POLICY "Admins full access to enquiry_replies"
  ON public.enquiry_replies FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_enquiry_replies_admin ON public.enquiry_replies(admin_id);

-- Enable realtime for enquiry_replies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'enquiry_replies'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.enquiry_replies';
  END IF;
END;
$$;
