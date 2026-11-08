-- Run against a migrated Supabase database to verify analytics table grants.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  IF to_regclass('public.property_visitor_sessions') IS NULL
     OR to_regclass('public.property_analytics_events') IS NULL
     OR to_regclass('public.property_analytics_daily') IS NULL
     OR to_regclass('public.property_visitor_access_logs') IS NULL THEN
    RAISE EXCEPTION 'Analytics tables are missing. Apply db/migrations/036_property_analytics.sql before running this test.';
  END IF;

  FOREACH table_name IN ARRAY ARRAY[
    'property_visitor_sessions',
    'property_analytics_events',
    'property_analytics_daily',
    'property_visitor_access_logs'
  ]
  LOOP
    IF NOT has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
       AND NOT has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
       AND NOT has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
       AND NOT has_table_privilege('anon', format('public.%I', table_name), 'DELETE')
       AND NOT has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')
       AND NOT has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
       AND NOT has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
       AND NOT has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
       AND has_table_privilege('service_role', format('public.%I', table_name), 'SELECT')
    THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Unexpected analytics table grants on %', table_name;
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
    'public.record_property_analytics_event(uuid,uuid,text,uuid)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.record_property_analytics_event(uuid,uuid,text,uuid)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.record_property_analytics_event(uuid,uuid,text,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Unexpected event recorder function grants';
  END IF;
END;
$$;
