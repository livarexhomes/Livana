// ── Property listings fetcher (Supabase) ───────────────────────────────────
// Uses VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (shared with the main app)

const SUPABASE_URL      = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CACHE_TTL         = 15 * 60 * 1000  // 15 minutes

let cachedListings = null
let cacheExpiry    = 0

export async function fetchListings() {
  if (cachedListings && Date.now() < cacheExpiry) return cachedListings

  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/properties?status=eq.approved&select=id,title,property_type,city,state,price,bedrooms,bathrooms,description&order=created_at.desc&limit=15`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      )
      if (res.ok) {
        const data = await res.json()
        cachedListings = data.map((p) => ({
          id: p.id,
          title: p.title,
          type: p.property_type || "Property",
          location: [p.city, p.state].filter(Boolean).join(", "),
          price: p.price ? `₦${Number(p.price).toLocaleString()}` : "Price on request",
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          description: p.description || "",
        }))
        cacheExpiry = Date.now() + CACHE_TTL
        console.log(`✅ Loaded ${cachedListings.length} listings from Supabase`)
        return cachedListings
      } else {
        console.error("Supabase listings fetch HTTP error:", res.status)
      }
    } catch (err) {
      console.error("Supabase listings fetch failed:", err.message)
    }
  }

  // No fallback fabricated listings — return empty so AI responds honestly
  return []
}

export function formatListingsForAI(listings) {
  if (!listings || !listings.length) return null
  return listings
    .slice(0, 10)
    .map(
      (p) =>
        `• *${p.title}* | ${p.type} | ${p.location} | ${p.price} | ${p.bedrooms ?? "?"}bed/${p.bathrooms ?? "?"}bath\n  ${p.description.slice(0, 120)}`
    )
    .join("\n\n")
}
