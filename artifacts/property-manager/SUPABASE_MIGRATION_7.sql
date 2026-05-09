-- Migration 7: Add missing columns to properties table
-- Run this in the Supabase SQL Editor

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS property_type TEXT,
  ADD COLUMN IF NOT EXISTS state        TEXT,
  ADD COLUMN IF NOT EXISTS description  TEXT;
