import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the Replit proxy iframe origin in development
  allowedDevOrigins: ["*", "*.replit.dev", "*.picard.replit.dev", "*.replit.app"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },

};

export default nextConfig;
