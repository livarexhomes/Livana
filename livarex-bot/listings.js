// ── Property listings fetcher (Supabase) ───────────────────────────────────
// Uses VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (shared with the main app)

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CACHE_TTL            = 15 * 60 * 1000  // 15 minutes

let cachedListings = null
let cacheExpiry    = 0

export async function fetchListings() {
  if (cachedListings && Date.now() < cacheExpiry) return cachedListings

  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      // No status filter in the query itself — different admin flows / environments
      // may use different status values ('approved', 'active', 'published', 'live'),
      // and a hardcoded `status=eq.approved` filter silently returns zero rows the
      // moment it doesn't match, with no error to tell you why. Instead we fetch
      // recent properties and filter client-side against a configurable allow-list,
      // so a mismatch is loud (logged) instead of silent.
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/properties?select=id,title,property_type,city,state,price,bedrooms,bathrooms,description,status&order=created_at.desc&limit=50`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      )

      if (res.ok) {
        const data = await res.json()

        const allowedStatuses = (process.env.LISTING_APPROVED_STATUSES || "approved,active,published,live")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)

        const approved = data.filter((p) => allowedStatuses.includes(String(p.status || "").toLowerCase()))

        if (data.length && approved.length === 0) {
          const distinctStatuses = [...new Set(data.map((p) => p.status))]
          console.warn(
            `⚠️ Supabase returned ${data.length} properties but none matched allowed statuses ` +
            `[${allowedStatuses.join(", ")}]. Actual status values in use: [${distinctStatuses.join(", ")}]. ` +
            `Set LISTING_APPROVED_STATUSES to match, e.g. LISTING_APPROVED_STATUSES=${distinctStatuses.join(",")}`
          )
        }

        cachedListings = approved.slice(0, 15).map((p) => ({
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
        console.log(`✅ Loaded ${cachedListings.length} listings from Supabase (of ${data.length} fetched)`)
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
        `• *${p.title}* (id: ${p.id}) | ${p.type} | ${p.location} | ${p.price} | ${p.bedrooms ?? "?"}bed/${p.bathrooms ?? "?"}bath\n  ${p.description.slice(0, 120)}`
    )
    .join("\n\n")
}