import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/dashboard/",
        "/login",
        "/register",
        "/landlord/",
        "/user/",
        "/api/",
      ],
    },
    sitemap: "https://www.livarex.com.ng/sitemap.xml",
  };
}
