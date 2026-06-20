import { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Users, Building2, TrendingUp, ArrowRight } from "lucide-react";
import PublicNavbar from "@/src/components/PublicNavbar";
import Footer from "@/src/components/Footer";

export const metadata: Metadata = {
  title: "About Us | Livarex - Nigeria's Verified Property Marketplace",
  description:
    "Learn about Livarex, Nigeria's trusted property marketplace. We verify every landlord and property to ensure safe, transparent real estate transactions.",
  openGraph: {
    title: "About Us | Livarex",
    description:
      "Nigeria's trusted property marketplace with verified landlords and transparent pricing.",
    url: "https://www.livarex.com.ng/about",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      <main className="flex-1 pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          {/* Hero */}
          <div className="text-center mb-16">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">
              About Livarex
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              Building Trust in Nigerian Real Estate
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
              We believe finding a home should be safe, transparent, and stress-free. Every property on Livarex is verified by our team.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { num: "10K+", label: "Happy Tenants" },
              { num: "850+", label: "Inspections Done" },
              { num: "100%", label: "Verified Homes" },
              { num: "4.9★", label: "Average Rating" },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100"
              >
                <p className="text-2xl font-extrabold text-gray-900">{s.num}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Mission */}
          <div className="grid md:grid-cols-2 gap-10 mb-16 items-center">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-4">
                Our Mission
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Livarex was founded to solve the biggest problem in Nigerian real estate: trust. Too many renters fall victim to fake listings, unresponsive agents, and outright scams.
              </p>
              <p className="text-gray-600 leading-relaxed">
                We verify every landlord, inspect every property, and handle the entire process from search to move-in. Our goal is to make renting in Nigeria as safe and simple as booking a hotel.
              </p>
            </div>
            <div className="bg-blue-50 rounded-3xl p-8 border border-blue-100">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: ShieldCheck, title: "Verified", desc: "Every landlord ID-checked" },
                  { icon: Users, title: "Supported", desc: "Dedicated team assistance" },
                  { icon: Building2, title: "Inspected", desc: "Physical property verification" },
                  { icon: TrendingUp, title: "Transparent", desc: "No hidden fees ever" },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{title}</p>
                    <p className="text-xs text-gray-500 mt-1">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="mb-16">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-8 text-center">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  title: "Search",
                  desc: "Browse verified properties across Nigeria. Filter by location, price, bedrooms, and more.",
                },
                {
                  step: "02",
                  title: "Inspect",
                  desc: "Book a physical inspection with our team. We accompany you and verify everything on-site.",
                },
                {
                  step: "03",
                  title: "Move In",
                  desc: "Complete your rental securely. We handle documentation and ensure a smooth handover.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="bg-gray-50 rounded-2xl p-6 border border-gray-100"
                >
                  <span className="text-4xl font-black text-blue-100">{item.step}</span>
                  <h3 className="text-lg font-bold text-gray-900 mt-2 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center bg-gray-950 rounded-3xl p-10 md:p-16">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">
              Ready to find your perfect home?
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Join thousands of Nigerians who trust Livarex for their property search.
            </p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 transition-all text-sm"
            >
              Browse Listings
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
