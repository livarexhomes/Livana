---
name: LIVAREX Vercel deployment setup
description: How the project is wired to Vercel — root vercel.json, not inside artifact.
---

# Rule
`vercel.json` lives at the workspace ROOT (not inside `artifacts/property-manager/`).

**Why:** Vercel is pointed at the repo root. The buildCommand runs a pnpm workspace filter command. outputDirectory points into the artifact's dist folder.

**How to apply:** Always edit `/vercel.json` for build/output/rewrite changes. Do NOT create a vercel.json inside `artifacts/property-manager/`.

# Key config
- buildCommand: `pnpm --filter @workspace/property-manager run build && ... build:ssr && node scripts/prerender.mjs`
- outputDirectory: `artifacts/property-manager/dist/public`
- API functions: root-level `api/` directory (e.g. `api/send-confirmation.ts`, `api/delete-user.ts`)
