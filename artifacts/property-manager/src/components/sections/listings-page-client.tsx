'use client'

import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Link } from '@/lib/navigation'
import { useRouter, useSearchParams } from '@/lib/navigation'
import {
  Search, MapPin, ChevronDown, X, SlidersHorizontal,
  Building2, Map, List,
} from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import ListingCard from '@/components/property/ListingCard'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import { isAdminUser } from '@/lib/auth'
import type { PropertyWithLandlord } from '@/types'

const PropertyMap = lazy(() => import('@/components/property/PropertyMap'))

const TYPE_TABS = [
  { value: '', label: 'All', icon: '✦' },
  { value: 'rent', label: 'For Rent', icon: '🏠' },
  { value: 'lease', label: 'Lease', icon: '📋' },
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
    router.push(`/listings?${sp.toString()}`)
  }

  function clearFilters() {
    setTypeFilter(''); setStateFilter(''); setAreaFilter('')
    setMinPrice(''); setMaxPrice(''); setBedsFilter('')
    router.push('/listings')
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

  const [openPanel, setOpenPanel] = useState<'location' | 'type' | 'beds' | 'price' | null>(null)

  function togglePanel(p: 'location' | 'type' | 'beds' | 'price') {
    setOpenPanel(prev => prev === p ? null : p)
  }

  function applyAndClose() {
    updateUrl({ type: typeFilter, city: stateFilter, area: areaFilter, min_price: minPrice, max_price: maxPrice, bedrooms: bedsFilter })
    setOpenPanel(null)
  }

  const locationLabel = stateFilter || 'Any Location'
  const typeLabel = TYPE_TABS.find(t => t.value === typeFilter)?.label ?? 'Any'
  const bedsLabel = bedsFilter ? `${bedsFilter}+ Beds` : 'Beds / Baths'
  const priceLabel = (minPrice || maxPrice)
    ? [minPrice ? `₦${Number(minPrice).toLocaleString()}` : '', maxPrice ? `₦${Number(maxPrice).toLocaleString()}` : ''].filter(Boolean).join(' – ')
    : 'Any Price'

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F3] pt-20">
      <PublicNavbar />

      {/* ── Unified filter bar ─────────────────────────────────────────────── */}
      <div className="sticky top-[80px] z-40 bg-[#F5F5F3] border-b border-gray-200/60">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3">

          {/* Main filter card */}
          <div className="relative flex items-stretch bg-white rounded-2xl shadow-md border border-gray-100 divide-x divide-gray-100 overflow-visible">

            {/* LOCATION */}
            <button
              onClick={() => togglePanel('location')}
              className={`flex-1 min-w-0 flex flex-col items-start px-5 py-3 hover:bg-gray-50 transition-colors rounded-l-2xl ${openPanel === 'location' ? 'bg-gray-50' : ''}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location
              </span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 truncate w-full">
                <span className="truncate">{locationLabel}</span>
                {openPanel === 'location'
                  ? <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0 rotate-180 transition-transform" />
                  : <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform" />}
              </span>
            </button>

            {/* TYPE */}
            <button
              onClick={() => togglePanel('type')}
              className={`flex-1 min-w-0 flex flex-col items-start px-5 py-3 hover:bg-gray-50 transition-colors ${openPanel === 'type' ? 'bg-gray-50' : ''}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-0.5">Type</span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 w-full">
                <span className="truncate">{typeLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${openPanel === 'type' ? 'rotate-180' : ''}`} />
              </span>
            </button>

            {/* BEDS & BATHS */}
            <button
              onClick={() => togglePanel('beds')}
              className={`flex-1 min-w-0 flex flex-col items-start px-5 py-3 hover:bg-gray-50 transition-colors ${openPanel === 'beds' ? 'bg-gray-50' : ''}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-0.5">Beds &amp; Baths</span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 w-full">
                <span className="truncate">{bedsLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${openPanel === 'beds' ? 'rotate-180' : ''}`} />
              </span>
            </button>

            {/* PRICE */}
            <button
              onClick={() => togglePanel('price')}
              className={`flex-1 min-w-0 flex flex-col items-start px-5 py-3 hover:bg-gray-50 transition-colors rounded-r-2xl ${openPanel === 'price' ? 'bg-gray-50' : ''}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-0.5">Price</span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 w-full">
                <span className="truncate">{priceLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${openPanel === 'price' ? 'rotate-180' : ''}`} />
              </span>
            </button>

            {/* Dropdown panels */}
            {openPanel === 'location' && (
              <div className="absolute left-0 top-[calc(100%+8px)] w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">State</p>
                {['', 'Lagos', 'Ogun'].map(v => (
                  <button key={v} onClick={() => { setStateFilter(v); applyAndClose() }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1 ${stateFilter === v ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                    {v || 'Any State'}
                  </button>
                ))}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Area / Neighbourhood</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      value={areaFilter}
                      onChange={e => setAreaFilter(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && applyAndClose()}
                      placeholder="e.g. Lekki, Maitama…"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <button onClick={applyAndClose} className="mt-3 w-full py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800">Apply</button>
                </div>
              </div>
            )}

            {openPanel === 'type' && (
              <div className="absolute left-[25%] top-[calc(100%+8px)] w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Property type</p>
                {TYPE_TABS.map(t => (
                  <button key={t.value} onClick={() => { setTypeFilter(t.value); applyAndClose() }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1 flex items-center gap-2 ${typeFilter === t.value ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                    <span>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
            )}

            {openPanel === 'beds' && (
              <div className="absolute left-[50%] top-[calc(100%+8px)] w-52 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Bedrooms</p>
                {[['', 'Any'], ['1', '1+ Beds'], ['2', '2+ Beds'], ['3', '3+ Beds'], ['4', '4+ Beds'], ['5', '5+ Beds']].map(([v, l]) => (
                  <button key={v} onClick={() => { setBedsFilter(v); applyAndClose() }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1 ${bedsFilter === v ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                    {l}
                  </button>
                ))}
              </div>
            )}

            {openPanel === 'price' && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Price range (₦)</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Min</label>
                    <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                      placeholder="Min" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Max</label>
                    <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                      placeholder="Max" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                  </div>
                </div>
                <button onClick={applyAndClose} className="w-full py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800">Apply</button>
              </div>
            )}
          </div>

          {/* Secondary row: results count + sort + clear + map toggle */}
          <div className="flex items-center gap-3 mt-2.5">
            {hasFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium">
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
            <div className="flex-1" />
            <div className="relative">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-full border border-gray-200 text-xs bg-white text-gray-600 focus:outline-none cursor-pointer">
                <option value="newest">Newest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
            <button onClick={() => setShowMap(!showMap)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${showMap ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
              {showMap ? <List className="w-3 h-3" /> : <Map className="w-3 h-3" />}
              {showMap ? 'List' : 'Map'}
            </button>
          </div>
        </div>

        {/* Backdrop to close panels */}
        {openPanel && (
          <div className="fixed inset-0 z-40" onClick={() => setOpenPanel(null)} />
        )}
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
