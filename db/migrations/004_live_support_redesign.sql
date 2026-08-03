-- Migration: live support redesign (chat ticket numbers)
--
-- Adds a readable ticket reference (LVX-XXXX) to chat_inquiries so offline
-- support requests carry a customer-facing ticket id in the ack email and the
-- admin thread header. Safe to re-run.
--
-- Apply with:
--   psql "$DATABASE_URL" -f db/migrations/004_live_support_redesign.sql
-- or run in the Supabase SQL editor.

-- ── ticket_no on chat_inquiries ────────────────────────────────────────────────
ALTER TABLE public.chat_inquiries ADD COLUMN IF NOT EXISTS ticket_no TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS chat_inquiries_ticket_no_idx
  ON public.chat_inquiries (ticket_no);

-- Auto-generate LVX-XXXX on insert (idempotent retry loop on collision)
CREATE OR REPLACE FUNCTION public.gen_chat_ticket_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ticket_no IS NULL THEN
    LOOP
      NEW.ticket_no := 'LVX-' || upper(substr(md5(random()::text), 1, 4));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.chat_inquiries WHERE ticket_no = NEW.ticket_no);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_inquiries_ticket_no ON public.chat_inquiries;
CREATE TRIGGER trg_chat_inquiries_ticket_no
  BEFORE INSERT ON public.chat_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.gen_chat_ticket_no();

-- Backfill existing rows (idempotent)
UPDATE public.chat_inquiries
SET ticket_no = 'LVX-' || upper(substr(id::text, 1, 4))
WHERE ticket_no IS NULL;
