---
name: LIVAREX SSG prerender pipeline
description: Build-time static HTML generation for SEO — how the SSR pipeline is structured.
---

# Rule
Static prerendering runs at build time: client build → SSR bundle → prerender script.

# Files
- `artifacts/property-manager/src/entry-server.tsx` — SSR entry (wouter static hook, no lazy imports)
- `scripts/prerender.mjs` — node ESM script that renders 6 routes and injects into dist/public
- `artifacts/property-manager/package.json` — has `build:ssr` script
- `vercel.json` (root) — buildCommand chains: `build && build:ssr && node scripts/prerender.mjs`

# Routes prerendered
`/`, `/listings`, `/about`, `/contact`, `/terms`, `/privacy-policy`

**Why:** Google crawler sees empty `<div id="root"></div>` for SPAs. SSG injects real HTML so Googlebot indexes full content immediately without waiting for JS execution.

**How to apply:** Any new public marketing page should be added to both `entry-server.tsx` imports/routes and the `ROUTES` array in `scripts/prerender.mjs`.

# Pitfalls
- Do NOT use `React.lazy` in entry-server.tsx — renderToString cannot resolve lazy chunks.
- Leaflet imports `document` at module level — keep PropertyDetailPage OUT of entry-server.tsx.
- vite.config.ts uses `defineConfig(async ({ isSsrBuild }) => ({}))` form so `isSsrBuild` can control outDir and plugin list.
