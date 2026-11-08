-- Run after db/migrations/039_website_visitor_intelligence.sql.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'site_visitor_page_events'
      AND column_name = 'event_type'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'site_visitors'
      AND column_name = 'traffic_source'
  ) THEN
    RAISE EXCEPTION 'Website visitor intelligence schema is missing. Apply migration 039 first.';
  END IF;

  IF has_table_privilege('anon', 'public.site_visitors', 'SELECT')
     OR has_table_privilege('anon', 'public.site_visitor_page_events', 'SELECT') THEN
    RAISE EXCEPTION 'Anonymous clients must not read visitor identities or event histories.';
  END IF;

  IF NOT has_function_privilege(
    'service_role',
    'public.record_site_visitor_event(uuid,text,text,jsonb)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.record_site_visitor_event(uuid,text,text,jsonb)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.record_site_visitor_event(uuid,text,text,jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Site event writes must be service-role only.';
  END IF;

  IF NOT has_function_privilege(
    'service_role',
    'public.get_admin_site_visitors(integer,integer,text,text,text,text,text,timestamptz,timestamptz,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.get_admin_site_visitors(integer,integer,text,text,text,text,text,timestamptz,timestamptz,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Paginated visitor records must be service-role only.';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.prune_site_visitor_activity()',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.prune_site_visitor_activity()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Visitor retention cleanup must not be callable by browser roles.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_visitors'
      AND policyname = 'site_visitors_admin_select'
      AND qual ILIKE '%is_admin%'
  ) THEN
    RAISE EXCEPTION 'Visitor rows must remain restricted to authorized administrators.';
  END IF;

  IF NOT (
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid = 'public.site_visitor_page_events'::regclass
  ) THEN
    RAISE EXCEPTION 'Visitor journey events must retain row-level security.';
  END IF;

  IF NOT (
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid = 'public.site_visitors'::regclass
  ) THEN
    RAISE EXCEPTION 'Visitor records must retain row-level security.';
  END IF;
END;
$$;
