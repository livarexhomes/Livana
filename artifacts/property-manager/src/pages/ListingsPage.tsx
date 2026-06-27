import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useSearch, useLocation } from '@/lib/navigation'
import {
  Search, MapPin, ChevronDown, X,
  Building2, LayoutGrid, Map,
} from 'lucide-react'
import PublicNavbar from '../components/layout/PublicNavbar'
import SEO from '../components/SEO'
import ListingCard from '../components/property/ListingCard'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'
import type { PropertyWithLandlord } from '@/types'

const PropertyMap = lazy(() => import('../components/property/PropertyMap'))

const TYPE_TABS = [
  { value: '',         label: 'Any' },
  { value: 'rent',     label: 'For Rent' },
  { value: 'lease',    label: 'Lease' },
]

export default function ListingsPage() {
  const search = useSearch()
  const params = new URLSearchParams(search)
  const [, navigate] = useLocation()

  const [typeFilter,      setTypeFilter]      = useState(params.get('type')      ?? '')
  const [stateFilter,     setStateFilter]     = useState(params.get('city')      ?? params.get('state') ?? '')
  const [areaFilter,      setAreaFilter]      = useState(params.get('area')      ?? '')
  const [minPrice,        setMinPrice]        = useState(params.get('min_price') ?? '')
  const [maxPrice,        setMaxPrice]        = useState(params.get('max_price') ?? '')
  const [bedsFilter,      setBedsFilter]      = useState(params.get('bedrooms')  ?? '')
  const [bathsFilter,     setBathsFilter]     = useState('')
  const [furnishedFilter, setFurnishedFilter] = useState('')
  const [sortBy,          setSortBy]          = useState('newest')
  const [mapVisible,      setMapVisible]      = useState(true)   // default: map always open
  const [hoveredId,       setHoveredId]       = useState<string | null>(null)
  const [properties,      setProperties]      = useState<PropertyWithLandlord[]>([])
  const [loading,         setLoading]         = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [savedIds,        setSavedIds]        = useState<Set<string>>(new Set())
  const [openPanel,       setOpenPanel]       = useState<'location' | 'type' | 'beds' | 'price' | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user && isAdminUser(user)) { navigate('/admin'); return }
      setIsAuthenticated(!!user)
      if (user) {
        const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single()
        if (tenant) {
          const { data: saved } = await supabase.from('saved_properties').select('property_id').eq('tenant_id', tenant.id)
          setSavedIds(new Set((saved ?? []).map((r: { property_id: string }) => r.property_id)))
        }
      }
    })
  }, [])

  useEffect(() => { fetchProperties() }, [typeFilter, stateFilter, areaFilter, minPrice, maxPrice, bedsFilter, bathsFilter, furnishedFilter])

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

    if (typeFilter)         query = query.eq('type', typeFilter)
    if (stateFilter)        query = (query as any).ilike('city', `%${stateFilter}%`)
    if (areaFilter)         query = (query as any).ilike('address', `%${areaFilter}%`)
    if (minPrice)           query = query.gte('price', Number(minPrice))
    if (maxPrice)           query = query.lte('price', Number(maxPrice))
    if (bedsFilter)         query = query.gte('bedrooms', Number(bedsFilter))
    if (bathsFilter)        query = query.gte('bathrooms', Number(bathsFilter))
    if (furnishedFilter !== '') query = query.eq('furnished', furnishedFilter === 'true')

    const { data } = await query
    setProperties((data as PropertyWithLandlord[]) ?? [])
    setLoading(false)
  }

  function clearFilters() {
    setTypeFilter(''); setStateFilter(''); setAreaFilter('')
    setMinPrice(''); setMaxPrice(''); setBedsFilter('')
    setBathsFilter(''); setFurnishedFilter('')
  }

  function togglePanel(p: 'location' | 'type' | 'beds' | 'price') {
    setOpenPanel(prev => prev === p ? null : p)
  }

  function scrollToCard(id: string) {
    const el = listRef.current?.querySelector(`[data-id="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    setHoveredId(id)
    setTimeout(() => setHoveredId(null), 2000)
  }

  const hasFilters = typeFilter || stateFilter || areaFilter || minPrice || maxPrice || bedsFilter || bathsFilter || furnishedFilter !== ''

  const sorted = [...properties].sort((a, b) => {
    if (sortBy === 'price_asc')  return Number(a.price) - Number(b.price)
    if (sortBy === 'price_desc') return Number(b.price) - Number(a.price)
    return 0
  })

  const locationLabel = [stateFilter, areaFilter].filter(Boolean).join(', ') || 'Any Location'
  const typeLabel     = TYPE_TABS.find(t => t.value === typeFilter)?.label ?? 'Any'
  const bedsLabel     = bedsFilter ? `${bedsFilter}+ Beds` : 'Beds / Baths'
  const priceLabel    = (minPrice || maxPrice)
    ? [minPrice ? `₦${Number(minPrice).toLocaleString()}` : '', maxPrice ? `₦${Number(maxPrice).toLocaleString()}` : ''].filter(Boolean).join(' – ')
    : 'Any Price'

  return (
    <>
      <SEO
        title="Browse Properties — Rent & Lease"
        description="Search verified properties for rent and lease across Nigeria. Filter by location, price, bedrooms and type."
        url="/listings"
      />
      <PublicNavbar />

      {/* ── Fixed content area below navbar ─────────────────────────────────── */}
      <div className="fixed inset-0 flex flex-col bg-[#F5F5F3]" style={{ top: 72 }}>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="z-40 bg-white border-b border-gray-200/80 shadow-sm flex-shrink-0">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-2.5 flex items-stretch gap-0 relative">

          {/* LOCATION */}
          <button
            onClick={() => togglePanel('location')}
            className={`flex flex-col items-start px-5 py-2 hover:bg-gray-50 transition-colors border-r border-gray-200 min-w-[160px] ${openPanel === 'location' ? 'bg-blue-50' : ''}`}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" /> Location
            </span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <span className="truncate max-w-[130px]">{locationLabel}</span>
              <ChevronDown className={`w-3 h-3 text-gray-500 shrink-0 transition-transform ${openPanel === 'location' ? 'rotate-180' : ''}`} />
            </span>
          </button>

          {/* TYPE */}
          <button
            onClick={() => togglePanel('type')}
            className={`flex flex-col items-start px-5 py-2 hover:bg-gray-50 transition-colors border-r border-gray-200 min-w-[120px] ${openPanel === 'type' ? 'bg-blue-50' : ''}`}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Type</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <span>{typeLabel}</span>
              <ChevronDown className={`w-3 h-3 text-gray-500 shrink-0 transition-transform ${openPanel === 'type' ? 'rotate-180' : ''}`} />
            </span>
          </button>

          {/* BEDS & BATHS */}
          <button
            onClick={() => togglePanel('beds')}
            className={`flex flex-col items-start px-5 py-2 hover:bg-gray-50 transition-colors border-r border-gray-200 min-w-[130px] ${openPanel === 'beds' ? 'bg-blue-50' : ''}`}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Beds &amp; Baths</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <span>{bedsLabel}</span>
              <ChevronDown className={`w-3 h-3 text-gray-500 shrink-0 transition-transform ${openPanel === 'beds' ? 'rotate-180' : ''}`} />
            </span>
          </button>

          {/* PRICE */}
          <button
            onClick={() => togglePanel('price')}
            className={`flex flex-col items-start px-5 py-2 hover:bg-gray-50 transition-colors min-w-[120px] ${openPanel === 'price' ? 'bg-blue-50' : ''}`}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Price</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <span>{priceLabel}</span>
              <ChevronDown className={`w-3 h-3 text-gray-500 shrink-0 transition-transform ${openPanel === 'price' ? 'rotate-180' : ''}`} />
            </span>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Controls */}
          <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
            <div className="relative">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg border border-gray-200 text-xs bg-gray-50 text-gray-600 focus:outline-none cursor-pointer font-medium">
                <option value="newest">Newest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
            {/* Map toggle — desktop only */}
            <button
              onClick={() => setMapVisible(v => !v)}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                mapVisible
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/30'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {mapVisible ? <LayoutGrid className="w-3.5 h-3.5" /> : <Map className="w-3.5 h-3.5" />}
              {mapVisible ? 'Hide Map' : 'Show Map'}
            </button>
          </div>

          {/* ── Dropdown panels ───────────────────────────────────────────── */}
          {openPanel === 'location' && (
            <div className="absolute left-0 top-[calc(100%+4px)] w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">State</p>
              {['', 'Lagos', 'Ogun'].map(v => (
                <button key={v} onClick={() => { setStateFilter(v); setOpenPanel(null) }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5 ${stateFilter === v ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                  {v || 'Any State'}
                </button>
              ))}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Neighbourhood</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input value={areaFilter} onChange={e => setAreaFilter(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && setOpenPanel(null)}
                    placeholder="e.g. Lekki, Maitama…"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <button onClick={() => setOpenPanel(null)}
                className="mt-3 w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">Apply</button>
            </div>
          )}

          {openPanel === 'type' && (
            <div className="absolute left-[160px] top-[calc(100%+4px)] w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Property type</p>
              {TYPE_TABS.map(t => (
                <button key={t.value} onClick={() => { setTypeFilter(t.value); setOpenPanel(null) }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5 ${typeFilter === t.value ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {openPanel === 'beds' && (
            <div className="absolute left-[280px] top-[calc(100%+4px)] w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Bedrooms</p>
              {[['', 'Any bedrooms'], ['1', '1+ Beds'], ['2', '2+ Beds'], ['3', '3+ Beds'], ['4', '4+ Beds'], ['5', '5+ Beds']].map(([v, l]) => (
                <button key={v} onClick={() => setBedsFilter(v)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5 ${bedsFilter === v ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Furnished</p>
                {[['', 'Any'], ['true', 'Furnished'], ['false', 'Unfurnished']].map(([v, l]) => (
                  <button key={v} onClick={() => setFurnishedFilter(v)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5 ${furnishedFilter === v ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <button onClick={() => setOpenPanel(null)}
                className="mt-3 w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">Apply</button>
            </div>
          )}

          {openPanel === 'price' && (
            <div className="absolute left-[410px] top-[calc(100%+4px)] w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Price range (₦)</p>
              <div className="grid grid-cols-2 gap-2 mb-1">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Min</label>
                  <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                    placeholder="500,000"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Max</label>
                  <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                    placeholder="5,000,000"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <button onClick={() => setOpenPanel(null)}
                className="mt-3 w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">Apply</button>
            </div>
          )}
        </div>

        {openPanel && <div className="fixed inset-0 z-40" onClick={() => setOpenPanel(null)} />}
      </div>

      {/* ── Body: list + map ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── LEFT: scrollable listing panel ────────────────────────────────── */}
        <div
          ref={listRef}
          className={`overflow-y-auto flex flex-col bg-[#F5F5F3] transition-all duration-300 ${
            mapVisible ? 'w-full lg:w-[52%] xl:w-[48%]' : 'w-full'
          }`}
        >
          {/* Panel header */}
          <div className="px-5 py-3 bg-[#F5F5F3] sticky top-0 z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-gray-900">{sorted.length}</span>
              <span className="text-sm text-gray-500">{sorted.length === 1 ? 'property' : 'properties'} found</span>
              {hasFilters && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full border border-blue-100 uppercase tracking-wide">
                  filtered
                </span>
              )}
            </div>
            {!loading && sorted.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                All landlords verified
              </div>
            )}
          </div>

          {/* Cards grid */}
          <div className={`px-4 pb-6 grid gap-4 ${mapVisible ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse h-72">
                  <div className="h-44 w-full bg-gray-200" />
                  <div className="flex-1 p-4 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : sorted.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-16 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">No properties found</h3>
                <p className="text-sm text-gray-500 mb-5">Try adjusting or clearing your filters.</p>
                {hasFilters && (
                  <button onClick={clearFilters}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              sorted.map(p => (
                <div key={p.id} data-id={p.id}>
                  <ListingCard
                    property={p}
                    saved={savedIds.has(p.id)}
                    isAuthenticated={isAuthenticated}
                    highlighted={hoveredId === p.id}
                    onMouseEnter={() => setHoveredId(p.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    layout="grid"
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: map panel (desktop only, always visible by default) ─── */}
        {mapVisible && (
          <div className="hidden lg:flex flex-1 flex-col relative min-h-0">
            {/* Map label strip */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur-sm rounded-full px-4 py-1.5 shadow-md border border-gray-100 flex items-center gap-2 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
              <span className="text-xs font-semibold text-gray-700">Livarex verified map</span>
            </div>
            <Suspense fallback={
              <div className="flex-1 min-h-0 bg-gray-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-500 font-medium">Loading map…</p>
                </div>
              </div>
            }>
              <PropertyMap
                properties={sorted}
                hoveredId={hoveredId}
                onMarkerClick={scrollToCard}
                height="calc(100vh - 122px)"
              />
            </Suspense>
          </div>
        )}
      </div>

      </div>{/* end fixed content area */}
    </>
  )
}
