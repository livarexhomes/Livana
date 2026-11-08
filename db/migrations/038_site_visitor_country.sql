-- Store only a coarse country code supplied by the hosting edge.
-- Raw IP addresses are neither stored nor sent to a geolocation provider.

ALTER TABLE public.site_visitors
  ADD COLUMN IF NOT EXISTS country_code TEXT
  CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');

REVOKE ALL ON FUNCTION public.record_site_page_visit(UUID, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_site_page_visit(
  p_visitor_id UUID,
  p_page_path TEXT,
  p_country_code TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_visitor_id IS NULL OR p_page_path IS NULL
     OR length(p_page_path) NOT BETWEEN 1 AND 300
     OR left(p_page_path, 1) <> '/'
     OR left(p_page_path, 2) = '//'
     OR position('?' IN p_page_path) > 0
     OR position('#' IN p_page_path) > 0
     OR p_page_path ~* '^/(admin|landlord|user)(/|$)'
     OR p_page_path ~* '^/(login|register|reset-password|auth)(/|$)'
     OR (p_country_code IS NOT NULL AND p_country_code !~ '^[A-Z]{2}$') THEN
    RAISE EXCEPTION 'invalid public site page visit' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.site_visitors (visitor_id, country_code)
  VALUES (p_visitor_id, p_country_code)
  ON CONFLICT (visitor_id) DO UPDATE
    SET last_seen_at = now(),
        page_views = public.site_visitors.page_views + 1,
        country_code = COALESCE(EXCLUDED.country_code, public.site_visitors.country_code);

  INSERT INTO public.site_visitor_page_events (visitor_id, page_path)
  VALUES (p_visitor_id, p_page_path);
END;
$$;

REVOKE ALL ON FUNCTION public.record_site_page_visit(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_site_page_visit(UUID, TEXT, TEXT) TO service_role;
