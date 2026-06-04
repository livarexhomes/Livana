-- Migration: Admin Settings Table and Email Notifications
-- This enables persistent admin settings and Resend email notifications

-- ── Admin Settings Table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        NOT NULL UNIQUE,
  value       JSONB       NOT NULL DEFAULT '{}',
  category    TEXT        NOT NULL DEFAULT 'general',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID        REFERENCES public.admins(id) ON DELETE SET NULL
);

-- Insert default settings
INSERT INTO public.admin_settings (key, value, category) VALUES
  ('platform', '{"name": "Livana Property Manager", "tagline": "Nigeria''s most trusted property platform", "email": "support@livana.ng", "phone": "+234 800 548 2621", "address": "14 Bourdillon Road, Ikoyi, Lagos", "currency": "NGN", "country": "Nigeria", "website": "https://livana.ng"}', 'platform'),
  ('notifications', '{"newLandlord": true, "newEnquiry": true, "newProperty": false, "weeklyReport": true, "smsAlerts": false, "adminEmail": "admin@livana.ng"}', 'notifications'),
  ('security', '{"twoFactorAuth": true, "sessionTimeout": 30, "loginNotifications": false, "ipAllowlist": false, "allowedIps": []}', 'security'),
  ('listing_rules', '{"autoApprove": false, "maxPerLandlord": 20, "requireImages": true, "requireDescription": true, "allowNegotiation": true}', 'listing'),
  ('email_config', '{"resendApiKey": "", "fromEmail": "noreply@livana.ng", "fromName": "Livana", "enabled": false}', 'email')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Admin full access policy
DROP POLICY IF EXISTS "Admins full access to admin_settings" ON public.admin_settings;
CREATE POLICY "Admins full access to admin_settings"
  ON public.admin_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;

-- ── Admin Email Notifications Log ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_email_notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID        REFERENCES public.admins(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL, -- 'new_landlord', 'new_enquiry', 'new_property', etc.
  subject     TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error       TEXT,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_email_notifications_admin ON public.admin_email_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_email_notifications_status ON public.admin_email_notifications(status);

ALTER TABLE public.admin_email_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view own email notifications" ON public.admin_email_notifications;
CREATE POLICY "Admins view own email notifications"
  ON public.admin_email_notifications FOR SELECT
  USING (admin_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- ── Function to Send Admin Email Notifications ───────────────────
CREATE OR REPLACE FUNCTION public.notify_admin_on_event()
RETURNS TRIGGER AS $$
DECLARE
  admin_email TEXT;
  settings JSONB;
  event_type TEXT;
  subject TEXT;
  body TEXT;
  should_notify BOOLEAN := false;
BEGIN
  -- Determine event type
  IF TG_TABLE_NAME = 'landlords' THEN
    event_type := 'new_landlord';
  ELSIF TG_TABLE_NAME = 'enquiries' THEN
    event_type := 'new_enquiry';
  ELSIF TG_TABLE_NAME = 'properties' THEN
    event_type := 'new_property';
  ELSE
    RETURN NEW;
  END IF;

  -- Get notification settings
  SELECT value INTO settings FROM public.admin_settings WHERE key = 'notifications';
  
  -- Check if notification is enabled for this event
  should_notify := CASE event_type
    WHEN 'new_landlord' THEN COALESCE((settings->>'newLandlord')::boolean, false)
    WHEN 'new_enquiry' THEN COALESCE((settings->>'newEnquiry')::boolean, false)
    WHEN 'new_property' THEN COALESCE((settings->>'newProperty')::boolean, false)
    ELSE false
  END;

  IF NOT should_notify THEN
    RETURN NEW;
  END IF;

  -- Get admin email
  SELECT COALESCE(settings->>'adminEmail', 'admin@livana.ng') INTO admin_email;

  -- Build email content based on event
  CASE event_type
    WHEN 'new_landlord' THEN
      subject := 'New Landlord Registration';
      body := json_build_object(
        'type', 'new_landlord',
        'landlordId', NEW.id,
        'landlordName', NEW.full_name,
        'landlordEmail', NEW.user_id,
        'timestamp', NOW()
      )::text;
    WHEN 'new_enquiry' THEN
      subject := 'New Property Enquiry';
      body := json_build_object(
        'type', 'new_enquiry',
        'enquiryId', NEW.id,
        'propertyId', NEW.property_id,
        'tenantId', NEW.tenant_id,
        'timestamp', NOW()
      )::text;
    WHEN 'new_property' THEN
      subject := 'New Property Listed';
      body := json_build_object(
        'type', 'new_property',
        'propertyId', NEW.id,
        'propertyTitle', NEW.title,
        'landlordId', NEW.landlord_id,
        'timestamp', NOW()
      )::text;
  END CASE;

  -- Insert notification record (will be picked up by edge function)
  INSERT INTO public.admin_email_notifications (admin_id, type, subject, body, status)
  SELECT id, event_type, subject, body, 'pending'
  FROM public.admins
  WHERE is_super = true OR EXISTS (SELECT 1 FROM public.admin_settings WHERE key = 'notifications' AND (value->>'newLandlord')::boolean);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Triggers for Notifications ──────────────────────────────────
DROP TRIGGER IF EXISTS notify_on_new_landlord ON public.landlords;
CREATE TRIGGER notify_on_new_landlord
  AFTER INSERT ON public.landlords
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_event();

DROP TRIGGER IF EXISTS notify_on_new_enquiry ON public.enquiries;
CREATE TRIGGER notify_on_new_enquiry
  AFTER INSERT ON public.enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_event();

DROP TRIGGER IF EXISTS notify_on_new_property ON public.properties;
CREATE TRIGGER notify_on_new_property
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_event();
