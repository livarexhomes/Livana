---
name: Supabase email signup
description: Account creation behavior when Supabase email confirmation is enabled
---

Supabase `auth.signUp` can successfully create a user while returning no session because email confirmation is enabled. Registration must treat that as success, show the confirmation state, and let the normal sign-in flow create or finish the profile.

**Why:** Immediately calling `signInWithPassword` after signup produces an avoidable “email not confirmed” failure and makes a successful account creation look broken.

**How to apply:** Only perform an immediate tenant/profile upsert and redirect when `data.session` exists. Otherwise send the welcome email if available and show the confirmation instructions. Map common Auth errors to actionable user-facing messages without exposing provider internals.