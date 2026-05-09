-- Migration 8: Make properties.address nullable
-- Run this in the Supabase SQL Editor

ALTER TABLE public.properties
  ALTER COLUMN address DROP NOT NULL;
