export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PropertyCard from '@/components/public/PropertyCard'
import type { PropertyWithLandlord } from '@/lib/types/database'

async function getSavedPropertyIds(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Set<string>> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Set()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!tenant) return new Set()

  const { data: saved } = await supabase
    .from('saved_properties')
    .select('property_id')
    .eq('tenant_id', tenant.id)

  return new Set((saved ?? []).map((r: { property_id: string }) => r.property_id))
}

export const metadata: Metadata = {
  title: 'All Listings — Property Manager',
  description: 'Browse available properties for rent and sale. Filter by location, price, type and more.',
}

interface SearchParams {
  type?: string
  city?: string
  status?: string
  min_price?: string
  max_price?: string
  bedrooms?: string
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const { type, city, status, min_price, max_price, bedrooms } = params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const authed = !!user
  const savedIds = await getSavedPropertyIds(supabase)

  let query = supabase
    .from('properties')
    .select('*, landlords(full_name, whatsapp, is_verified), property_images(storage_path, alt_text, is_cover)')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (type) query = query.eq('type', type)
  if (city) query = query.ilike('city', `%${city}%`)
  if (status) query = query.eq('status', status)
  else query = query.eq('status', 'available')
  if (min_price) query = query.gte('price', Number(min_price))
  if (max_price) query = query.lte('price', Number(max_price))
  if (bedrooms) query = query.gte('bedrooms', Number(bedrooms))

  const { data: properties } = await query

  const hasFilters = type || city || status || min_price || max_price || bedrooms

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-900">Property Listings</h1>
          <p className="text-sm text-gray-500 mt-1">
            {properties?.length ?? 0} propert{properties?.length !== 1 ? 'ies' : 'y'} found
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar filters */}
          <aside className="lg:w-64 shrink-0">
            <form method="GET" className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5 sticky top-24">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
                {hasFilters && (
                  <a href="/listings" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    Clear all
                  </a>
                )}
              </div>

              {/* Property type */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</label>
                <div className="space-y-1.5">
                  {[
                    { value: '', label: 'All types' },
                    { value: 'rent', label: 'For rent' },
                    { value: 'sale', label: 'For sale' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="type" value={opt.value} defaultChecked={type === opt.value || (!type && opt.value === '')}
                        className="text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Availability</label>
                <select name="status" defaultValue={status ?? 'available'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="available">Available</option>
                  <option value="">All statuses</option>
                  <option value="coming_soon">Coming Soon</option>
                  <option value="under_negotiation">Under Negotiation</option>
                  <option value="taken">Taken</option>
                </select>
              </div>

              {/* City */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</label>
                <input name="city" defaultValue={city ?? ''} placeholder="Search city…"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* Price range */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Price range ($)</label>
                <div className="flex gap-2">
                  <input name="min_price" type="number" min="0" defaultValue={min_price ?? ''} placeholder="Min"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input name="max_price" type="number" min="0" defaultValue={max_price ?? ''} placeholder="Max"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              {/* Bedrooms */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Min. bedrooms</label>
                <select name="bedrooms" defaultValue={bedrooms ?? ''}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                </select>
              </div>

              <button type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
                Apply filters
              </button>
            </form>
          </aside>

          {/* Results grid */}
          <div className="flex-1 min-w-0">
            {properties?.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
                <p className="text-gray-500 font-medium">No properties match your search.</p>
                <a href="/listings" className="inline-block mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  Clear filters
                </a>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {properties?.map((p) => (
                  <PropertyCard
                    key={p.id}
                    property={p as PropertyWithLandlord}
                    saved={savedIds.has(p.id)}
                    isAuthenticated={authed}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
