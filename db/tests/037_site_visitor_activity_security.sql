-- Run after db/migrations/038_site_visitor_country.sql.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  IF to_regclass('public.site_visitor_page_events') IS NULL
     OR to_regclass('public.site_visitor_access_logs') IS NULL THEN
    RAISE EXCEPTION 'Site visitor activity tables are missing. Apply db/migrations/037_site_visitor_activity.sql first.';
  END IF;

  FOREACH table_name IN ARRAY ARRAY[
    'site_visitor_page_events',
    'site_visitor_access_logs'
  ]
  LOOP
    IF has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
       OR has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
       OR has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
       OR has_table_privilege('anon', format('public.%I', table_name), 'DELETE')
       OR has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')
       OR has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
       OR has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
       OR has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
       OR NOT has_table_privilege('service_role', format('public.%I', table_name), 'SELECT')
       OR NOT has_table_privilege('service_role', format('public.%I', table_name), 'INSERT') THEN
      RAISE EXCEPTION 'Unexpected site visitor activity table grants on %', table_name;
    END IF;

    IF NOT (
      SELECT relrowsecurity FROM pg_class
      WHERE oid = format('public.%I', table_name)::REGCLASS
    ) THEN
      RAISE EXCEPTION 'RLS is not enabled on %', table_name;
    END IF;
  END LOOP;

  IF has_function_privilege(
    'anon',
    'public.record_site_page_visit(uuid,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.record_site_page_visit(uuid,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Direct site page recording must be revoked in favor of the server-side recorder';
  END IF;
END;
$$;
