// ── Property listings fetcher ──────────────────────────────────────────────
// Scrapes/fetches listings from your CMS at www.livarex.com.org
// Update LISTINGS_API_URL to your actual API endpoint.

const LISTINGS_API_URL = process.env.LISTINGS_API_URL || "https://www.livarex.com.org/api/listings";

let cachedListings = null;
let cacheExpiry = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function fetchListings() {
  if (cachedListings && Date.now() < cacheExpiry) {
    return cachedListings;
  }

  try {
    const res = await fetch(LISTINGS_API_URL, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Normalise to our format — adjust field names to match your CMS
    cachedListings = (data.listings || data.properties || data || []).map((p) => ({
      id: p.id || p._id,
      title: p.title || p.name,
      type: p.type || p.property_type || "Property",
      location: p.location || p.area || p.city,
      price: p.price || p.amount,
      bedrooms: p.bedrooms || p.beds,
      bathrooms: p.bathrooms || p.baths,
      size: p.size || p.sqm || p.area_sqm,
      description: p.description || p.summary || "",
      url: p.url || p.link || `${LISTINGS_API_URL.replace("/api/listings", "")}/${p.slug || p.id}`,
      available: p.available !== false,
    })).filter((p) => p.available);

    cacheExpiry = Date.now() + CACHE_TTL;
    return cachedListings;
  } catch (err) {
    console.error("Failed to fetch listings:", err.message);
    // Return hardcoded fallback listings if site is unreachable
    return getFallbackListings();
  }
}

export function formatListingsForAI(listings) {
  if (!listings.length) return "No listings currently available.";
  return listings
    .slice(0, 10) // send max 10 to AI to avoid token bloat
    .map(
      (p) =>
        `• ${p.title} | ${p.type} | ${p.location} | ${p.price} | ${p.bedrooms ?? "?"}bed/${p.bathrooms ?? "?"}bath${p.size ? ` | ${p.size}sqm` : ""}\n  ${p.description.slice(0, 100)}... ${p.url}`
    )
    .join("\n\n");
}

// ── Fallback listings (hardcode your flagship properties here) ─────────────
function getFallbackListings() {
  return [
    {
      id: "1",
      title: "Luxury 4-Bedroom Duplex",
      type: "Duplex",
      location: "Lekki Phase 1, Lagos",
      price: "₦85,000,000",
      bedrooms: 4,
      bathrooms: 4,
      size: 320,
      description: "Fully furnished luxury duplex with BQ, smart home features, and 24/7 security.",
      url: "https://www.livarex.com.org",
      available: true,
    },
    {
      id: "2",
      title: "3-Bedroom Apartment",
      type: "Apartment",
      location: "Victoria Island, Lagos",
      price: "₦55,000,000",
      bedrooms: 3,
      bathrooms: 3,
      size: 180,
      description: "Ocean-view apartment in a serviced estate with pool, gym, and 24-hour power.",
      url: "https://www.livarex.com.org",
      available: true,
    },
    {
      id: "3",
      title: "5-Bedroom Detached House",
      type: "Detached House",
      location: "Ikoyi, Lagos",
      price: "₦200,000,000",
      bedrooms: 5,
      bathrooms: 6,
      size: 600,
      description: "Stunning detached mansion with pool, cinema room, and manicured gardens.",
      url: "https://www.livarex.com.org",
      available: true,
    },
  ];
}
