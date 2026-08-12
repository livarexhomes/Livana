-- Migration 013: Drop the duplicate on_landlord_signup trigger
-- ============================================================================
-- Root cause: two AFTER INSERT triggers exist on auth.users:
--   1. on_auth_user_created  → handle_new_user      (fixed in migration 010)
--   2. on_landlord_signup    → handle_new_landlord   (← THIS is the bug)
--
-- Migration 010 correctly patched handle_new_user so it only creates a
-- landlord profile when raw_user_meta_data->>'role' = 'landlord'. But the
-- second trigger (on_landlord_signup) was never updated — it fires on every
-- new auth.users INSERT and calls handle_new_landlord, which creates a
-- landlord row for ALL new users regardless of role.
--
-- Fix: drop the duplicate trigger and its function entirely.
-- handle_new_user (on_auth_user_created) is the single source of truth for
-- post-signup profile creation and already handles the landlord case.
--
-- Run in Supabase SQL Editor:
--   Dashboard → SQL Editor → New query → paste → Run
-- ============================================================================

DROP TRIGGER IF EXISTS on_landlord_signup ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_landlord();
