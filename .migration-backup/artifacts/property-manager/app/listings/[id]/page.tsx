import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  createServerClient,
  isSupabaseConfigured,
  getSupabaseImageUrl,
} from "@/src/lib/supabase-server";
import PropertyDetailClient from "@/components/property-detail-client";
import type { FullProperty } from "@/components/property-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return {
      title: "Property Not Found | Livarex",
    };
  }

  const supabase = createServerClient();
  const { data: property } = await supabase
    .from("properties")
    .select(
      "*, landlords(id, full_name, whatsapp, bio, avatar_url, is_verified), property_images(id, storage_path, alt_text, is_cover, sort_order)"
    )
    .eq("id", id)
    .single();

  if (!property) {
    return {
      title: "Property Not Found | Livarex",
    };
  }

  const p = property as FullProperty;
  const title = `${p.title} — ${p.type === "rent" ? "For Rent" : p.type === "sale" ? "For Sale" : p.type === "lease" ? "Lease" : p.type} in ${p.city}`;
  const description =
    p.description?.slice(0, 160) ||
    `View this ${p.bedrooms}-bedroom ${p.type} in ${p.city}, Nigeria. Listed on Livarex — Nigeria's verified property marketplace.`;
  const coverImage = p.property_images?.find((img) => img.is_cover)?.storage_path;
  const ogImage = coverImage
    ? getSupabaseImageUrl(coverImage, 1200)
    : "https://www.livarex.com.ng/og-image.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.livarex.com.ng/listings/${id}`,
      type: "article",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: p.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `https://www.livarex.com.ng/listings/${id}`,
    },
  };
}

async function getProperty(id: string): Promise<FullProperty | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createServerClient();
  const { data } = await supabase
    .from("properties")
    .select(
      "*, landlords(id, full_name, whatsapp, bio, avatar_url, is_verified), property_images(id, storage_path, alt_text, is_cover, sort_order)"
    )
    .eq("id", id)
    .single();
  return (data as FullProperty) ?? null;
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getProperty(id);

  if (!property) {
    notFound();
  }

  // JSON-LD structured data for rich results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description || undefined,
    url: `https://www.livarex.com.ng/listings/${property.id}`,
    image: property.property_images
      ?.filter((img) => img.storage_path)
      .map((img) => getSupabaseImageUrl(img.storage_path, 1200)),
    address: {
      "@type": "PostalAddress",
      addressLocality: property.city,
      addressCountry: "NG",
    },
    price: property.price
      ? {
          "@type": "PriceSpecification",
          priceCurrency: "NGN",
          price: String(property.price),
        }
      : undefined,
    numberOfRooms: property.bedrooms || undefined,
    numberOfBathroomsTotal: property.bathrooms || undefined,
    floorSize: property.area_sqft
      ? {
          "@type": "QuantitativeValue",
          value: property.area_sqft,
          unitCode: "FTK",
        }
      : undefined,
    datePosted: property.created_at,
    ...(property.latitude && property.longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: property.latitude,
            longitude: property.longitude,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PropertyDetailClient property={property} />
    </>
  );
}
