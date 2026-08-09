-- Migration: support ticket workspace (assignment, events, context)
--
-- Upgrades support_tickets into a fully-managed ticket system while keeping
-- the existing three-column admin UI. Adds:
--
--   1. Assignment + full audit on support_tickets:
--        - assigned_to (agents.id) + assigned_at
--        - ticket_no (readable, e.g. SUPPORT-XXXX)
--        - property_id FK (auto-attached when a ticket originates from a
--          listing enquiry)
--        - created_by / last_updated_by (admin user ids)
--   2. support_ticket_events — an immutable audit log covering creation,
--      assignment, reassignment, status changes, priority changes, and
--      replies. Written by the same trigger that maintains the audit trail.
--   3. Real-time counters + FIFO auto-assign: support_tickets is already on
--      the realtime publication; the frontend watches queued tickets and
--      assigns them to the first available agent (presence = 'online' AND
--      available) using FIFO order. The claimInquiry() helper keeps the
--      assignment path consistent with chat_inquiries.
--   4. Message read receipts (read_by_admin/read_by_visitor) + attachment_url
--      on support_messages so the admin conversation workspace can show
--      sent/delivered/read states.
--   5. Typing indicator support via the broadcast channel the admin chat
--      already uses (no new tables).
--
-- Safe to re-run. Apply with:
--   psql "$DATABASE_URL" -f db/migrations/009_support_ticket_workspace.sql
-- or run in the Supabase SQL editor.

-- ── 1. support_tickets: assignment + audit columns ────────────────────────────
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS assigned_to UUID
  REFERENCES public.agents(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS ticket_no TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS property_id UUID
  REFERENCES public.properties(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS created_by UUID
  REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS last_updated_by UUID
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- Readable ticket number (idempotent backfill).
UPDATE public.support_tickets
SET ticket_no = 'SUPPORT-' || upper(substr(id::text, 1, 4))
WHERE ticket_no IS NULL;

-- ── 2. support_ticket_events: immutable audit log ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_ticket_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID        NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  actor_type TEXT        NOT NULL DEFAULT 'system' CHECK (actor_type IN ('agent', 'customer', 'system')),
  actor_id   UUID,
  event_type TEXT        NOT NULL,
  -- human-readable label, e.g. "Assigned to Tesleem", "Status changed to In Progress"
  label      TEXT        NOT NULL DEFAULT '',
  metadata   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_ticket_events_ticket_idx
  ON public.support_ticket_events (ticket_id, created_at);

ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_support_ticket_events" ON public.support_ticket_events;
CREATE POLICY "admin_select_support_ticket_events"
  ON public.support_ticket_events FOR SELECT TO authenticated
  USING (public.is_admin());

-- Realtime for events (no-op if already a member).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_ticket_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_events;
  END IF;
END $$;

-- ── 3. audit trigger: log ticket lifecycle events ─────────────────────────────
-- Appends an event row whenever a ticket is created, reassigned, or has its
-- status/priority changed. Uses the OLD/NEW values so it's a faithful audit
-- trail (no reliance on who called the UPDATE).

CREATE OR REPLACE FUNCTION public.log_support_ticket_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor_type TEXT := 'system';
  actor_id   UUID := NULL;
  ev_label   TEXT := '';
  ev_type    TEXT := '';
  meta       JSONB := '{}'::jsonb;
  uid        UUID := NULL;
BEGIN
  -- Resolve the current admin (if any) for actor attribution.
  BEGIN
    uid := auth.uid();
    IF uid IS NOT NULL THEN
      SELECT role, id INTO actor_type, actor_id
      FROM public.agents WHERE user_id = uid LIMIT 1;
      IF actor_type IS NULL THEN actor_type := 'system'; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    actor_type := 'system';
    actor_id := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    ev_type := 'created';
    ev_label := 'Ticket created';
    meta := jsonb_build_object('subject', NEW.subject, 'priority', NEW.priority);
    IF NEW.assigned_to IS NOT NULL THEN
      ev_label := ev_label || ' · assigned to agent';
      meta := jsonb_build_object('subject', NEW.subject, 'priority', NEW.priority, 'assigned_to', NEW.assigned_to);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      IF NEW.assigned_to IS NULL THEN
        ev_type := 'unassigned';
        ev_label := 'Unassigned';
        meta := jsonb_build_object('from', OLD.assigned_to);
      ELSE
        ev_type := 'assigned';
        ev_label := 'Reassigned' || CASE WHEN OLD.assigned_to IS NULL THEN '' ELSE ' (was previously assigned)' END;
        meta := jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to);
      END IF;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      ev_type := coalesce(ev_type, 'status_changed');
      IF ev_label = '' THEN
        ev_label := 'Status changed to ' || NEW.status;
      ELSE
        ev_label := ev_label || ' · status changed to ' || NEW.status;
      END IF;
      meta := meta || jsonb_build_object('status_from', OLD.status, 'status_to', NEW.status);
    END IF;

    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      ev_type := coalesce(ev_type, 'priority_changed');
      IF ev_label = '' THEN
        ev_label := 'Priority changed to ' || NEW.priority;
      ELSE
        ev_label := ev_label || ' · priority changed to ' || NEW.priority;
      END IF;
      meta := meta || jsonb_build_object('priority_from', OLD.priority, 'priority_to', NEW.priority);
    END IF;

    IF ev_type = '' THEN
      -- No tracked change (e.g. read_by_admin bump) — skip.
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.support_ticket_events (ticket_id, actor_type, actor_id, event_type, label, metadata)
  VALUES (NEW.id, actor_type, actor_id, ev_type, ev_label, meta);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_audit ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_audit
  AFTER INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_support_ticket_event();

-- ── 4. message read receipts + attachments on support_messages ────────────────
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS read_by_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS read_by_visitor BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- ── 4b. log a "replied" event whenever a message is added to a ticket ─────────
CREATE OR REPLACE FUNCTION public.log_support_message_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor_type TEXT := 'customer';
  actor_id   UUID := NULL;
BEGIN
  IF NEW.sender_role = 'admin' THEN
    actor_type := 'agent';
    BEGIN
      actor_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      actor_id := NULL;
    END;
  END IF;
  INSERT INTO public.support_ticket_events (ticket_id, actor_type, actor_id, event_type, label, metadata)
  VALUES (
    NEW.ticket_id,
    actor_type,
    actor_id,
    'replied',
    CASE WHEN NEW.sender_role = 'admin' THEN 'Support replied' ELSE 'Customer replied' END,
    jsonb_build_object('message_id', NEW.id, 'sender_role', NEW.sender_role)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_messages_audit ON public.support_messages;
CREATE TRIGGER trg_support_messages_audit
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.log_support_message_event();

-- ── 5. realtime for support_tickets (no-op if already a member) ───────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  END IF;
END $$;
