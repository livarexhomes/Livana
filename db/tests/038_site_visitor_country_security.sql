-- Run after db/migrations/038_site_visitor_country.sql.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'site_visitors'
      AND column_name = 'country_code'
  ) THEN
    RAISE EXCEPTION 'Country code column is missing. Apply db/migrations/038_site_visitor_country.sql first.';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.record_site_page_visit(uuid,text,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.record_site_page_visit(uuid,text,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.record_site_page_visit(uuid,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Country-aware site visit recorder must be service-role only';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.record_site_page_visit(uuid,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.record_site_page_visit(uuid,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Legacy direct site page recorder must not be executable by browser roles';
  END IF;
END;
$$;
