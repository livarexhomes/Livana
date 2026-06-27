import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useSearch, useLocation } from '@/lib/navigation'
import {
  Search, MapPin, ChevronDown, X, SlidersHorizontal,
  Building2, Map, List,
} from 'lucide-react'
import PublicNavbar from '../components/layout/PublicNavbar'
import SEO from '../components/SEO'
import ListingCard from '../components/property/ListingCard'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'
import type { PropertyWithLandlord } from '@/types'


const PropertyMap = lazy(() => import('../components/property/PropertyMap'))

const TYPE_TABS = [
  { value: '', label: 'Any' },
  { value: 'rent', label: 'For Rent' },
  { value: 'lease', label: 'Lease' },
]

export default function ListingsPage() {
  const search = useSearch()
  const params = new URLSearchParams(search)
  const [, navigate] = useLocation()

  const [typeFilter, setTypeFilter] = useState(params.get('type') ?? '')
  const [stateFilter, setStateFilter] = useState(params.get('city') ?? params.get('state') ?? '')
  const [areaFilter, setAreaFilter] = useState(params.get('area') ?? '')
  const [minPrice, setMinPrice] = useState(params.get('min_price') ?? '')
  const [maxPrice, setMaxPrice] = useState(params.get('max_price') ?? '')
  const [bedsFilter, setBedsFilter] = useState(params.get('bedrooms') ?? '')
  const [bathsFilter, setBathsFilter] = useState('')
  const [furnishedFilter, setFurnishedFilter] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [properties, setProperties] = useState<PropertyWithLandlord[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
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

    if (typeFilter) query = query.eq('type', typeFilter)
    if (stateFilter) query = (query as any).ilike('city', `%${stateFilter}%`)
    if (areaFilter) query = (query as any).ilike('address', `%${areaFilter}%`)
    if (minPrice) query = query.gte('price', Number(minPrice))
    if (maxPrice) query = query.lte('price', Number(maxPrice))
    if (bedsFilter) query = query.gte('bedrooms', Number(bedsFilter))
    if (bathsFilter) query = query.gte('bathrooms', Number(bathsFilter))
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

  const hasFilters = typeFilter || stateFilter || areaFilter || minPrice || maxPrice || bedsFilter || bathsFilter || furnishedFilter !== ''

  const sorted = [...properties].sort((a, b) => {
    if (sortBy === 'price_asc') return Number(a.price) - Number(b.price)
    if (sortBy === 'price_desc') return Number(b.price) - Number(a.price)
    return 0
  })

  const [openPanel, setOpenPanel] = useState<'location' | 'type' | 'beds' | 'price' | null>(null)

  function togglePanel(p: 'location' | 'type' | 'beds' | 'price') {
    setOpenPanel(prev => prev === p ? null : p)
  }

  function scrollToCard(id: string) {
    const el = listRef.current?.querySelector(`[data-id="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    setHoveredId(id)
    setTimeout(() => setHoveredId(null), 2000)
  }

  const locationLabel = [stateFilter, areaFilter].filter(Boolean).join(', ') || 'Any Location'
  const typeLabel = TYPE_TABS.find(t => t.value === typeFilter)?.label ?? 'Any'
  const bedsLabel = bedsFilter ? `${bedsFilter}+ Beds` : 'Beds / Baths'
  const priceLabel = (minPrice || maxPrice)
    ? [minPrice ? `₦${Number(minPrice).toLocaleString()}` : '', maxPrice ? `₦${Number(maxPrice).toLocaleString()}` : ''].filter(Boolean).join(' – ')
    : 'Any Price'

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F3] pt-20">
      <SEO
        title="Browse Properties — Rent & Lease"
        description="Search verified properties for rent and lease across Nigeria. Filter by location, price, bedrooms and type."
        url="/listings"
      />
      <PublicNavbar />

      {/* ── Unified filter bar ──────────────────────────────────────────────── */}
      <div className="sticky top-[80px] z-40 bg-[#F5F5F3] border-b border-gray-200/60">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3">

          {/* Main filter card */}
          <div className="relative flex items-stretch bg-white rounded-2xl shadow-md border border-gray-100 divide-x divide-gray-100">

            {/* LOCATION */}
            <button
              onClick={() => togglePanel('location')}
              className={`flex-1 min-w-0 flex flex-col items-start px-5 py-3 hover:bg-gray-50 transition-colors rounded-l-2xl ${openPanel === 'location' ? 'bg-gray-50' : ''}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location
              </span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 w-full min-w-0">
                <span className="truncate">{locationLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${openPanel === 'location' ? 'rotate-180' : ''}`} />
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

            {/* ── Dropdown panels ── */}
            {openPanel === 'location' && (
              <div className="absolute left-0 top-[calc(100%+8px)] w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">State</p>
                {['', 'Lagos', 'Ogun'].map(v => (
                  <button key={v} onClick={() => { setStateFilter(v); setOpenPanel(null) }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1 ${stateFilter === v ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                    {v || 'Any State'}
                  </button>
                ))}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Area / Neighbourhood</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input value={areaFilter} onChange={e => setAreaFilter(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && setOpenPanel(null)}
                      placeholder="e.g. Lekki, Maitama…"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                  </div>
                  <button onClick={() => setOpenPanel(null)}
                    className="mt-3 w-full py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800">Apply</button>
                </div>
              </div>
            )}

            {openPanel === 'type' && (
              <div className="absolute left-[25%] top-[calc(100%+8px)] w-52 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Property type</p>
                {TYPE_TABS.map(t => (
                  <button key={t.value} onClick={() => { setTypeFilter(t.value); setOpenPanel(null) }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1 ${typeFilter === t.value ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {openPanel === 'beds' && (
              <div className="absolute left-[50%] top-[calc(100%+8px)] w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Bedrooms</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[['', 'Any'], ['1', '1+'], ['2', '2+'], ['3', '3+'], ['4', '4+'], ['5', '5+']].map(([v, l]) => (
                    <button key={v} onClick={() => setBedsFilter(v)}
                      className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition-all ${bedsFilter === v ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 mt-3">Bathrooms</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[['', 'Any'], ['1', '1+'], ['2', '2+'], ['3', '3+'], ['4', '4+']].map(([v, l]) => (
                    <button key={v} onClick={() => setBathsFilter(v)}
                      className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition-all ${bathsFilter === v ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 mt-3">Furnished</p>
                <div className="flex gap-2 mb-3">
                  {[['', 'Any'], ['true', 'Furnished'], ['false', 'Unfurnished']].map(([v, l]) => (
                    <button key={v} onClick={() => setFurnishedFilter(v)}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold transition-all ${furnishedFilter === v ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <button onClick={() => setOpenPanel(null)}
                  className="w-full py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800">Apply</button>
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
                <button onClick={() => setOpenPanel(null)}
                  className="w-full py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800">Apply</button>
              </div>
            )}
          </div>

          {/* Secondary row: sort + clear + map */}
          <div className="flex items-center gap-3 mt-2.5">
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium">
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

        {/* Backdrop to close open panel */}
        {openPanel && <div className="fixed inset-0 z-40" onClick={() => setOpenPanel(null)} />}
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
          <div className="px-4 sm:px-6 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-100/60 flex items-center justify-between sticky top-0 z-10">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <span className="font-extrabold text-gray-900 text-base">{sorted.length}</span>
              <span>{sorted.length === 1 ? 'property' : 'properties'} found</span>
              {hasFilters && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 text-[10px] font-bold rounded-full border border-violet-100 uppercase tracking-wide">
                  filtered
                </span>
              )}
            </p>
            {!loading && sorted.length > 0 && (
              <p className="text-[11px] text-gray-400 hidden sm:block">
                All landlords verified
              </p>
            )}
          </div>

          <div className={`p-4 sm:p-6 grid gap-5 ${!showMap ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse h-80">
                  <div className="h-48 w-full bg-gray-200" />
                  <div className="flex-1 p-4 space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-1/2" />
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
                  <button
                    onClick={clearFilters}
                    className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              sorted.map(p => (
                <div key={p.id} data-id={p.id} className={!showMap ? 'h-full' : ''}>
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

        {/* Map panel */}
        {showMap && (
          <div className="hidden lg:block flex-1 relative sticky top-0">
            <Suspense fallback={
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full animate-spin" />
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
