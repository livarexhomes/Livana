-- Migration: Add landlord support to existing support_tickets table
-- Run this on an existing database to add landlord functionality

-- 1. Add landlord_id column to support_tickets (nullable)
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS landlord_id UUID REFERENCES public.landlords(id) ON DELETE CASCADE;

-- 2. Make tenant_id nullable (since tickets can now be from landlords)
-- Note: This requires dropping and recreating the constraint if it exists
-- If you get errors here, you may need to manually handle existing data

-- 3. Add constraint to ensure only tenant_id OR landlord_id is set
-- First drop the existing constraint if it exists
ALTER TABLE public.support_tickets 
DROP CONSTRAINT IF EXISTS chk_tenant_or_landlord;

-- Add the constraint
ALTER TABLE public.support_tickets 
ADD CONSTRAINT chk_tenant_or_landlord CHECK (
    (tenant_id IS NOT NULL AND landlord_id IS NULL) OR
    (tenant_id IS NULL AND landlord_id IS NOT NULL) OR
    (tenant_id IS NOT NULL AND landlord_id IS NOT NULL)  -- Allow both for flexibility during transition
);

-- 4. Create index on landlord_id for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_landlord ON public.support_tickets(landlord_id);

-- 5. Update support_messages sender_role to include 'landlord'
-- First, drop the existing constraint
ALTER TABLE public.support_messages 
DROP CONSTRAINT IF EXISTS support_messages_sender_role_check;

-- Add updated constraint with 'landlord' option
ALTER TABLE public.support_messages 
ADD CONSTRAINT support_messages_sender_role_check 
CHECK (sender_role IN ('tenant', 'landlord', 'admin'));

-- 6. Add RLS policies for landlords

-- Policy: Landlords can manage their own tickets
DROP POLICY IF EXISTS "Landlords manage own tickets" ON public.support_tickets;
CREATE POLICY "Landlords manage own tickets"
  ON public.support_tickets FOR ALL
  USING (
    landlord_id IN (SELECT id FROM public.landlords WHERE user_id = auth.uid())
  );

-- Policy: Landlords can read messages on their tickets
DROP POLICY IF EXISTS "Landlords read own ticket messages" ON public.support_messages;
CREATE POLICY "Landlords read own ticket messages"
  ON public.support_messages FOR SELECT
  USING (
    ticket_id IN (
      SELECT st.id FROM public.support_tickets st
      JOIN public.landlords l ON l.id = st.landlord_id
      WHERE l.user_id = auth.uid()
    )
  );

-- Policy: Landlords can send messages on their tickets
DROP POLICY IF EXISTS "Landlords send messages on own tickets" ON public.support_messages;
CREATE POLICY "Landlords send messages on own tickets"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    sender_role = 'landlord'
    AND ticket_id IN (
      SELECT st.id FROM public.support_tickets st
      JOIN public.landlords l ON l.id = st.landlord_id
      WHERE l.user_id = auth.uid()
    )
  );

-- 7. Update realtime publication if needed
DO $$
DECLARE
  tables TEXT[] := ARRAY['support_messages','support_tickets'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END;
$$;

-- Migration complete!
