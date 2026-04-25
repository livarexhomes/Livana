# Replit Project — Property Manager monorepo

This pnpm monorepo hosts a Next.js Property Manager app and supporting services.

## Artifacts

- **`artifacts/property-manager/`** — **Next.js 15 App Router** web app (Property Manager). Served at `/` on port `21844`.
  - Tailwind CSS v4 (via `@tailwindcss/postcss`)
  - Supabase via `@supabase/ssr` (browser + server clients)
  - Long-running production server (`next start`), not a static export — server actions and middleware are used.
  - Auth-aware middleware in `src/middleware.ts` redirects `/admin/*` and `/landlord/*` based on session.
- **`artifacts/api-server/`** — Express API server (existing scaffold, not used by the Property Manager app).
- **`artifacts/mockup-sandbox/`** — Mockup/canvas sandbox.

## Required environment variables

Set these in the Secrets pane (shared environment) before the Property Manager app can talk to Supabase:

- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase public anon key

The app gracefully degrades when these are unset (Supabase calls return empty data and middleware passes through), so the home page still renders during initial setup.

## Routing structure (Next.js)

- `/` — public home
- `/about`, `/contact` — public marketing
- `/listings`, `/listings/[id]` — public listings
- `/admin/login`, `/admin`, `/admin/landlords`, `/admin/properties[/new|/[id]/edit]` — admin
- `/landlord/{login,register,pending,rejected}`, `/landlord` (dashboard), `/landlord/listings[/new|/[id]/edit]`, `/landlord/profile` — landlord
- `/auth/callback`, `/auth/signout` — auth helpers

## Notes

- The original task plan asked for a Vite + React port, but the user explicitly requested Next.js, so the artifact runs `next dev` / `next start` instead. The artifact metadata still lists `react-vite` as the integrated skill (artifact metadata is locked once registered).
- Do not run `pnpm dev` at the workspace root — apps run via Replit workflows.
