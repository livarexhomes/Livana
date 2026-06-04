-- Migration: Landlord Settings Table
-- Store landlord notification preferences and settings

-- Landlord Settings Table
CREATE TABLE IF NOT EXISTS public.landlord_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES public.landlords(id) ON DELETE CASCADE,
  notifications JSONB NOT NULL DEFAULT '{"enquiryEmail": true, "statusEmail": true, "reviewEmail": true, "weeklyDigest": false, "newMessage": true}'::jsonb,
  whatsapp JSONB NOT NULL DEFAULT '{"number": "", "autoReply": false, "autoReplyMsg": "Hello! Thanks for your enquiry. I will get back to you shortly.", "showOnListing": true}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(landlord_id)
);

-- Enable RLS
ALTER TABLE public.landlord_settings ENABLE ROW LEVEL SECURITY;

-- Landlord can only see/update their own settings
DROP POLICY IF EXISTS "Landlord view own settings" ON public.landlord_settings;
CREATE POLICY "Landlord view own settings"
  ON public.landlord_settings FOR SELECT
  USING (
    landlord_id = (SELECT id FROM public.landlords WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Landlord update own settings" ON public.landlord_settings;
CREATE POLICY "Landlord update own settings"
  ON public.landlord_settings FOR ALL
  USING (
    landlord_id = (SELECT id FROM public.landlords WHERE user_id = auth.uid())
  );

-- Admin can see all
DROP POLICY IF EXISTS "Admins full access to landlord_settings" ON public.landlord_settings;
CREATE POLICY "Admins full access to landlord_settings"
  ON public.landlord_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.landlord_settings;
