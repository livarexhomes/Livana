ALTER TABLE public.property_review_events
  DROP CONSTRAINT IF EXISTS property_review_events_action_check;

ALTER TABLE public.property_review_events
  ADD CONSTRAINT property_review_events_action_check
  CHECK (action IN (
    'approved',
    'rejected',
    'changes_requested',
    'review_started',
    'resubmitted'
  ));

DROP POLICY IF EXISTS "property_review_events_landlord_select" ON public.property_review_events;
CREATE POLICY "property_review_events_landlord_select"
  ON public.property_review_events
  FOR SELECT TO authenticated
  USING (
    property_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.properties AS p
      JOIN public.landlords AS l ON l.id = p.landlord_id
      WHERE p.id = property_review_events.property_id
        AND l.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.start_property_review(p_property_id uuid)
RETURNS TABLE(property_id uuid, started_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_property_title text;
  v_latest_action text;
  v_latest_created_at timestamptz;
  v_started_at timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can start property reviews'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.title
  INTO v_property_title
  FROM public.properties AS p
  WHERE p.id = p_property_id
    AND p.status = 'pending_review'
  FOR UPDATE;

  IF v_property_title IS NULL THEN
    RAISE EXCEPTION 'This submission is no longer awaiting review'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT e.action, e.created_at
  INTO v_latest_action, v_latest_created_at
  FROM public.property_review_events AS e
  WHERE e.property_id = p_property_id
  ORDER BY e.created_at DESC, e.id DESC
  LIMIT 1;

  IF v_latest_action = 'review_started' THEN
    RETURN QUERY SELECT p_property_id, v_latest_created_at;
    RETURN;
  END IF;

  INSERT INTO public.property_review_events (
    property_id,
    property_title,
    action,
    admin_user_id
  )
  VALUES (
    p_property_id,
    v_property_title,
    'review_started',
    auth.uid()
  )
  RETURNING created_at INTO v_started_at;

  RETURN QUERY SELECT p_property_id, v_started_at;
END;
$$;

REVOKE ALL ON FUNCTION public.start_property_review(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.start_property_review(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.start_property_review(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_property_review_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.review_feedback IS DISTINCT FROM OLD.review_feedback
    OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
    OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by THEN
    RAISE EXCEPTION 'Only administrators can change property review metadata'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status NOT IN ('rejected', 'changes_requested') OR NEW.status <> 'pending_review' THEN
      RAISE EXCEPTION 'Only rejected or change-requested listings can be resubmitted'
        USING ERRCODE = '42501';
    END IF;
    NEW.review_feedback := NULL;
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;

    INSERT INTO public.property_review_events (
      property_id,
      property_title,
      action
    )
    VALUES (
      NEW.id,
      NEW.title,
      'resubmitted'
    );
  END IF;

  RETURN NEW;
END;
$$;
