import { ALL_LOCATIONS, slugify } from './locationSlug'

// Every canonical state and neighbourhood gets its own dedicated opengraph
// share-card image (see NIGERIAN_STATES / POPULAR_AREAS), so shared links to
// a specific city/neighbourhood look relevant instead of showing the
// generic site-wide default.
const LOCATION_IMAGES: Record<string, string> = Object.fromEntries(
  ALL_LOCATIONS.map(name => [name.toLowerCase(), `/og/${slugify(name)}.jpg`])
)

/**
 * Resolve the best opengraph image for a given location string
 * (state, city, or neighbourhood). Matches loosely — e.g. "Lekki, Lagos"
 * still resolves to the Lekki share card — but checks the most specific
 * (longest) location names first so a neighbourhood match always wins over
 * its parent state (e.g. "Victoria Island, Lagos" resolves to Victoria
 * Island, not the generic Lagos card).
 */
export function getLocationImage(location?: string | null): string | undefined {
  if (!location) return undefined
  const normalized = location.toLowerCase()
  const keysByLengthDesc = Object.keys(LOCATION_IMAGES).sort((a, b) => b.length - a.length)
  for (const key of keysByLengthDesc) {
    if (normalized.includes(key)) return LOCATION_IMAGES[key]
  }
  return undefined
}
