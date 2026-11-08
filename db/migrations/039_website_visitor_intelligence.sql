-- Extend anonymous site activity with safe, website-wide journey and attribution data.
-- No account identity, raw IP address, credential, or free-form form input is stored.

ALTER TABLE public.site_visitors
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country_name TEXT,
  ADD COLUMN IF NOT EXISTS traffic_source TEXT,
  ADD COLUMN IF NOT EXISTS referrer_domain TEXT,
  ADD COLUMN IF NOT EXISTS landing_page TEXT,
  ADD COLUMN IF NOT EXISTS last_visited_path TEXT,
  ADD COLUMN IF NOT EXISTS last_event_type TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS device_category TEXT,
  ADD COLUMN IF NOT EXISTS browser TEXT,
  ADD COLUMN IF NOT EXISTS operating_system TEXT,
  ADD COLUMN IF NOT EXISTS total_events BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.site_visitors
  ADD CONSTRAINT site_visitors_traffic_source_check
    CHECK (traffic_source IS NULL OR traffic_source IN ('direct', 'organic_search', 'social', 'referral', 'campaign', 'unknown')),
  ADD CONSTRAINT site_visitors_location_length_check
    CHECK (
      (region IS NULL OR length(region) <= 100)
      AND (city IS NULL OR length(city) <= 100)
      AND (country_name IS NULL OR length(country_name) <= 100)
      AND (referrer_domain IS NULL OR length(referrer_domain) <= 253)
      AND (landing_page IS NULL OR length(landing_page) <= 300)
      AND (last_visited_path IS NULL OR length(last_visited_path) <= 300)
    ),
  ADD CONSTRAINT site_visitors_total_events_check CHECK (total_events >= 0);

UPDATE public.site_visitors
SET total_events = page_views
WHERE total_events = 0
  AND page_views > 0;

WITH recent AS (
  SELECT DISTINCT ON (visitor_id) visitor_id, page_path
  FROM public.site_visitor_page_events
  ORDER BY visitor_id, visited_at DESC, id ASC
)
UPDATE public.site_visitors AS visitors
SET last_visited_path = recent.page_path,
    last_event_type = 'page_view'
FROM recent
WHERE recent.visitor_id = visitors.visitor_id;

ALTER TABLE public.site_visitor_page_events
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'page_view',
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

ALTER TABLE public.site_visitor_page_events
  ADD CONSTRAINT site_visitor_page_events_type_check CHECK (
    event_type IN (
      'page_view', 'navigation', 'search', 'filter',
      'login_page_view', 'register_page_view', 'login_attempt', 'register_attempt',
      'cta_click', 'property_impression', 'property_detail_view',
      'contact_admin_click', 'enquiry_initiated'
    )
  ),
  ADD CONSTRAINT site_visitor_page_events_metadata_check CHECK (
    jsonb_typeof(event_metadata) = 'object'
    AND octet_length(event_metadata::TEXT) <= 1000
  );

CREATE INDEX IF NOT EXISTS site_visitors_last_seen_idx
  ON public.site_visitors (last_seen_at DESC, visitor_id);
CREATE INDEX IF NOT EXISTS site_visitors_country_source_idx
  ON public.site_visitors (country_code, traffic_source);
CREATE INDEX IF NOT EXISTS site_visitor_events_type_time_idx
  ON public.site_visitor_page_events (event_type, visited_at DESC, visitor_id);
CREATE INDEX IF NOT EXISTS site_visitor_events_path_time_idx
  ON public.site_visitor_page_events (page_path, visited_at DESC, visitor_id);
CREATE INDEX IF NOT EXISTS site_visitor_events_property_time_idx
  ON public.site_visitor_page_events (property_id, visited_at DESC)
  WHERE property_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_site_visitor_event(
  p_visitor_id UUID,
  p_page_path TEXT,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_data JSONB := COALESCE(p_event_data, '{}'::JSONB);
  v_country TEXT := v_data->>'country_code';
  v_country_name TEXT := NULLIF(left(trim(v_data->>'country_name'), 100), '');
  v_region TEXT := NULLIF(left(trim(v_data->>'region'), 100), '');
  v_city TEXT := NULLIF(left(trim(v_data->>'city'), 100), '');
  v_referrer TEXT := NULLIF(left(lower(trim(v_data->>'referrer_domain')), 253), '');
  v_source TEXT := v_data->>'traffic_source';
  v_landing TEXT := NULLIF(left(v_data->>'landing_page', 300), '');
  v_device TEXT := v_data->>'device_category';
  v_browser TEXT := NULLIF(left(trim(v_data->>'browser'), 60), '');
  v_os TEXT := NULLIF(left(trim(v_data->>'operating_system'), 60), '');
  v_property_id UUID;
  v_metadata JSONB := COALESCE(v_data->'metadata', '{}'::JSONB);
  v_is_page_view BOOLEAN := p_event_type IN (
    'page_view', 'login_page_view', 'register_page_view', 'property_detail_view'
  );
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_visitor_id IS NULL
     OR p_page_path IS NULL
     OR length(p_page_path) NOT BETWEEN 1 AND 300
     OR left(p_page_path, 1) <> '/'
     OR left(p_page_path, 2) = '//'
     OR position('?' IN p_page_path) > 0
     OR position('#' IN p_page_path) > 0
     OR (p_page_path ~* '^/(admin|landlord|user)(/|$)'
       AND p_page_path NOT IN ('/landlord/verify', '/landlord/register'))
     OR p_page_path ~* '^/(reset-password|auth)(/|$)'
     OR NOT (
       p_page_path IN (
         '/', '/home', '/listings', '/properties/lagos', '/properties/ogun',
         '/how-we-verify', '/landlord/verify', '/landlord/register',
         '/login', '/register', '/about', '/contact', '/faq', '/terms',
         '/privacy-policy', '/cookie-policy'
       )
       OR p_page_path ~* '^/listings/[0-9a-f-]{36}$'
       OR p_page_path ~* '^/properties-in/[a-z0-9-]{1,100}$'
     )
     OR p_event_type IS NULL
      OR p_event_type NOT IN (
       'page_view', 'navigation', 'search', 'filter',
       'login_page_view', 'register_page_view', 'login_attempt', 'register_attempt',
       'cta_click', 'property_impression', 'property_detail_view',
       'contact_admin_click', 'enquiry_initiated'
     )
     OR jsonb_typeof(v_data) <> 'object'
     OR jsonb_typeof(v_metadata) <> 'object'
     OR octet_length(v_metadata::TEXT) > 1000
     OR (v_country IS NOT NULL AND v_country !~ '^[A-Z]{2}$')
     OR (v_source IS NOT NULL AND v_source NOT IN ('direct', 'organic_search', 'social', 'referral', 'campaign', 'unknown'))
     OR (v_device IS NOT NULL AND v_device NOT IN ('mobile', 'tablet', 'desktop', 'unknown')) THEN
    RAISE EXCEPTION 'invalid site visitor event' USING ERRCODE = '22023';
  END IF;

  IF v_data ? 'property_id' AND NULLIF(v_data->>'property_id', '') IS NOT NULL THEN
    BEGIN
      v_property_id := (v_data->>'property_id')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid property reference' USING ERRCODE = '22023';
    END;
  END IF;

  INSERT INTO public.site_visitors (
    visitor_id, page_views, country_code, country_name, region, city, traffic_source, referrer_domain,
    landing_page, last_visited_path, last_event_type, utm_source, utm_medium,
    utm_campaign, utm_content, utm_term, device_category, browser,
    operating_system, total_events
  )
  VALUES (
    p_visitor_id, 1,
    v_country, v_country_name, v_region, v_city, COALESCE(v_source, 'unknown'),
    v_referrer, COALESCE(v_landing, p_page_path), p_page_path, p_event_type,
    NULLIF(left(v_data->>'utm_source', 100), ''),
    NULLIF(left(v_data->>'utm_medium', 100), ''),
    NULLIF(left(v_data->>'utm_campaign', 100), ''),
    NULLIF(left(v_data->>'utm_content', 100), ''),
    NULLIF(left(v_data->>'utm_term', 100), ''),
    COALESCE(v_device, 'unknown'), v_browser, v_os, 1
  )
  ON CONFLICT (visitor_id) DO UPDATE SET
    last_seen_at = now(),
    page_views = public.site_visitors.page_views + CASE WHEN v_is_page_view THEN 1 ELSE 0 END,
    country_code = COALESCE(EXCLUDED.country_code, public.site_visitors.country_code),
    country_name = COALESCE(EXCLUDED.country_name, public.site_visitors.country_name),
    region = COALESCE(EXCLUDED.region, public.site_visitors.region),
    city = COALESCE(EXCLUDED.city, public.site_visitors.city),
    traffic_source = CASE
      WHEN public.site_visitors.traffic_source IS NULL OR public.site_visitors.traffic_source = 'unknown'
        THEN EXCLUDED.traffic_source
      ELSE public.site_visitors.traffic_source
    END,
    referrer_domain = COALESCE(public.site_visitors.referrer_domain, EXCLUDED.referrer_domain),
    landing_page = COALESCE(public.site_visitors.landing_page, EXCLUDED.landing_page),
    utm_source = COALESCE(public.site_visitors.utm_source, EXCLUDED.utm_source),
    utm_medium = COALESCE(public.site_visitors.utm_medium, EXCLUDED.utm_medium),
    utm_campaign = COALESCE(public.site_visitors.utm_campaign, EXCLUDED.utm_campaign),
    utm_content = COALESCE(public.site_visitors.utm_content, EXCLUDED.utm_content),
    utm_term = COALESCE(public.site_visitors.utm_term, EXCLUDED.utm_term),
    device_category = EXCLUDED.device_category,
    browser = COALESCE(EXCLUDED.browser, public.site_visitors.browser),
    operating_system = COALESCE(EXCLUDED.operating_system, public.site_visitors.operating_system),
    last_visited_path = EXCLUDED.last_visited_path,
    last_event_type = EXCLUDED.last_event_type,
    total_events = public.site_visitors.total_events + 1;

  INSERT INTO public.site_visitor_page_events (
    visitor_id, page_path, event_type, property_id, event_metadata
  )
  VALUES (p_visitor_id, p_page_path, p_event_type, v_property_id, v_metadata);
END;
$$;

REVOKE ALL ON FUNCTION public.record_site_visitor_event(UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_site_visitor_event(UUID, TEXT, TEXT, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.get_admin_site_visitors(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_search TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_traffic_source TEXT DEFAULT NULL,
  p_page_path TEXT DEFAULT NULL,
  p_event_type TEXT DEFAULT NULL,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_until TIMESTAMPTZ DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'last_active'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_page IS NULL OR p_page < 1 OR p_page > 10000
     OR p_page_size NOT IN (20, 30, 50, 100)
     OR length(COALESCE(p_search, '')) > 100
     OR length(COALESCE(p_location, '')) > 100
     OR length(COALESCE(p_page_path, '')) > 300
     OR (p_traffic_source IS NOT NULL AND p_traffic_source NOT IN ('direct', 'organic_search', 'social', 'referral', 'campaign', 'unknown'))
     OR (p_event_type IS NOT NULL AND p_event_type NOT IN (
       'page_view', 'navigation', 'search', 'filter',
       'login_page_view', 'register_page_view', 'login_attempt', 'register_attempt',
       'cta_click', 'property_impression', 'property_detail_view',
       'contact_admin_click', 'enquiry_initiated'
     ))
     OR p_sort_by NOT IN ('last_active', 'first_seen', 'events', 'page_views')
     OR (p_since IS NOT NULL AND p_until IS NOT NULL AND p_until < p_since) THEN
    RAISE EXCEPTION 'invalid site visitor filters' USING ERRCODE = '22023';
  END IF;

  WITH matching AS MATERIALIZED (
    SELECT v.*
    FROM public.site_visitors v
    WHERE (p_search IS NULL OR btrim(p_search) = ''
      OR v.visitor_id::TEXT ILIKE '%' || replace(replace(replace(btrim(p_search), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' ESCAPE E'\\'
      OR COALESCE(v.last_visited_path, '') ILIKE '%' || replace(replace(replace(btrim(p_search), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' ESCAPE E'\\'
      OR COALESCE(v.landing_page, '') ILIKE '%' || btrim(p_search) || '%'
      OR COALESCE(v.referrer_domain, '') ILIKE '%' || btrim(p_search) || '%'
      OR COALESCE(v.utm_source, '') ILIKE '%' || btrim(p_search) || '%'
      OR COALESCE(v.utm_campaign, '') ILIKE '%' || btrim(p_search) || '%'
      OR COALESCE(v.utm_content, '') ILIKE '%' || btrim(p_search) || '%'
      OR COALESCE(v.utm_term, '') ILIKE '%' || btrim(p_search) || '%'
      OR COALESCE(v.city, '') ILIKE '%' || btrim(p_search) || '%'
      OR COALESCE(v.region, '') ILIKE '%' || btrim(p_search) || '%'
      OR COALESCE(v.country_name, '') ILIKE '%' || btrim(p_search) || '%'
      OR EXISTS (
        SELECT 1
        FROM public.site_visitor_page_events search_events
        WHERE search_events.visitor_id = v.visitor_id
          AND (p_since IS NULL OR search_events.visited_at >= p_since)
          AND (p_until IS NULL OR search_events.visited_at < p_until)
          AND (
            search_events.page_path ILIKE '%' || btrim(p_search) || '%'
            OR search_events.event_type ILIKE '%' || btrim(p_search) || '%'
            OR search_events.event_metadata::TEXT ILIKE '%' || btrim(p_search) || '%'
          )
      ))
      AND (p_location IS NULL OR btrim(p_location) = ''
        OR COALESCE(v.city, '') ILIKE '%' || btrim(p_location) || '%'
        OR COALESCE(v.region, '') ILIKE '%' || btrim(p_location) || '%'
        OR COALESCE(v.country_code, '') ILIKE '%' || btrim(p_location) || '%'
        OR COALESCE(v.country_name, '') ILIKE '%' || btrim(p_location) || '%')
      AND (p_traffic_source IS NULL OR v.traffic_source = p_traffic_source)
      AND ((p_since IS NULL AND p_until IS NULL AND p_page_path IS NULL AND p_event_type IS NULL)
        OR EXISTS (
          SELECT 1
          FROM public.site_visitor_page_events e
          WHERE e.visitor_id = v.visitor_id
            AND (p_since IS NULL OR e.visited_at >= p_since)
            AND (p_until IS NULL OR e.visited_at < p_until)
            AND (p_page_path IS NULL OR e.page_path ILIKE '%' || btrim(p_page_path) || '%')
            AND (p_event_type IS NULL OR e.event_type = p_event_type)
        ))
  ),
  page_rows AS (
    SELECT
      visitor_id AS id, first_seen_at, last_seen_at, page_views, country_code, country_name,
      region, city, traffic_source, referrer_domain, landing_page,
      last_visited_path, last_event_type, utm_source, utm_medium, utm_campaign,
      utm_content, utm_term,
      device_category, browser, operating_system, total_events
    FROM matching
    ORDER BY
      CASE WHEN p_sort_by = 'first_seen' THEN first_seen_at END DESC,
      CASE WHEN p_sort_by = 'events' THEN total_events END DESC,
      CASE WHEN p_sort_by = 'page_views' THEN page_views END DESC,
      last_seen_at DESC,
      visitor_id
    OFFSET (p_page - 1) * p_page_size LIMIT p_page_size
  )
  SELECT jsonb_build_object(
    'items', COALESCE((SELECT jsonb_agg(to_jsonb(page_rows)) FROM page_rows), '[]'::JSONB),
    'total', (SELECT count(*) FROM matching)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_site_visitors(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_site_visitors(INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.prune_site_visitor_activity()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND session_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.site_visitor_page_events WHERE visited_at < now() - INTERVAL '180 days';
  DELETE FROM public.site_visitors WHERE last_seen_at < now() - INTERVAL '180 days';
  DELETE FROM public.site_visitor_access_logs WHERE accessed_at < now() - INTERVAL '365 days';
END;
$$;

REVOKE ALL ON FUNCTION public.prune_site_visitor_activity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_site_visitor_activity() TO service_role;

DO $$
DECLARE
  v_job_exists BOOLEAN;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = $1)'
      INTO v_job_exists
      USING 'livarex-site-visitor-retention';
    IF NOT v_job_exists THEN
      EXECUTE $schedule$
        SELECT cron.schedule(
          'livarex-site-visitor-retention',
          '30 3 * * *',
          'SELECT public.prune_site_visitor_activity()'
        )
      $schedule$;
    END IF;
  END IF;
END;
$$;
