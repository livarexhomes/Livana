/**
 * Build-time static prerender script for LIVAREX.
 * Generates pre-rendered HTML for key public routes so Google, and social
 * link-preview crawlers (WhatsApp/Twitter/Facebook), see correct per-route
 * <title>/<meta>/<link> tags without executing JavaScript.
 *
 * Run after:  vite build && vite build --ssr src/entry-server.tsx &&
 *             node --import tsx scripts/build-location-slugs.mjs
 * Command:    node scripts/prerender.mjs
 *
 * (Deliberately plain Node, no TS loader: registering tsx for this whole
 * process breaks named-export interop when it also has to load the already
 * -built entry-server.js SSR bundle, which imports react-helmet-async. The
 * location slug list is instead produced ahead of time as JSON by
 * build-location-slugs.mjs — run that under tsx separately — so this script
 * still derives its routes from the single canonical source of truth
 * without needing a TS loader itself.)
 *
 * Note on react-helmet-async + React 19: react-helmet-async v3's SSR context
 * extraction (`helmetContext.helmet`) relies on lifecycle hooks that never
 * fire during `renderToString` under React 19 — it stays `undefined`. React
 * 19 instead hoists <title>/<meta>/<link> natively wherever <Helmet> renders
 * them in the tree, so they show up directly inside the returned `html`
 * string. This script extracts those tags out of `html` and merges them into
 * the document `<head>` (overriding only the matching generic defaults from
 * index.html, keyed by tag name/property so unrelated defaults like
 * `og:locale`, `twitter:site`, and the organization JSON-LD survive) instead
 * of relying on the (non-functional) `helmet` object.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '../artifacts/property-manager')

// In production launch mode (VERCEL_ENV=production and LAUNCH_MODE !== 'disabled'),
// the site is a temporary "Launching Soon" page. Only `/` is prerendered; the
// vercel.json rewrite rule catches all other routes and falls back to /index.html
// (the launch page), so no application functionality is exposed.
// Set LAUNCH_MODE=disabled in the Vercel Production environment to manually go
// live (prerenders all routes with real app content).
// In preview/dev (VERCEL_ENV !== 'production'), every key route is prerendered
// with its real content so the Vercel preview URL serves as a live demo.
const isLaunchMode = process.env.VERCEL_ENV === 'production' && process.env.LAUNCH_MODE !== 'disabled'

const STATIC_ROUTES = isLaunchMode
  ? ['/']
  : [
      '/',
      '/listings',
      '/about',
      '/contact',
      '/terms',
      '/privacy-policy',
      '/cookie-policy',
      '/how-we-verify',
    ]

// Every canonical state + neighbourhood (see nigerianStates.ts) gets its own
// prerendered /properties-in/:slug page so all of them — not just a
// hand-picked subset — are crawlable with correct location-specific SEO.
// Skipped in launch mode since the launch page serves as a catch-all.
let ROUTES
if (isLaunchMode) {
  ROUTES = ['/']
} else {
  const slugsPath = resolve(__dirname, 'location-slugs.json')
  if (!existsSync(slugsPath)) {
    // Regenerate on demand so a stale/missing file never silently falls back
    // to a hand-picked subset of routes.
    execFileSync(
      process.execPath,
      ['--import', resolve(__dirname, 'node_modules/tsx/dist/loader.mjs'), resolve(__dirname, 'build-location-slugs.mjs')],
      { stdio: 'inherit' }
    )
  }
  const locationSlugs = JSON.parse(readFileSync(slugsPath, 'utf-8'))
  ROUTES = [...STATIC_ROUTES, ...locationSlugs.map(slug => `/properties-in/${slug}`)]
}

// Tags rendered by <SEO/> that need to be lifted out of the body markup and
// merged into <head>, keyed by their name/property/rel so a route's tag
// overrides only the matching default tag and nothing else.
const TAG_MATCHERS = [
  /<title>[\s\S]*?<\/title>/g,
  /<meta\s+name="[^"]*"[^>]*\/?>/g,
  /<meta\s+property="[^"]*"[^>]*\/?>/g,
  /<link\s+rel="canonical"[^>]*\/?>/g,
  /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/g,
]

function keyOf(tag) {
  const attr = tag.match(/(?:name|property|rel)="([^"]+)"/)
  if (attr) return attr[1]
  if (tag.startsWith('<title')) return 'title'
  if (tag.startsWith('<script')) return 'ld+json'
  return tag
}

/** Extracts head-worthy tags out of an HTML string, keyed by identity, and
 * returns the remaining HTML with those tags removed. */
function extractHeadTags(html) {
  let remaining = html
  const map = new Map()
  for (const pattern of TAG_MATCHERS) {
    const matches = remaining.match(pattern) ?? []
    for (const m of matches) {
      map.set(keyOf(m), m)
      remaining = remaining.replace(m, '')
    }
  }
  return { map, bodyHtml: remaining }
}

async function prerender() {
  const templatePath = resolve(projectRoot, 'dist/public/index.html')
  const rawTemplate = readFileSync(templatePath, 'utf-8')
  const { map: defaultTags, bodyHtml: headlessTemplate } = extractHeadTags(rawTemplate)

  const serverBundle = resolve(projectRoot, 'dist/server/entry-server.js')
  const { render } = await import(serverBundle)

  let succeeded = 0
  let failed = 0

  for (const route of ROUTES) {
    try {
      const { html } = render(route)
      const { map: routeTags, bodyHtml } = extractHeadTags(html)

      // Start from the page's own defaults, then let route-specific tags
      // override only the keys they actually provide — anything the route
      // doesn't emit (og:locale, twitter:site, the organization JSON-LD,
      // etc.) keeps the site-wide default.
      const mergedTags = new Map(defaultTags)
      for (const [key, tag] of routeTags) mergedTags.set(key, tag)

      const headBlock = [...mergedTags.values()].join('\n')
      const finalHtml = headlessTemplate
        .replace('</head>', `${headBlock}\n</head>`)
        .replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`)

      const outputPath =
        route === '/'
          ? resolve(projectRoot, 'dist/public/index.html')
          : resolve(projectRoot, `dist/public${route}/index.html`)

      mkdirSync(dirname(outputPath), { recursive: true })
      writeFileSync(outputPath, finalHtml, 'utf-8')

      console.log(`  ✓  ${route}  (${routeTags.size} route-specific tags)`)
      succeeded++
    } catch (err) {
      console.warn(`  ✗  ${route}  (${err.message})`)
      failed++
    }
  }

  console.log(`\nPrerender complete — ${succeeded} ok, ${failed} failed.`)
  if (failed > 0) {
    process.exit(1)
  }
}

prerender().catch((err) => {
  console.error('Prerender script failed:', err)
  process.exit(1)
})
