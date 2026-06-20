import { Metadata } from "next";
import Link from "next/link";
import {
  createServerClient,
  isSupabaseConfigured,
} from "@/src/lib/supabase-server";
import PublicNavbar from "@/src/components/PublicNavbar";
import Footer from "@/src/components/Footer";
import PropertyCard from "@/src/components/PropertyCard";
import type { PropertyWithLandlord } from "@/src/lib/types";

export const metadata: Metadata = {
  title: "Properties for Rent in Lagos | Livarex",
  description:
    "Find verified apartments, houses, and commercial properties for rent in Lagos. Browse listings in Lekki, Ikoyi, Victoria Island, Ikeja, and more. All properties verified by Livarex.",
  openGraph: {
    title: "Properties for Rent in Lagos | Livarex",
    description:
      "Verified rental properties in Lagos. Browse apartments, houses, and commercial spaces in Lekki, Ikoyi, VI, Ikeja, and more.",
    url: "https://www.livarex.com.ng/properties/lagos",
  },
  alternates: {
    canonical: "https://www.livarex.com.ng/properties/lagos",
  },
};

async function getLagosProperties(): Promise<PropertyWithLandlord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createServerClient();
  const { data } = await supabase
    .from("properties")
    .select(
      "*, landlords(full_name, whatsapp, is_verified), property_images(storage_path, alt_text, is_cover)"
    )
    .eq("status", "available")
    .ilike("city", "%Lagos%")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);
  return (data as PropertyWithLandlord[]) ?? [];
}

export default async function LagosPage() {
  const properties = await getLagosProperties();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: properties.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://www.livarex.com.ng/listings/${p.id}`,
      name: p.title,
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      <main className="flex-1 pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          {/* Hero */}
          <div className="mb-12">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">
              Lagos, Nigeria
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              Properties in Lagos
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">
              Browse verified rental properties across Lagos. From Lekki to Ikoyi, Victoria Island to Ikeja — find your perfect home with Livarex&apos;s verified listings.
            </p>
          </div>

          {/* Areas */}
          <div className="flex flex-wrap gap-2 mb-10">
            {[
              "Lekki",
              "Ikoyi",
              "Victoria Island",
              "Ikeja",
              "Yaba",
              "Surulere",
              "Gbagada",
              "Ajah",
            ].map((area) => (
              <Link
                key={area}
                href={`/listings?city=Lagos&area=${encodeURIComponent(area)}`}
                className="px-4 py-2 rounded-full bg-gray-50 border border-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:border-gray-200 transition-all"
              >
                {area}
              </Link>
            ))}
          </div>

          {/* Properties */}
          {properties.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  saved={false}
                  isAuthenticated={false}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-gray-100">
              <p className="text-lg font-bold text-gray-700 mb-2">
                No properties available
              </p>
              <p className="text-sm text-gray-500">
                Check back soon — new Lagos listings are added regularly.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
