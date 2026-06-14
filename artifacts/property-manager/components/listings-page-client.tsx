'use client'

import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, MapPin, ChevronDown, X, SlidersHorizontal,
  Building2, Map, List,
} from 'lucide-react'
import PublicNavbar from '@/src/components/PublicNavbar'
import ListingCard from '@/src/components/ListingCard'
import { createClient, isSupabaseConfigured } from '@/src/lib/supabase'
import { isAdminUser } from '@/src/lib/auth'
import type { PropertyWithLandlord } from '@/src/lib/types'

const PropertyMap = lazy(() => import('@/src/components/PropertyMap'))

const TYPE_TABS = [
  { value: '', label: 'All', icon: '✦' },
  { value: 'rent', label: 'For Rent', icon: '🏠' },
  { value: 'lease', label: 'Lease', icon: '📋' },
  { value: 'sale', label: 'For Sale', icon: '🏢', comingSoon: true },
  { value: 'commercial', label: 'Commercial', icon: '🏪', comingSoon: true },
]

export default function ListingsPageClient({
  initialProperties,
  initialSearchParams,
}: {
  initialProperties: PropertyWithLandlord[]
  initialSearchParams: Record<string, string | string[] | undefined>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [typeFilter, setTypeFilter] = useState((initialSearchParams.type as string) ?? '')
  const [stateFilter, setStateFilter] = useState((initialSearchParams.city as string) ?? (initialSearchParams.state as string) ?? '')
  const [areaFilter, setAreaFilter] = useState((initialSearchParams.area as string) ?? '')
  const [minPrice, setMinPrice] = useState((initialSearchParams.min_price as string) ?? '')
  const [maxPrice, setMaxPrice] = useState((initialSearchParams.max_price as string) ?? '')
  const [bedsFilter, setBedsFilter] = useState((initialSearchParams.bedrooms as string) ?? '')
  const [sortBy, setSortBy] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [properties, setProperties] = useState<PropertyWithLandlord[]>(initialProperties)
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user && isAdminUser(user)) { router.push('/admin'); return }
      setIsAuthenticated(!!user)
      if (user) {
        const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single()
        if (tenant) {
          const { data: saved } = await supabase.from('saved_properties').select('property_id').eq('tenant_id', (tenant as { id: string }).id)
          setSavedIds(new Set((saved ?? []).map((r: { property_id: string }) => r.property_id)))
        }
      }
    })
  }, [router])

  useEffect(() => {
    // Sync with URL search params when they change
    const sp = new URLSearchParams(searchParams?.toString() ?? '')
    setTypeFilter(sp.get('type') ?? '')
    setStateFilter(sp.get('city') ?? sp.get('state') ?? '')
    setAreaFilter(sp.get('area') ?? '')
    setMinPrice(sp.get('min_price') ?? '')
    setMaxPrice(sp.get('max_price') ?? '')
    setBedsFilter(sp.get('bedrooms') ?? '')
  }, [searchParams])

  useEffect(() => {
    fetchProperties()
  }, [typeFilter, stateFilter, areaFilter, minPrice, maxPrice, bedsFilter])

  async function fetchProperties() {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('properties')
      .select('*, landlords(full_name, whatsapp, is_verified), property_images(storage_path, alt_text, is_cover)')
      .eq('status', 'available')
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    if (typeFilter) query = query.eq('type', typeFilter)
    if (stateFilter) query = (query as any).ilike('city', `%${stateFilter}%`)
    if (areaFilter) query = (query as any).ilike('address', `%${areaFilter}%`)
    if (minPrice) query = query.gte('price', Number(minPrice))
    if (maxPrice) query = query.lte('price', Number(maxPrice))
    if (bedsFilter) query = query.gte('bedrooms', Number(bedsFilter))

    const { data } = await query
    setProperties((data as PropertyWithLandlord[]) ?? [])
    setLoading(false)
  }

  function updateUrl(params: Record<string, string>) {
    const sp = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v) })
    router.push(`/listings?${sp.toString()}`, { scroll: false })
  }

  function clearFilters() {
    setTypeFilter(''); setStateFilter(''); setAreaFilter('')
    setMinPrice(''); setMaxPrice(''); setBedsFilter('')
    router.push('/listings', { scroll: false })
  }

  const hasFilters = typeFilter || stateFilter || areaFilter || minPrice || maxPrice || bedsFilter

  const sorted = [...properties].sort((a, b) => {
    if (sortBy === 'price_asc') return Number(a.price) - Number(b.price)
    if (sortBy === 'price_desc') return Number(b.price) - Number(a.price)
    return 0
  })

  function scrollToCard(id: string) {
    const el = listRef.current?.querySelector(`[data-id="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    setHoveredId(id)
    setTimeout(() => setHoveredId(null), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pt-20">
      <PublicNavbar />

      {/* Filter bar */}
      <div className="sticky top-[80px] z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar">

            {/* Type tabs */}
            {TYPE_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => {
                  if (!t.comingSoon) {
                    setTypeFilter(t.value)
                    updateUrl({ type: t.value, city: stateFilter, area: areaFilter, min_price: minPrice, max_price: maxPrice, bedrooms: bedsFilter })
                  }
                }}
                disabled={t.comingSoon}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border shrink-0 ${
                  t.comingSoon
                    ? 'bg-white text-gray-400 border-gray-200 cursor-default'
                    : typeFilter === t.value
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
                {t.comingSoon && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md">
                    Soon
                  </span>
                )}
              </button>
            ))}

            <div className="w-px h-6 bg-gray-200 mx-1 shrink-0" />

            {/* State */}
            <div className="relative shrink-0">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <select
                value={stateFilter}
                onChange={e => {
                  setStateFilter(e.target.value)
                  updateUrl({ type: typeFilter, city: e.target.value, area: areaFilter, min_price: minPrice, max_price: maxPrice, bedrooms: bedsFilter })
                }}
                className="appearance-none pl-8 pr-7 py-2 rounded-full border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer"
              >
                <option value="">Any State</option>
                <option value="Lagos">Lagos</option>
                <option value="Ogun">Ogun</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* Beds */}
            <div className="relative shrink-0">
              <select
                value={bedsFilter}
                onChange={e => {
                  setBedsFilter(e.target.value)
                  updateUrl({ type: typeFilter, city: stateFilter, area: areaFilter, min_price: minPrice, max_price: maxPrice, bedrooms: e.target.value })
                }}
                className="appearance-none pl-3 pr-7 py-2 rounded-full border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer"
              >
                <option value="">Beds / Baths</option>
                <option value="1">1+ Beds</option>
                <option value="2">2+ Beds</option>
                <option value="3">3+ Beds</option>
                <option value="4">4+ Beds</option>
                <option value="5">5+ Beds</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* Price / more filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold transition-all shrink-0 ${
                minPrice || maxPrice || areaFilter
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              ₦ Price
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold transition-all shrink-0 ${
                showFilters
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {hasFilters && <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />}
            </button>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 rounded-full text-sm text-red-500 hover:bg-red-50 border border-red-100 shrink-0"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}

            <div className="flex-1 min-w-4" />

            {/* Sort */}
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="appearance-none pl-3 pr-7 py-2 rounded-full border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer"
              >
                <option value="newest">Newest Properties</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* Map toggle */}
            <button
              onClick={() => setShowMap(!showMap)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold transition-all shrink-0 ${
                showMap
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
              }`}
            >
              {showMap ? <List className="w-3.5 h-3.5" /> : <Map className="w-3.5 h-3.5" />}
              {showMap ? 'List only' : 'Show map'}
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="pb-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 items-end border-t border-gray-50 pt-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Min Price (₦)</label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={e => {
                    setMinPrice(e.target.value)
                    updateUrl({ type: typeFilter, city: stateFilter, area: areaFilter, min_price: e.target.value, max_price: maxPrice, bedrooms: bedsFilter })
                  }}
                  placeholder="e.g. 500,000"
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-full sm:w-40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Max Price (₦)</label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={e => {
                    setMaxPrice(e.target.value)
                    updateUrl({ type: typeFilter, city: stateFilter, area: areaFilter, min_price: minPrice, max_price: e.target.value, bedrooms: bedsFilter })
                  }}
                  placeholder="e.g. 5,000,000"
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-full sm:w-40"
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Area / Neighbourhood</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    value={areaFilter}
                    onChange={e => {
                      setAreaFilter(e.target.value)
                      updateUrl({ type: typeFilter, city: stateFilter, area: e.target.value, min_price: minPrice, max_price: maxPrice, bedrooms: bedsFilter })
                    }}
                    placeholder="e.g. Lekki, Maitama…"
                    className="pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-full sm:w-52"
                  />
                </div>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="col-span-2 sm:col-span-1 px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden lg:h-[calc(100vh-113px)]">

        {/* List panel */}
        <div
          ref={listRef}
          className={`overflow-y-auto flex flex-col shrink-0 ${
            showMap ? 'w-full lg:w-[520px] xl:w-[600px]' : 'w-full'
          }`}
        >
          <div className="px-4 py-2.5 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
            <p className="text-sm text-gray-500">
              <span className="font-bold text-gray-900">{sorted.length}</span>{' '}
              {sorted.length === 1 ? 'property' : 'properties'} found
              {hasFilters && <span className="text-green-600 ml-1 font-medium">· filtered</span>}
            </p>
          </div>

          <div className="flex-1 p-4 space-y-4">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-32 h-24 bg-gray-100 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))
            ) : sorted.length > 0 ? (
              sorted.map((property) => (
                <div key={property.id} data-id={property.id}>
                  <ListingCard
                    property={property}
                    saved={savedIds.has(property.id)}
                    isAuthenticated={isAuthenticated}
                    highlighted={hoveredId === property.id}
                    onMouseEnter={() => setHoveredId(property.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-20">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-700 mb-2">No properties found</h3>
                <p className="text-sm text-gray-500 mb-6">Try adjusting your filters or search criteria.</p>
                <button
                  onClick={clearFilters}
                  className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Map panel */}
        {showMap && (
          <div className="hidden lg:block flex-1 bg-gray-100 relative">
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Map className="w-8 h-8 animate-pulse" />
              </div>
            }>
              <PropertyMap
                properties={sorted}
                hoveredId={hoveredId}
                onMarkerClick={scrollToCard}
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  )
}
