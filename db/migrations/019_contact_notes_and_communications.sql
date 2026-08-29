-- Migration: 019_contact_notes_and_communications
-- Creates tables for the Contact Hub's activity timeline and notes
-- Safe to re-run (uses IF NOT EXISTS / DO $$ guards)

-- 1. contact_notes — private admin notes per contact
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'contact_notes'
  ) THEN
    CREATE TABLE public.contact_notes (
      id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
      contact_id   uuid        NOT NULL,
      contact_type text        NOT NULL CHECK (contact_type IN ('tenant', 'landlord')),
      content      text        NOT NULL,
      created_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at   timestamptz DEFAULT now() NOT NULL
    );

    COMMENT ON TABLE contact_notes IS 'Private internal notes on contacts — not visible to the contact.';
  END IF;
END $$;

-- 2. contact_communications — email, WhatsApp, advert, message history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'contact_communications'
  ) THEN
    CREATE TABLE public.contact_communications (
      id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
      contact_id   uuid        NOT NULL,
      contact_type text        NOT NULL CHECK (contact_type IN ('tenant', 'landlord')),
      channel      text        NOT NULL CHECK (channel IN ('email', 'whatsapp', 'advert', 'message')),
      subject      text,
      body         text,
      property_id  uuid        REFERENCES public.properties(id) ON DELETE SET NULL,
      sent_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at   timestamptz DEFAULT now() NOT NULL
    );

    COMMENT ON TABLE contact_communications IS 'Record of all outbound communications sent to a contact.';
  END IF;
END $$;

-- 3. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_contact_notes_contact
  ON public.contact_notes (contact_id, contact_type);

CREATE INDEX IF NOT EXISTS idx_contact_communications_contact
  ON public.contact_communications (contact_id, contact_type);

-- 4. RLS — admins and the sender can always read their own records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename  = 'contact_notes'
      AND policyname = 'Admins and creator can read contact_notes'
  ) THEN
    CREATE POLICY "Admins and creator can read contact_notes"
      ON public.contact_notes FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.admins WHERE admins.id = auth.uid()
        )
        OR created_by = auth.uid()
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename  = 'contact_communications'
      AND policyname = 'Admins can read contact_communications'
  ) THEN
    CREATE POLICY "Admins can read contact_communications"
      ON public.contact_communications FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.admins WHERE admins.id = auth.uid()
        )
        OR sent_by = auth.uid()
      );
  END IF;
END $$;

-- 5. Enable RLS
ALTER TABLE public.contact_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_communications ENABLE ROW LEVEL SECURITY;

-- 6. Insert policy for admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename  = 'contact_notes'
      AND policyname = 'Admins can insert contact_notes'
  ) THEN
    CREATE POLICY "Admins can insert contact_notes"
      ON public.contact_notes FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.admins WHERE admins.id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename  = 'contact_communications'
      AND policyname = 'Admins can insert contact_communications'
  ) THEN
    CREATE POLICY "Admins can insert contact_communications"
      ON public.contact_communications FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.admins WHERE admins.id = auth.uid()
        )
      );
  END IF;
END $$;
