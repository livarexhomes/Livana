// Canonical URL-slug helpers for /properties-in/:slug pages. Shared by the
// client router (redirect to /listings?city=...), the SSR entry point
// (renders per-location <SEO/> for prerendering), and the build-time
// prerender script (derives the full list of routes to generate) so all
// three stay in lockstep with `NIGERIAN_STATES` / `POPULAR_AREAS`.

import { NIGERIAN_STATES, POPULAR_AREAS } from './nigerianStates'

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const ALL_LOCATIONS: string[] = [
  ...NIGERIAN_STATES,
  ...Object.values(POPULAR_AREAS).flat(),
]

const SLUG_TO_LABEL: Record<string, string> = Object.fromEntries(
  ALL_LOCATIONS.map(name => [slugify(name), name])
)

/**
 * Resolve a URL slug (e.g. "victoria-island") back to its canonical display
 * label (e.g. "Victoria Island"). Falls back to naive title-casing for any
 * slug outside the canonical state/area lists, so unrecognised slugs still
 * degrade gracefully instead of erroring.
 */
export function slugToLocationLabel(slug: string): string {
  const known = SLUG_TO_LABEL[slug]
  if (known) return known
  return (slug ?? '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/** Every canonical state + neighbourhood slug, e.g. for prerendering. */
export function allLocationSlugs(): string[] {
  return ALL_LOCATIONS.map(slugify)
}
