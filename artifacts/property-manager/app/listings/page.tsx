import { Metadata } from "next";
import {
  createServerClient,
  isSupabaseConfigured,
} from "@/src/lib/supabase-server";
import ListingsPageClient from "@/components/listings-page-client";
import type { PropertyWithLandlord } from "@/src/lib/types";

export const metadata: Metadata = {
  title: "Browse Verified Properties | Livarex",
  description:
    "Browse verified homes, apartments, and commercial properties for rent and lease across Nigeria. Filter by location, price, bedrooms, and more.",
  openGraph: {
    title: "Browse Verified Properties | Livarex",
    description:
      "Browse verified homes, apartments, and commercial properties for rent and lease across Nigeria.",
    url: "https://www.livarex.com.ng/listings",
  },
};

async function getProperties(
  searchParams: Record<string, string | string[] | undefined>
): Promise<PropertyWithLandlord[]> {
  if (!isSupabaseConfigured()) return [];

  const typeFilter = (searchParams.type as string) || "";
  const stateFilter = (searchParams.city as string) || (searchParams.state as string) || "";
  const areaFilter = (searchParams.area as string) || "";
  const minPrice = (searchParams.min_price as string) || "";
  const maxPrice = (searchParams.max_price as string) || "";
  const bedsFilter = (searchParams.bedrooms as string) || "";

  const supabase = createServerClient();
  let query = supabase
    .from("properties")
    .select(
      "*, landlords(full_name, whatsapp, is_verified), property_images(storage_path, alt_text, is_cover)"
    )
    .eq("status", "available")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (typeFilter) query = query.eq("type", typeFilter);
  if (stateFilter) query = (query as any).ilike("city", `%${stateFilter}%`);
  if (areaFilter) query = (query as any).ilike("address", `%${areaFilter}%`);
  if (minPrice) query = query.gte("price", Number(minPrice));
  if (maxPrice) query = query.lte("price", Number(maxPrice));
  if (bedsFilter) query = query.gte("bedrooms", Number(bedsFilter));

  const { data } = await query;
  return (data as PropertyWithLandlord[]) ?? [];
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const properties = await getProperties(sp);

  return (
    <ListingsPageClient
      initialProperties={properties}
      initialSearchParams={sp}
    />
  );
}
