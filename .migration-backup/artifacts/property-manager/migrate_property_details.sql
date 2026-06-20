-- ============================================================
-- Migration: Add amenities and location coordinates to properties
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add amenities column (JSONB array to store selected amenities)
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb;

-- Add latitude and longitude columns for map coordinates
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8);

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

-- Add comment for documentation
COMMENT ON COLUMN public.properties.amenities IS 'JSON array of amenity labels (e.g., ["WiFi", "Parking", "Pool"])';
COMMENT ON COLUMN public.properties.latitude IS 'Property latitude for map display';
COMMENT ON COLUMN public.properties.longitude IS 'Property longitude for map display';
