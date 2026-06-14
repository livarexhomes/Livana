import { Metadata } from "next";
import { createServerClient, isSupabaseConfigured } from "@/src/lib/supabase-server";
import HomePageClient from "@/components/home-page-client";
import type { PropertyWithLandlord } from "@/src/lib/types";

export const metadata: Metadata = {
  title: "Livarex - Nigeria's Verified Property Marketplace",
  description:
    "Find verified homes, apartments, and commercial properties across Nigeria. Safe rentals, verified landlords, transparent pricing. Browse 100+ verified listings in Lagos, Abuja, and more.",
  openGraph: {
    title: "Livarex - Nigeria's Verified Property Marketplace",
    description:
      "Find verified homes, apartments, and commercial properties across Nigeria. Safe rentals, verified landlords, transparent pricing.",
    url: "https://www.livarex.com.ng",
  },
};

async function getInitialProperties(): Promise<PropertyWithLandlord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createServerClient();
  const { data } = await supabase
    .from("properties")
    .select(
      "*, landlords(full_name, whatsapp, is_verified), property_images(storage_path, alt_text, is_cover)"
    )
    .eq("status", "available")
    .eq("type", "rent")
    .order("created_at", { ascending: false })
    .limit(8);
  return (data as PropertyWithLandlord[]) ?? [];
}

export default async function HomePage() {
  const properties = await getInitialProperties();

  return <HomePageClient initialProperties={properties} />;
}
