// ── Property listings fetcher (Supabase) ───────────────────────────────────

const SUPABASE_URL      = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const CACHE_TTL         = 15 * 60 * 1000  // 15 minutes

let cachedListings = null
let cacheExpiry    = 0

export async function fetchListings() {
  if (cachedListings && Date.now() < cacheExpiry) return cachedListings

  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/properties?status=eq.approved&select=id,title,property_type,city,price,bedrooms,bathrooms,description&order=created_at.desc&limit=15`,
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
          location: p.city,
          price: p.price ? `₦${Number(p.price).toLocaleString()}` : "Price on request",
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          description: p.description || "",
        }))
        cacheExpiry = Date.now() + CACHE_TTL
        return cachedListings
      }
    } catch (err) {
      console.error("Supabase listings fetch failed:", err.message)
    }
  }

  // Fallback hardcoded listings
  return getFallbackListings()
}

export function formatListingsForAI(listings) {
  if (!listings || !listings.length) return "No listings currently available."
  return listings
    .slice(0, 10)
    .map(
      (p) =>
        `• *${p.title}* | ${p.type} | ${p.location} | ${p.price} | ${p.bedrooms ?? "?"}bed/${p.bathrooms ?? "?"}bath\n  ${p.description.slice(0, 120)}`
    )
    .join("\n\n")
}

function getFallbackListings() {
  return [
    {
      id: "1", title: "Luxury 4-Bedroom Duplex",
      type: "Duplex", location: "Lekki Phase 1, Lagos",
      price: "₦85,000,000", bedrooms: 4, bathrooms: 4,
      description: "Fully furnished luxury duplex with BQ, smart home features, and 24/7 security.",
    },
    {
      id: "2", title: "3-Bedroom Apartment",
      type: "Apartment", location: "Victoria Island, Lagos",
      price: "₦55,000,000", bedrooms: 3, bathrooms: 3,
      description: "Ocean-view apartment in a serviced estate with pool, gym, and 24-hour power.",
    },
    {
      id: "3", title: "5-Bedroom Detached House",
      type: "Detached House", location: "Ikoyi, Lagos",
      price: "₦200,000,000", bedrooms: 5, bathrooms: 6,
      description: "Stunning detached mansion with pool, cinema room, and manicured gardens.",
    },
  ]
}
