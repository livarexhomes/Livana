import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useSearch, useLocation } from '@/lib/navigation'
import {
  Search, MapPin, ChevronDown, X,
  Building2, LayoutGrid, Map, SlidersHorizontal,
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
  const [minPrice,        setMinPrice]        = useState(params.get('price_min') ?? '')
  const [maxPrice,        setMaxPrice]        = useState(params.get('price_max') ?? '')
  const [bedsFilter,      setBedsFilter]      = useState(params.get('beds')      ?? '')
  const [bathsFilter,     setBathsFilter]     = useState(params.get('baths')     ?? '')
  const [furnishedFilter, setFurnishedFilter] = useState('')
  const [sortBy,          setSortBy]          = useState('newest')
  const [mapVisible,      setMapVisible]      = useState(true)
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
  const seoTypeLabel  = typeLabel === 'Any' ? 'verified' : typeLabel.toLowerCase()
  const bedsLabel     = bedsFilter ? `${bedsFilter}+ Beds` : 'Beds / Baths'
  const priceLabel    = (minPrice || maxPrice)
    ? [minPrice ? `₦${Number(minPrice).toLocaleString()}` : '', maxPrice ? `₦${Number(maxPrice).toLocaleString()}` : ''].filter(Boolean).join(' – ')
    : 'Any Price'
  const pageTitle = locationLabel !== 'Any Location'
    ? `${typeLabel} properties in ${locationLabel} — Verified listings`
    : `${typeLabel} properties across Nigeria — Verified listings`
  const pageDescription = `Browse ${seoTypeLabel} properties ${locationLabel !== 'Any Location' ? `in ${locationLabel}` : 'across Nigeria'}. Filter by price, bedrooms, type, and neighbourhood.`
  const pageUrl = `/listings${search}`

  const activeCount = [typeFilter, stateFilter || areaFilter, minPrice || maxPrice, bedsFilter].filter(Boolean).length

  return (
    <>
      <SEO
        title={pageTitle}
        description={pageDescription}
        url={pageUrl}
      />
      <PublicNavbar />

      {/* ── Fixed content area below navbar ─────────────────────────────────── */}
      <div className="fixed inset-0 flex flex-col bg-slate-50" style={{ top: 72 }}>

        {/* ── Filter bar ──────────────────────────────────────────────────────── */}
        <div className="z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/60 flex-shrink-0 shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2 relative">

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">

              {/* LOCATION pill */}
              <button
                onClick={() => togglePanel('location')}
                className={`group flex items-center gap-2 h-9 px-3.5 rounded-xl border text-sm font-medium transition-all duration-150 shrink-0 ${
                  (stateFilter || areaFilter)
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/25'
                    : openPanel === 'location'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[100px]">{locationLabel}</span>
                <ChevronDown className={`w-3 h-3 shrink-0 opacity-60 transition-transform ${openPanel === 'location' ? 'rotate-180' : ''}`} />
              </button>

              {/* TYPE pill */}
              <button
                onClick={() => togglePanel('type')}
                className={`group flex items-center gap-2 h-9 px-3.5 rounded-xl border text-sm font-medium transition-all duration-150 shrink-0 ${
                  typeFilter
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/25'
                    : openPanel === 'type'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{typeLabel}</span>
                <ChevronDown className={`w-3 h-3 shrink-0 opacity-60 transition-transform ${openPanel === 'type' ? 'rotate-180' : ''}`} />
              </button>

              {/* BEDS pill */}
              <button
                onClick={() => togglePanel('beds')}
                className={`group flex items-center gap-2 h-9 px-3.5 rounded-xl border text-sm font-medium transition-all duration-150 shrink-0 ${
                  bedsFilter
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/25'
                    : openPanel === 'beds'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{bedsLabel}</span>
                <ChevronDown className={`w-3 h-3 shrink-0 opacity-60 transition-transform ${openPanel === 'beds' ? 'rotate-180' : ''}`} />
              </button>

              {/* PRICE pill */}
              <button
                onClick={() => togglePanel('price')}
                className={`group flex items-center gap-2 h-9 px-3.5 rounded-xl border text-sm font-medium transition-all duration-150 shrink-0 ${
                  (minPrice || maxPrice)
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/25'
                    : openPanel === 'price'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{priceLabel}</span>
                <ChevronDown className={`w-3 h-3 shrink-0 opacity-60 transition-transform ${openPanel === 'price' ? 'rotate-180' : ''}`} />
              </button>

              {/* Active filter badge + clear */}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all duration-150 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                  {activeCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-red-100 text-red-600 text-[10px] font-bold flex items-center justify-center">
                      {activeCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-100 shrink-0">
              <div className="relative">
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="appearance-none h-9 pl-3 pr-7 rounded-xl border border-slate-200 text-xs bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer font-medium hover:border-slate-300 transition-colors">
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price ↑</option>
                  <option value="price_desc">Price ↓</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Map toggle — desktop only */}
              <button
                onClick={() => setMapVisible(v => !v)}
                className={`hidden lg:flex items-center gap-2 h-9 px-3.5 rounded-xl border text-xs font-semibold transition-all duration-150 ${
                  mapVisible
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {mapVisible ? <LayoutGrid className="w-3.5 h-3.5" /> : <Map className="w-3.5 h-3.5" />}
                {mapVisible ? 'Hide Map' : 'Show Map'}
              </button>
            </div>

            {/* ── Dropdown panels ───────────────────────────────────────────── */}
            {openPanel === 'location' && (
              <div className="absolute left-4 top-[calc(100%+8px)] w-76 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-100 p-4 z-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">State</p>
                <div className="grid grid-cols-3 gap-1.5 mb-4">
                  {['', 'Lagos', 'Ogun'].map(v => (
                    <button key={v} onClick={() => { setStateFilter(v); setOpenPanel(null) }}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 text-center ${stateFilter === v ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25' : 'text-slate-700 hover:bg-slate-50 border border-slate-100'}`}>
                      {v || 'Any'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Neighbourhood</p>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input value={areaFilter} onChange={e => setAreaFilter(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && setOpenPanel(null)}
                    placeholder="e.g. Lekki, Ikeja…"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors placeholder:text-slate-400" />
                </div>
                <button onClick={() => setOpenPanel(null)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-600/25">
                  Apply
                </button>
              </div>
            )}

            {openPanel === 'type' && (
              <div className="absolute left-[168px] top-[calc(100%+8px)] w-52 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-100 p-3 z-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Property type</p>
                {TYPE_TABS.map(t => (
                  <button key={t.value} onClick={() => { setTypeFilter(t.value); setOpenPanel(null) }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5 ${typeFilter === t.value ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' : 'text-slate-700 hover:bg-slate-50'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {openPanel === 'beds' && (
              <div className="absolute left-[288px] top-[calc(100%+8px)] w-64 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-100 p-3 z-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Bedrooms</p>
                <div className="grid grid-cols-3 gap-1.5 mb-4">
                  {[['', 'Any'], ['1', '1+'], ['2', '2+'], ['3', '3+'], ['4', '4+'], ['5', '5+']].map(([v, l]) => (
                    <button key={v} onClick={() => setBedsFilter(v)}
                      className={`py-2 rounded-xl text-sm font-medium transition-all duration-150 text-center ${bedsFilter === v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50 border border-slate-100'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Furnished</p>
                {[['', 'Any'], ['true', 'Furnished'], ['false', 'Unfurnished']].map(([v, l]) => (
                  <button key={v} onClick={() => setFurnishedFilter(v)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5 ${furnishedFilter === v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50'}`}>
                    {l}
                  </button>
                ))}
                <button onClick={() => setOpenPanel(null)}
                  className="mt-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-600/25">
                  Apply
                </button>
              </div>
            )}

            {openPanel === 'price' && (
              <div className="absolute left-[400px] top-[calc(100%+8px)] w-72 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-100 p-4 z-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Price range (₦)</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Min</label>
                    <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                      placeholder="500,000"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors placeholder:text-slate-400" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Max</label>
                    <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                      placeholder="5,000,000"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors placeholder:text-slate-400" />
                  </div>
                </div>
                <button onClick={() => setOpenPanel(null)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-600/25">
                  Apply
                </button>
              </div>
            )}
          </div>

          {openPanel && <div className="fixed inset-0 z-40" onClick={() => setOpenPanel(null)} />}
        </div>

        {/* ── Body: list + map ────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── LEFT: scrollable listing panel ──────────────────────────────── */}
          <div
            ref={listRef}
            className={`overflow-y-auto flex flex-col bg-slate-50 transition-all duration-300 ${
              mapVisible ? 'w-full lg:w-[52%] xl:w-[48%]' : 'w-full'
            }`}
          >
            {/* Panel header */}
            <div className="px-5 pt-4 pb-2 bg-slate-50 sticky top-0 z-10 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-slate-900">{sorted.length}</span>
                  <span className="text-sm text-slate-500 font-medium">{sorted.length === 1 ? 'property' : 'properties'}</span>
                </div>
                {hasFilters && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full border border-blue-100 uppercase tracking-wider">
                    <SlidersHorizontal className="w-2.5 h-2.5" />
                    Filtered
                  </span>
                )}
              </div>
              {!loading && sorted.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  All landlords verified
                </div>
              )}
            </div>

            {/* Cards grid */}
            <div className={`p-4 pb-8 grid gap-3 ${mapVisible ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse h-[300px]">
                    <div className="h-[180px] w-full bg-slate-200" />
                    <div className="p-4 space-y-2.5">
                      <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
                      <div className="h-3.5 bg-slate-100 rounded-lg w-1/2" />
                      <div className="h-3 bg-slate-100 rounded-lg w-1/3 mt-4" />
                    </div>
                  </div>
                ))
              ) : sorted.length === 0 ? (
                <div className="col-span-full space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-100 p-14 text-center flex flex-col items-center shadow-sm">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                      <Building2 className="w-8 h-8 text-blue-300" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1.5">No properties found</h3>
                    <p className="text-sm text-slate-500 mb-5 max-w-xs">Try adjusting or clearing your filters to see more results.</p>
                    {hasFilters && (
                      <button onClick={clearFilters}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-600/25">
                        Clear all filters
                      </button>
                    )}
                  </div>
                  <NotifyWhenAvailableForm
                    title="Get notified when matching listings arrive"
                    description="Submit your email and we’ll email you once new verified properties match your search criteria."
                    subject={`Listing alert: ${typeLabel} in ${locationLabel}`}
                    details={`Search: ${typeLabel}, Location: ${locationLabel}, Price: ${priceLabel}, Bedrooms: ${bedsLabel}`}
                  />
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

          {/* ── RIGHT: map panel (desktop only) ──────────────────────────── */}
          {mapVisible && (
            <div className="hidden lg:flex flex-1 flex-col relative min-h-0 border-l border-slate-200/60">
              {/* Map label strip */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] bg-white/95 backdrop-blur-md rounded-full px-4 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.12)] border border-slate-100 flex items-center gap-2 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block shadow-[0_0_6px_rgba(37,99,235,0.6)]" />
                <span className="text-xs font-semibold text-slate-700">Livarex verified map</span>
              </div>
              <Suspense fallback={
                <div className="flex-1 min-h-0 bg-slate-100 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-slate-500 font-medium">Loading map…</p>
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
