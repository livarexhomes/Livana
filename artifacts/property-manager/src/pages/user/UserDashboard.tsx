
import { useState, useEffect } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import {
  Menu, Search, ChevronDown, Building2, X,
} from 'lucide-react'
import AuthGuard from '../../components/auth/AuthGuard'
import UserSidebar from '../../components/layout/UserSidebar'
import UserBottomNav from '../../components/layout/UserBottomNav'
import ListingCard from '../../components/property/ListingCard'
import { createClient } from '../../lib/supabase'
import type { Tenant, PropertyWithLandlord } from '@/types'


// ── Shared layout ─────────────────────────────────────────────────────────────

export function UserLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [location] = useLocation()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })
      const { data: t } = await supabase.from('tenants').select('*').eq('user_id', user.id).single() as { data: Tenant | null }
      setTenant(t)
    })
  }, [])

  const displayName = tenant?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'U'

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
      {/* Desktop sidebar */}
      <UserSidebar
        displayName={displayName}
        userEmail={user?.email}
        initials={initials}
        open={false}
        onClose={() => {}}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 md:px-8 py-4 bg-white border-b border-gray-100 shrink-0">
          <h1 className="text-base font-extrabold text-gray-900 tracking-tight">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <span className="text-sm font-semibold text-gray-700 hidden sm:block">{displayName}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <UserBottomNav userEmail={user?.email} />
    </div>
  )
}

// ── Overview page ─────────────────────────────────────────────────────────────

const TYPE_TABS = [
  { value: 'all',        label: 'All' },
  { value: 'rent',       label: 'For Rent' },
  { value: 'lease',      label: 'Lease' },
  { value: 'sale',       label: 'For Sale' },
  { value: 'commercial', label: 'Commercial' },
]

export default function UserDashboardPage() {
  const [, navigate] = useLocation()
  const [properties, setProperties] = useState<PropertyWithLandlord[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('')
  const [bedsFilter, setBedsFilter] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }

      const { data: tenant } = await supabase
        .from('tenants').select('id').eq('user_id', user.id).single() as { data: { id: string } | null }

      if (tenant) {
        setTenantId(tenant.id)
        const { data: savedRes } = await supabase.from('saved_properties').select('property_id').eq('tenant_id', tenant.id)
        setSavedIds(new Set((savedRes ?? []).map((r: any) => r.property_id)))
      }

      const { data } = await supabase
        .from('properties')
        .select('*, landlords(full_name, whatsapp, is_verified), property_images(id, storage_path, alt_text, is_cover, sort_order)')
        .eq('status', 'available')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(60)
      setProperties((data as PropertyWithLandlord[]) ?? [])
      setLoading(false)
    })
  }, [])

  async function handleToggleSave(propertyId: string) {
    if (!tenantId) return
    const supabase = createClient()
    if (savedIds.has(propertyId)) {
      await supabase.from('saved_properties').delete().eq('tenant_id', tenantId).eq('property_id', propertyId)
      setSavedIds(prev => { const n = new Set(prev); n.delete(propertyId); return n })
    } else {
      await supabase.from('saved_properties').insert({ tenant_id: tenantId, property_id: propertyId })
      setSavedIds(prev => new Set(prev).add(propertyId))
    }
  }

  const hasFilters = typeFilter !== 'all' || stateFilter || bedsFilter || search

  function clearFilters() {
    setSearch(''); setTypeFilter('all'); setStateFilter(''); setBedsFilter('')
  }

  function openPropertyRequestsBuilder() {
    const params = new URLSearchParams({ new: 'true' })

    if (typeFilter === 'rent') params.set('purpose', 'Rent')
    if (typeFilter === 'lease') params.set('purpose', 'Lease')
    if (typeFilter === 'sale') params.set('purpose', 'Buy')
    if (stateFilter) params.set('state', stateFilter)
    if (search) params.set('preferred_area', search)
    if (bedsFilter) params.set('bedrooms', bedsFilter)

    navigate(`/user/requests?${params.toString()}`)
  }

  const filtered = properties
    .filter(p => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false
      if (stateFilter && !p.city?.toLowerCase().includes(stateFilter.toLowerCase())) return false
      if (bedsFilter && p.bedrooms < Number(bedsFilter)) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !p.title.toLowerCase().includes(q) &&
          !p.city?.toLowerCase().includes(q) &&
          !(p.address ?? '').toLowerCase().includes(q)
        ) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return Number(a.price) - Number(b.price)
      if (sortBy === 'price_desc') return Number(b.price) - Number(a.price)
      return 0
    })

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Browse Listings">
        <div className="space-y-4">



          {/* Filter bar */}
          <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">

              {/* Search */}
              <div className="relative w-full sm:min-w-40 sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by title, city or area…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {/* Type tabs */}
              <div className="-mx-3 flex max-w-[calc(100%+1.5rem)] items-center gap-1 overflow-x-auto px-3 pb-0.5 no-scrollbar sm:mx-0 sm:max-w-none sm:px-0 sm:pb-0">
                {TYPE_TABS.map(t => (
                  <button key={t.value} onClick={() => setTypeFilter(t.value)}
                    className={`min-h-10 shrink-0 rounded-xl border px-4 text-xs font-semibold whitespace-nowrap transition-all ${
                      typeFilter === t.value
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                {/* State */}
                <div className="relative min-w-0">
                  <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
                    className="min-h-10 w-full appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-8 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer sm:w-auto">
                    <option value="">Any State</option>
                    <option value="Lagos">Lagos</option>
                    <option value="Ogun">Ogun</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>

                {/* Beds */}
                <div className="relative min-w-0">
                  <select value={bedsFilter} onChange={e => setBedsFilter(e.target.value)}
                    className="min-h-10 w-full appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-8 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer sm:w-auto">
                    <option value="">Any Beds</option>
                    <option value="1">1+ Beds</option>
                    <option value="2">2+ Beds</option>
                    <option value="3">3+ Beds</option>
                    <option value="4">4+ Beds</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>

                {/* Sort */}
                <div className="relative col-span-2 min-w-0 sm:col-span-1">
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="min-h-10 w-full appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-8 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer sm:w-auto">
                    <option value="newest">Newest</option>
                    <option value="price_asc">Price ↑</option>
                    <option value="price_desc">Price ↓</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>

                {hasFilters && (
                  <button onClick={clearFilters}
                    className="col-span-2 flex min-h-10 items-center justify-center gap-1 rounded-xl border border-red-100 px-3 py-2 text-xs text-red-500 hover:bg-red-50 sm:col-span-1 sm:shrink-0">
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Count */}
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-gray-500">
              <span className="font-bold text-gray-900">{filtered.length}</span>{' '}
              {filtered.length === 1 ? 'property' : 'properties'}
              {hasFilters && <span className="text-green-600 ml-1 font-medium">· filtered</span>}
            </p>
            <Link href="/listings" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Full listings page →
            </Link>
          </div>

          {/* Listings */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-3xl overflow-hidden border border-gray-100 animate-pulse h-80">
                  <div className="h-56 w-full bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded-lg w-2/3" />
                    <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 text-center flex flex-col items-center">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <Building2 className="w-7 h-7 text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">No properties found</h3>
              <p className="text-sm text-gray-500 mb-2">Try adjusting your filters.</p>
              <p className="text-sm text-gray-500 mb-4">Can't find what you're looking for?</p>
              <p className="text-sm text-gray-500 mb-5">Create a property request and let Livarex help you find it.</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button onClick={openPropertyRequestsBuilder}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
                  Create Property Request
                </button>
                {hasFilters && (
                  <button onClick={clearFilters}
                    className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors">
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(p => (
                <ListingCard
                  key={p.id}
                  property={p}
                  saved={savedIds.has(p.id)}
                  isAuthenticated={true}
                  layout="grid"
                />
              ))}
            </div>
          )}

        </div>
      </UserLayout>
    </AuthGuard>
  )
}
