-- Approximate public-site visitors using a first-party browser identifier.
-- No IP address, account details, or page URL is stored.

CREATE TABLE IF NOT EXISTS public.site_visitors (
  visitor_id UUID PRIMARY KEY,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  page_views BIGINT NOT NULL DEFAULT 1 CHECK (page_views > 0)
);

ALTER TABLE public.site_visitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_visitors_admin_select" ON public.site_visitors;
CREATE POLICY "site_visitors_admin_select"
  ON public.site_visitors FOR SELECT TO authenticated
  USING (public.is_admin());

REVOKE ALL ON TABLE public.site_visitors FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.site_visitors TO authenticated;

CREATE OR REPLACE FUNCTION public.record_site_visit(p_visitor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_visitor_id IS NULL THEN
    RAISE EXCEPTION 'visitor_id is required';
  END IF;

  INSERT INTO public.site_visitors (visitor_id)
  VALUES (p_visitor_id)
  ON CONFLICT (visitor_id) DO UPDATE
    SET last_seen_at = now(),
        page_views = public.site_visitors.page_views + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.record_site_visit(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_site_visit(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_site_visitor_stats()
RETURNS TABLE (total_visitors BIGINT, visitors_today BIGINT, page_views BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lagos_day_start TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  lagos_day_start := (now() AT TIME ZONE 'Africa/Lagos')::DATE::TIMESTAMP
    AT TIME ZONE 'Africa/Lagos';

  RETURN QUERY
    SELECT
      count(*)::BIGINT,
      count(*) FILTER (WHERE last_seen_at >= lagos_day_start)::BIGINT,
      coalesce(sum(site_visitors.page_views), 0)::BIGINT
    FROM public.site_visitors;
END;
$$;

REVOKE ALL ON FUNCTION public.get_site_visitor_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_visitor_stats() TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'site_visitors'
    )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_visitors;
  END IF;
END
$$;
