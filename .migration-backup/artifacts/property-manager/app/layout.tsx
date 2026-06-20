import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.livarex.com.ng"),
  title: {
    default: "Livarex - Nigeria's Verified Property Marketplace",
    template: "%s | Livarex",
  },
  description:
    "Find verified homes, apartments, and commercial properties across Nigeria. Safe rentals, verified landlords, transparent pricing. Browse 100+ verified listings in Lagos, Abuja, and more.",
  keywords: [
    "Nigeria real estate",
    "rent apartment Lagos",
    "verified property Nigeria",
    "house for rent Abuja",
    "property marketplace Nigeria",
    "Lekki apartments",
    "Ikoyi property",
    "Nigeria landlord verification",
  ],
  authors: [{ name: "Livarex" }],
  creator: "Livarex",
  publisher: "Livarex",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://www.livarex.com.ng",
    siteName: "Livarex",
    title: "Livarex - Nigeria's Verified Property Marketplace",
    description:
      "Find verified homes, apartments, and commercial properties across Nigeria. Safe rentals, verified landlords, transparent pricing.",
    images: [
      {
        url: "https://www.livarex.com.ng/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Livarex - Nigeria's Verified Property Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Livarex - Nigeria's Verified Property Marketplace",
    description:
      "Find verified homes, apartments, and commercial properties across Nigeria. Safe rentals, verified landlords, transparent pricing.",
    images: ["https://www.livarex.com.ng/og-image.jpg"],
    creator: "@livarex",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  alternates: {
    canonical: "https://www.livarex.com.ng",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
