-- ──────────────────────────────────────────────────────────────────────────────
-- Backfill contact_id on inbound email_thread_replies rows
--
-- Inbound replies whose In-Reply-To / message_id lookup failed landed in
-- `email_thread_replies` with `contact_id IS NULL`. The admin UI filters by
-- `contact_id`, so those replies were invisible.
--
-- This migration links any orphan inbound row to the contact_messages entry
-- whose email matches the row's `from_email`. It only updates rows that still
-- have a NULL contact_id, so it is safe to re-run.
-- ──────────────────────────────────────────────────────────────────────────────

UPDATE public.email_thread_replies etr
SET    contact_id = cm.id
FROM   public.contact_messages cm
WHERE  etr.direction      = 'inbound'
  AND  etr.contact_id     IS NULL
  AND  etr.from_email IS NOT NULL
  AND  lower(cm.email)    = lower(etr.from_email);

-- (Optional) helpful index for the admin panel's per-contact thread lookup.
CREATE INDEX IF NOT EXISTS email_thread_replies_from_email_idx
  ON public.email_thread_replies (from_email);