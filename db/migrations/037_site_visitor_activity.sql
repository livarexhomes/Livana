-- Add public-page history to the existing anonymous site visitor counter.
-- These records stay anonymous and are available only through the admin Edge Function.

CREATE TABLE IF NOT EXISTS public.site_visitor_page_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES public.site_visitors(visitor_id) ON DELETE CASCADE,
  page_path TEXT NOT NULL CHECK (
    length(page_path) BETWEEN 1 AND 300
    AND left(page_path, 1) = '/'
    AND left(page_path, 2) <> '//'
    AND position('?' IN page_path) = 0
    AND position('#' IN page_path) = 0
  ),
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_visitor_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  visitor_id UUID NOT NULL REFERENCES public.site_visitors(visitor_id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_visitor_page_events_visitor_time_idx
  ON public.site_visitor_page_events (visitor_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS site_visitor_page_events_time_idx
  ON public.site_visitor_page_events (visited_at DESC);
CREATE INDEX IF NOT EXISTS site_visitor_access_logs_admin_time_idx
  ON public.site_visitor_access_logs (admin_user_id, accessed_at DESC);

ALTER TABLE public.site_visitor_page_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visitor_access_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.site_visitor_page_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.site_visitor_access_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.site_visitor_page_events TO service_role;
GRANT ALL ON TABLE public.site_visitor_access_logs TO service_role;

CREATE OR REPLACE FUNCTION public.record_site_page_visit(
  p_visitor_id UUID,
  p_page_path TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_visitor_id IS NULL OR p_page_path IS NULL
     OR length(p_page_path) NOT BETWEEN 1 AND 300
     OR left(p_page_path, 1) <> '/'
     OR left(p_page_path, 2) = '//'
     OR position('?' IN p_page_path) > 0
     OR position('#' IN p_page_path) > 0
     OR p_page_path ~* '^/(admin|landlord|user)(/|$)'
     OR p_page_path ~* '^/(login|register|reset-password|auth)(/|$)' THEN
    RAISE EXCEPTION 'invalid public site page visit' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.site_visitors (visitor_id)
  VALUES (p_visitor_id)
  ON CONFLICT (visitor_id) DO UPDATE
    SET last_seen_at = now(),
        page_views = public.site_visitors.page_views + 1;

  INSERT INTO public.site_visitor_page_events (visitor_id, page_path)
  VALUES (p_visitor_id, p_page_path);
END;
$$;

REVOKE ALL ON FUNCTION public.record_site_page_visit(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_site_page_visit(UUID, TEXT) TO anon, authenticated;
