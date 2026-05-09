import { useState, useEffect } from 'react'
import { useSearch } from 'wouter'
import { SlidersHorizontal, X, Building2, Search, MapPin, ChevronDown } from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import Footer from '../components/Footer'
import PropertyCard from '../components/PropertyCard'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import type { PropertyWithLandlord } from '../lib/types'
import { NIGERIAN_STATES } from '../lib/nigerianStates'

export default function ListingsPage() {
  const search = useSearch()
  const params = new URLSearchParams(search)

  const [typeFilter, setTypeFilter] = useState(params.get('type') ?? '')
  const [stateFilter, setStateFilter] = useState(params.get('city') ?? params.get('state') ?? '')
  const [areaFilter, setAreaFilter] = useState(params.get('area') ?? '')
  const [minPrice, setMinPrice] = useState(params.get('min_price') ?? '')
  const [maxPrice, setMaxPrice] = useState(params.get('max_price') ?? '')
  const [bedsFilter, setBedsFilter] = useState(params.get('bedrooms') ?? '')
  const [properties, setProperties] = useState<PropertyWithLandlord[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
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

  function applyFilters(e: React.FormEvent) {
    e.preventDefault()
    setShowFilters(false)
    fetchProperties()
  }

  function clearFilters() {
    setTypeFilter('')
    setStateFilter('')
    setAreaFilter('')
    setMinPrice('')
    setMaxPrice('')
    setBedsFilter('')
  }

  const hasFilters = typeFilter || stateFilter || areaFilter || minPrice || maxPrice || bedsFilter

  const sorted = [...properties].sort((a, b) => {
    if (sortBy === 'price_asc') return Number(a.price) - Number(b.price)
    if (sortBy === 'price_desc') return Number(b.price) - Number(a.price)
    return 0
  })

  const TYPE_TABS = [
    { value: '', label: 'All' },
    { value: 'rent', label: 'For Rent' },
    { value: 'sale', label: 'For Sale' },
    { value: 'lease', label: 'Lease' },
    { value: 'commercial', label: 'Commercial' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      {/* Hero banner */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-blue-950 pt-28 pb-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Live Listings</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-3">
            Property Listings
          </h1>
          <p className="text-gray-400 text-base mb-8 max-w-lg">
            Browse verified properties across Nigeria. No agent fees.
          </p>
          <div className="flex flex-wrap gap-2">
            {TYPE_TABS.map(t => (
              <button key={t.value} type="button"
                onClick={() => setTypeFilter(t.value)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  typeFilter === t.value
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results bar */}
      <div className="border-b border-gray-100 bg-white sticky top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-900">{properties.length}</span>{' '}
            {properties.length === 1 ? 'property' : 'properties'} found
            {hasFilters && <span className="text-blue-600 ml-1">· filtered</span>}
          </p>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                <option value="newest">Newest first</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all lg:hidden ${
                showFilters || hasFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasFilters && !showFilters && <span className="w-2 h-2 bg-white rounded-full" />}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Filters sidebar */}
          <aside className={`lg:w-72 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <form onSubmit={applyFilters}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 sticky top-32">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-gray-900">Filters</h2>
                </div>
                <div className="flex items-center gap-2">
                  {hasFilters && (
                    <button type="button" onClick={clearFilters}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
                      <X className="w-3 h-3" /> Clear all
                    </button>
                  )}
                  <button type="button" onClick={() => setShowFilters(false)}
                    className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Type</label>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
                  <option value="">All types</option>
                  <option value="rent">For Rent</option>
                  <option value="sale">For Sale</option>
                  <option value="lease">Lease</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">State</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 appearance-none">
                    <option value="">All states</option>
                    {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Area / Neighbourhood</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input value={areaFilter} onChange={e => setAreaFilter(e.target.value)}
                    placeholder="e.g. Lekki, Maitama…"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Price Range (₦)</label>
                <div className="flex gap-2">
                  <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                    placeholder="Min"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-400" />
                  <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Min. Bedrooms</label>
                <select value={bedsFilter} onChange={e => setBedsFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                </select>
              </div>

              <button type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-blue-600/20">
                Apply Filters
              </button>
            </form>
          </aside>

          {/* Results grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Loading properties…</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center flex flex-col items-center">
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
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {sorted.map(p => (
                  <PropertyCard key={p.id} property={p} saved={savedIds.has(p.id)} isAuthenticated={isAuthenticated} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
