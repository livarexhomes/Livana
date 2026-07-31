-- Run this in the Supabase SQL editor: https://app.supabase.com → SQL Editor
-- Creates the projects table used by the admin Projects tab and the
-- homepage off-plan developments section. Safe to re-run.

CREATE TABLE IF NOT EXISTS projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  developer   TEXT        NOT NULL,
  location    TEXT        NOT NULL,
  map_link    TEXT,
  description TEXT,
  image       TEXT,
  price       NUMERIC     NOT NULL DEFAULT 0,
  down        NUMERIC     NOT NULL DEFAULT 20,
  completion  TEXT,
  progress    NUMERIC     NOT NULL DEFAULT 0,
  units       NUMERIC     NOT NULL DEFAULT 0,
  sold        NUMERIC     NOT NULL DEFAULT 0,
  category    TEXT        NOT NULL DEFAULT 'Residential',
  status      TEXT        NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'coming_soon', 'completed', 'on_hold')),
  type        TEXT        NOT NULL DEFAULT 'sale',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- map_link may have been added by an earlier partial migration
ALTER TABLE projects ADD COLUMN IF NOT EXISTS map_link TEXT;

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_projects_updated_at();

-- RLS: anyone can read published projects; only authenticated (admin) users
-- can insert/update/delete.
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects"
  ON projects FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "auth_insert_projects" ON projects;
CREATE POLICY "auth_insert_projects"
  ON projects FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_projects" ON projects;
CREATE POLICY "auth_update_projects"
  ON projects FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_projects" ON projects;
CREATE POLICY "auth_delete_projects"
  ON projects FOR DELETE TO authenticated
  USING (true);

-- Allow realtime (no-op if already a member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE projects;
  END IF;
END $$;

-- ── Cover-image storage (project-images bucket) ───────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_upload_project_images" ON storage.objects;
CREATE POLICY "auth_upload_project_images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-images');

DROP POLICY IF EXISTS "auth_update_project_images" ON storage.objects;
CREATE POLICY "auth_update_project_images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'project-images') WITH CHECK (bucket_id = 'project-images');

DROP POLICY IF EXISTS "auth_delete_project_images" ON storage.objects;
CREATE POLICY "auth_delete_project_images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-images');

