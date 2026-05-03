import { useState, useEffect } from 'react'
import { useSearch } from 'wouter'
import { SlidersHorizontal, X, Building2 } from 'lucide-react'
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PublicNavbar />

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Property Listings</h1>
            <p className="text-sm text-gray-500 mt-1">{properties.length} propert{properties.length !== 1 ? 'ies' : 'y'} found</p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors lg:hidden"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasFilters && <span className="w-2 h-2 bg-[#6b9e6e] rounded-full"></span>}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters sidebar */}
          <aside className={`lg:w-64 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <form onSubmit={applyFilters} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5 sticky top-24">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
                <div className="flex items-center gap-2">
                  {hasFilters && (
                    <button type="button" onClick={clearFilters} className="text-xs text-[#6b9e6e] hover:text-[#4a7f4d] font-medium flex items-center gap-1">
                      <X className="w-3 h-3" /> Clear all
                    </button>
                  )}
                  <button type="button" onClick={() => setShowFilters(false)} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</label>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]"
                >
                  <option value="">All types</option>
                  <option value="rent">For Rent</option>
                  <option value="sale">For Sale</option>
                  <option value="lease">Lease</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">State</label>
                <select
                  value={stateFilter}
                  onChange={e => setStateFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All states</option>
                  {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Area / Neighbourhood</label>
                <input
                  value={areaFilter}
                  onChange={e => setAreaFilter(e.target.value)}
                  placeholder="e.g. Lekki, Maitama…"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Price Range (₦)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    placeholder="Min"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]"
                  />
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Min. Bedrooms</label>
                <select
                  value={bedsFilter}
                  onChange={e => setBedsFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]"
                >
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#6b9e6e] hover:bg-[#4a7f4d] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Apply filters
              </button>
            </form>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-[#aadb5a] border-t-transparent rounded-full"></div>
              </div>
            ) : properties.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center flex flex-col items-center">
                <Building2 className="w-12 h-12 text-gray-200 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-1">No properties match your search</h3>
                <p className="text-sm text-gray-500 mb-4">Try adjusting your filters.</p>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-sm text-[#6b9e6e] hover:text-[#4a7f4d] font-medium">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {properties.map(p => (
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
