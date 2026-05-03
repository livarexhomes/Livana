-- ============================================================
-- Livana Migration 2 — Property Comments
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Comments on property listings (tenants only)
CREATE TABLE IF NOT EXISTS property_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL,
  tenant_name TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by property
CREATE INDEX IF NOT EXISTS idx_property_comments_property_id ON property_comments(property_id);

-- Enable Row Level Security
ALTER TABLE property_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "Anyone can read comments"
  ON property_comments FOR SELECT USING (true);

-- Authenticated users can insert their own comments
CREATE POLICY "Tenants can post comments"
  ON property_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
