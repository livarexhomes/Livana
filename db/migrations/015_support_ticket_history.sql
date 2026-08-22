-- Migration 015: Add archive state for support ticket history
-- Archived tickets are hidden from the active workspace but remain fully preserved.
-- Safe to re-run. Apply in the Supabase SQL editor.

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Keep active/history filtering fast as the ticket volume grows.
CREATE INDEX IF NOT EXISTS support_tickets_archived_status_idx
  ON public.support_tickets (archived, status);

-- Existing tickets remain in the active Support Queue.
UPDATE public.support_tickets
SET archived = false
WHERE archived IS NULL;
