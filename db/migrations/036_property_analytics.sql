-- Property performance analytics. Raw activity is available only to the
-- server-side Edge Function; landlords receive pre-aggregated daily counts.

CREATE TABLE IF NOT EXISTS public.property_visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  visitor_session_id UUID NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, visitor_session_id)
);

CREATE TABLE IF NOT EXISTS public.property_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.property_visitor_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'impression', 'detail_view', 'unique_visitor',
    'contact_admin_click', 'enquiry_initiated'
  )),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_day DATE NOT NULL,
  UNIQUE (session_id, event_type, event_day)
);

CREATE TABLE IF NOT EXISTS public.property_analytics_daily (
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  event_day DATE NOT NULL,
  impressions BIGINT NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  views BIGINT NOT NULL DEFAULT 0 CHECK (views >= 0),
  unique_visitors BIGINT NOT NULL DEFAULT 0 CHECK (unique_visitors >= 0),
  contact_admin_clicks BIGINT NOT NULL DEFAULT 0 CHECK (contact_admin_clicks >= 0),
  enquiries BIGINT NOT NULL DEFAULT 0 CHECK (enquiries >= 0),
  PRIMARY KEY (property_id, event_day)
);

CREATE TABLE IF NOT EXISTS public.property_visitor_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  visitor_session_record_id UUID NOT NULL,
  property_id UUID NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_analytics_events_property_day_idx
  ON public.property_analytics_events (property_id, event_day DESC);
CREATE INDEX IF NOT EXISTS property_analytics_events_session_time_idx
  ON public.property_analytics_events (session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS property_visitor_sessions_property_time_idx
  ON public.property_visitor_sessions (property_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS property_visitor_sessions_actor_idx
  ON public.property_visitor_sessions (actor_user_id) WHERE actor_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS property_analytics_daily_day_idx
  ON public.property_analytics_daily (event_day DESC);
CREATE INDEX IF NOT EXISTS property_visitor_access_logs_admin_time_idx
  ON public.property_visitor_access_logs (admin_user_id, accessed_at DESC);

ALTER TABLE public.property_visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_visitor_access_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.property_visitor_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.property_analytics_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.property_analytics_daily FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.property_visitor_access_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.property_visitor_sessions TO service_role;
GRANT ALL ON TABLE public.property_analytics_events TO service_role;
GRANT ALL ON TABLE public.property_analytics_daily TO service_role;
GRANT ALL ON TABLE public.property_visitor_access_logs TO service_role;

CREATE OR REPLACE FUNCTION public.record_property_analytics_event(
  p_property_id UUID,
  p_visitor_session_id UUID,
  p_event_type TEXT,
  p_actor_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session_id UUID;
  v_is_new_session BOOLEAN := false;
  v_event_id UUID;
  v_event_day DATE := (now() AT TIME ZONE 'UTC')::DATE;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_property_id IS NULL OR p_visitor_session_id IS NULL OR p_event_type IS NULL
     OR p_event_type NOT IN ('impression', 'detail_view', 'contact_admin_click', 'enquiry_initiated') THEN
    RAISE EXCEPTION 'invalid analytics event' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = p_property_id
      AND landlord_id IS NOT NULL
      AND status NOT IN ('pending_review', 'rejected', 'changes_requested')
  ) THEN
    RAISE EXCEPTION 'property is not available for analytics' USING ERRCODE = '22023';
  END IF;
  IF p_actor_user_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.properties p
    JOIN public.landlords l ON l.id = p.landlord_id
    WHERE p.id = p_property_id AND l.user_id = p_actor_user_id
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.property_visitor_sessions (
    property_id, visitor_session_id, actor_user_id, first_seen_at, last_seen_at
  )
  VALUES (p_property_id, p_visitor_session_id, p_actor_user_id, v_now, v_now)
  ON CONFLICT (property_id, visitor_session_id) DO NOTHING
  RETURNING id INTO v_session_id;

  v_is_new_session := FOUND;
  IF NOT v_is_new_session THEN
    UPDATE public.property_visitor_sessions
    SET last_seen_at = v_now,
        actor_user_id = COALESCE(actor_user_id, p_actor_user_id)
    WHERE property_id = p_property_id
      AND visitor_session_id = p_visitor_session_id
    RETURNING id INTO v_session_id;
  END IF;

  IF (
    SELECT count(*) FROM public.property_analytics_events
    WHERE session_id = v_session_id
      AND occurred_at > v_now - INTERVAL '1 minute'
  ) >= 30 THEN
    RAISE EXCEPTION 'analytics rate limit exceeded' USING ERRCODE = '42900';
  END IF;

  IF v_is_new_session THEN
    INSERT INTO public.property_analytics_events (property_id, session_id, event_type, event_day)
    VALUES (p_property_id, v_session_id, 'unique_visitor', v_event_day)
    ON CONFLICT (session_id, event_type, event_day) DO NOTHING;
    INSERT INTO public.property_analytics_daily (property_id, event_day, unique_visitors)
    VALUES (p_property_id, v_event_day, 1)
    ON CONFLICT (property_id, event_day) DO UPDATE
      SET unique_visitors = public.property_analytics_daily.unique_visitors + 1;
  END IF;

  INSERT INTO public.property_analytics_events (property_id, session_id, event_type, event_day, occurred_at)
  VALUES (p_property_id, v_session_id, p_event_type, v_event_day, v_now)
  ON CONFLICT (session_id, event_type, event_day) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.property_analytics_daily (
    property_id, event_day, impressions, views, contact_admin_clicks, enquiries
  )
  VALUES (
    p_property_id, v_event_day,
    CASE WHEN p_event_type = 'impression' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'detail_view' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'contact_admin_click' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'enquiry_initiated' THEN 1 ELSE 0 END
  )
  ON CONFLICT (property_id, event_day) DO UPDATE SET
    impressions = public.property_analytics_daily.impressions + EXCLUDED.impressions,
    views = public.property_analytics_daily.views + EXCLUDED.views,
    contact_admin_clicks = public.property_analytics_daily.contact_admin_clicks + EXCLUDED.contact_admin_clicks,
    enquiries = public.property_analytics_daily.enquiries + EXCLUDED.enquiries;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_property_analytics_event(UUID, UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_property_analytics_event(UUID, UUID, TEXT, UUID) TO service_role;
