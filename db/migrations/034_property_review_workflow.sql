ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS review_feedback text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_status_check
  CHECK (status IN (
    'available',
    'taken',
    'coming_soon',
    'under_negotiation',
    'pending_review',
    'rejected',
    'changes_requested'
  ));

CREATE TABLE IF NOT EXISTS public.property_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  property_title text NOT NULL,
  action text NOT NULL CHECK (action IN ('approved', 'rejected', 'changes_requested')),
  reason text,
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE public.property_review_events FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.property_review_events TO authenticated;

ALTER TABLE public.property_review_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_review_events_admin_select" ON public.property_review_events;
CREATE POLICY "property_review_events_admin_select"
  ON public.property_review_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.review_property_submission(
  p_property_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS TABLE(property_id uuid, new_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next_status text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_property_id uuid;
  v_property_title text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can review property submissions'
      USING ERRCODE = '42501';
  END IF;

  IF p_action IS NULL OR p_action NOT IN ('approved', 'rejected', 'changes_requested') THEN
    RAISE EXCEPTION 'Invalid property review action'
      USING ERRCODE = '22023';
  END IF;

  IF p_action IN ('rejected', 'changes_requested') AND v_reason IS NULL THEN
    RAISE EXCEPTION 'A reason is required for this decision'
      USING ERRCODE = '22023';
  END IF;

  v_next_status := CASE p_action
    WHEN 'approved' THEN 'available'
    WHEN 'rejected' THEN 'rejected'
    ELSE 'changes_requested'
  END;

  UPDATE public.properties AS p
  SET status = v_next_status,
      review_feedback = v_reason,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  WHERE p.id = p_property_id
    AND p.status = 'pending_review'
  RETURNING p.id, p.title INTO v_property_id, v_property_title;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'This submission is no longer awaiting review'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.property_review_events (
    property_id,
    property_title,
    action,
    reason,
    admin_user_id
  )
  VALUES (
    v_property_id,
    v_property_title,
    p_action,
    v_reason,
    auth.uid()
  );

  RETURN QUERY SELECT v_property_id, v_next_status;
END;
$$;

REVOKE ALL ON FUNCTION public.review_property_submission(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_property_submission(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_property_submission(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_property_review_metadata()
RETURNS trigger
LANGUAGE plpgsql
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
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_property_review_metadata ON public.properties;
CREATE TRIGGER protect_property_review_metadata
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_property_review_metadata();
