import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useSearch, useLocation } from 'wouter'
import {
  Search, MapPin, ChevronDown, X, SlidersHorizontal,
  Building2, Map, List,
} from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import ListingCard from '../components/ListingCard'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'
import type { PropertyWithLandlord } from '../lib/types'


const PropertyMap = lazy(() => import('../components/PropertyMap'))

const TYPE_TABS = [
  { value: '', label: 'All', icon: '✦' },
  { value: 'rent', label: 'For Rent', icon: '🏠' },
  { value: 'sale', label: 'For Sale', icon: '🏢' },
  { value: 'lease', label: 'Lease', icon: '📋' },
  { value: 'commercial', label: 'Commercial', icon: '🏪' },
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

  useEffect(() => { fetchProperties() }, [typeFilter, stateFilter, areaFilter, minPrice, maxPrice, bedsFilter])

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

  function clearFilters() {
    setTypeFilter(''); setStateFilter(''); setAreaFilter('')
    setMinPrice(''); setMaxPrice(''); setBedsFilter('')
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
                onClick={() => setTypeFilter(t.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border shrink-0 ${
                  typeFilter === t.value
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}

            <div className="w-px h-6 bg-gray-200 mx-1 shrink-0" />

            {/* State */}
            <div className="relative shrink-0">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <select
                value={stateFilter}
                onChange={e => setStateFilter(e.target.value)}
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
                onChange={e => setBedsFilter(e.target.value)}
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
                  onChange={e => setMinPrice(e.target.value)}
                  placeholder="e.g. 500,000"
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-full sm:w-40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Max Price (₦)</label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
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
                    onChange={e => setAreaFilter(e.target.value)}
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

          <div className={`p-4 space-y-3 ${!showMap ? 'max-w-3xl mx-auto w-full' : ''}`}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex bg-white rounded-2xl overflow-hidden border border-gray-100 h-36 animate-pulse">
                  <div className="w-44 bg-gray-200 shrink-0" />
                  <div className="flex-1 p-4 space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : sorted.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center flex flex-col items-center">
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
                <div key={p.id} data-id={p.id}>
                  <ListingCard
                    property={p}
                    saved={savedIds.has(p.id)}
                    isAuthenticated={isAuthenticated}
                    highlighted={hoveredId === p.id}
                    onMouseEnter={() => setHoveredId(p.id)}
                    onMouseLeave={() => setHoveredId(null)}
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
