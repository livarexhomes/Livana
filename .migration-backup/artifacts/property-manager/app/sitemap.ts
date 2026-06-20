import { MetadataRoute } from "next";
import {
  createServerClient,
  isSupabaseConfigured,
} from "@/src/lib/supabase-server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.livarex.com.ng";

  // Static pages
  const staticPages = [
    { url: `${baseUrl}/`, lastModified: new Date(), priority: 1.0 },
    { url: `${baseUrl}/listings`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), priority: 0.7 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), priority: 0.5 },
    { url: `${baseUrl}/properties/lagos`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/properties/ogun`, lastModified: new Date(), priority: 0.8 },
  ];

  // Dynamic property pages
  let propertyPages: MetadataRoute.Sitemap = [];
  if (isSupabaseConfigured()) {
    const supabase = createServerClient();
    const { data: properties } = await supabase
      .from("properties")
      .select("id, updated_at")
      .eq("status", "available")
      .order("updated_at", { ascending: false })
      .limit(500);

    propertyPages =
      properties?.map((p) => ({
        url: `${baseUrl}/listings/${p.id}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        priority: 0.8,
      })) ?? [];
  }

  return [...staticPages, ...propertyPages];
}
