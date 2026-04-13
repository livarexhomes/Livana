import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PropertyCard from '@/components/public/PropertyCard'
import type { PropertyWithLandlord } from '@/lib/types/database'

const howItWorks = [
  {
    step: '01',
    title: 'Browse listings',
    description: 'Search through verified properties filtered by location, price, type, and availability.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Check availability',
    description: 'Each listing shows a real-time availability badge so you know exactly what\'s open.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Contact via WhatsApp',
    description: 'Reach out directly to the landlord with one tap — no middlemen, no delays.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
]

export default async function HomePage() {
  const supabase = await createClient()

  const { data: recent } = await supabase
    .from('properties')
    .select('*, landlords(full_name, whatsapp, is_verified), property_images(storage_path, alt_text, is_cover)')
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(6)

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-700 text-white overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Verified landlords only
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight mb-5">
              Find your next home with confidence
            </h1>
            <p className="text-lg text-indigo-200 leading-relaxed mb-8">
              Browse properties from verified landlords. Real-time availability, direct WhatsApp contact — no agents, no fees.
            </p>

            {/* Search bar */}
            <form action="/listings" method="GET"
              className="flex flex-col sm:flex-row gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-2">
              <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-4 py-2.5">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  name="city"
                  type="text"
                  placeholder="Search by city or location…"
                  className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
                />
              </div>
              <div className="flex gap-2">
                <select name="type"
                  className="px-3 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-gray-900">
                  <option value="">All types</option>
                  <option value="rent">For rent</option>
                  <option value="sale">For sale</option>
                </select>
                <button type="submit"
                  className="px-6 py-2.5 bg-white text-indigo-700 font-semibold text-sm rounded-xl hover:bg-indigo-50 transition-colors shrink-0">
                  Search
                </button>
              </div>
            </form>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-6 mt-8 text-sm text-indigo-200">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Verified landlords
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Real-time availability
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Direct WhatsApp contact
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Recently Added ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Recently added</h2>
            <p className="text-sm text-gray-500 mt-1">Fresh listings from verified landlords</p>
          </div>
          <Link href="/listings"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
            View all →
          </Link>
        </div>

        {recent && recent.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((p) => (
              <PropertyCard key={p.id} property={p as PropertyWithLandlord} />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No listings yet — check back soon.</p>
          </div>
        )}
      </section>

      {/* ── How it works ── */}
      <section className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900">How it works</h2>
            <p className="text-sm text-gray-500 mt-2">Find and secure your next property in three simple steps</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {howItWorks.map((item) => (
              <div key={item.step} className="relative text-center">
                {/* Connector line */}
                <div className="hidden sm:block absolute top-8 left-1/2 w-full h-px bg-gray-200 -z-10" />

                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white mb-5 relative">
                  {item.icon}
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border-2 border-indigo-600 text-indigo-600 text-xs font-bold flex items-center justify-center">
                    {item.step.slice(1)}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/listings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors">
              Browse all listings
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Landlord CTA ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold mb-2">Are you a landlord?</h2>
            <p className="text-indigo-200 text-sm leading-relaxed max-w-md">
              List your property for free, get verified, and connect directly with renters via WhatsApp.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/landlord/register"
              className="px-5 py-2.5 bg-white text-indigo-700 font-semibold text-sm rounded-xl hover:bg-indigo-50 transition-colors">
              List your property
            </Link>
            <Link href="/about"
              className="px-5 py-2.5 bg-white/10 border border-white/30 text-white font-medium text-sm rounded-xl hover:bg-white/20 transition-colors">
              Learn more
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
