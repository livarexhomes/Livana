
import { useState, useEffect } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import {
  Menu, Search, ChevronDown, Building2, X, MapPin, BedDouble, ArrowUpDown,
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
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60 p-3.5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08),0_1px_0_rgba(255,255,255,0.8)_inset] ring-1 ring-inset ring-white/60 sm:p-4">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">

              {/* Search */}
              <div className="group relative w-full sm:min-w-44 sm:flex-1">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-md text-slate-400 transition-colors group-focus-within:text-blue-600 group-focus-within:bg-blue-50">
                  <Search className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  placeholder="Search by title, city or area…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 py-2.5 pl-9 pr-9 text-sm text-slate-800 placeholder:text-slate-400 shadow-[0_1px_0_rgba(15,23,42,0.02)_inset] transition-all duration-200 hover:border-slate-300 hover:bg-white focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100/70"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Type tabs */}
              <div
                role="tablist"
                aria-label="Listing type"
                className="relative -mx-3 flex max-w-[calc(100%+1.5rem)] items-center gap-1 overflow-x-auto rounded-2xl bg-slate-100/70 p-1 px-3 ring-1 ring-inset ring-slate-200/70 no-scrollbar sm:mx-0 sm:max-w-none sm:px-1"
              >
                {TYPE_TABS.map(t => {
                  const selected = typeFilter === t.value
                  return (
                    <button
                      key={t.value}
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setTypeFilter(t.value)}
                      className={`relative inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl px-3.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.97] ${
                        selected
                          ? 'bg-white text-slate-900 shadow-[0_4px_12px_-4px_rgba(15,23,42,0.18),0_1px_0_rgba(255,255,255,1)_inset] ring-1 ring-slate-200/70'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                {/* State */}
                <div className="group relative min-w-0">
                  <MapPin aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                  <select
                    aria-label="State"
                    value={stateFilter}
                    onChange={e => setStateFilter(e.target.value)}
                    className="min-h-10 w-full appearance-none rounded-2xl border border-slate-200 bg-white/80 py-2 pl-8 pr-8 text-xs font-medium text-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.02)_inset] transition-all duration-200 hover:border-slate-300 hover:bg-white focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100/70 cursor-pointer sm:w-auto"
                  >
                    <option value="">Any State</option>
                    <option value="Lagos">Lagos</option>
                    <option value="Ogun">Ogun</option>
                  </select>
                  <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 transition-transform group-focus-within:rotate-180" />
                </div>

                {/* Beds */}
                <div className="group relative min-w-0">
                  <BedDouble aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                  <select
                    aria-label="Bedrooms"
                    value={bedsFilter}
                    onChange={e => setBedsFilter(e.target.value)}
                    className="min-h-10 w-full appearance-none rounded-2xl border border-slate-200 bg-white/80 py-2 pl-8 pr-8 text-xs font-medium text-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.02)_inset] transition-all duration-200 hover:border-slate-300 hover:bg-white focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100/70 cursor-pointer sm:w-auto"
                  >
                    <option value="">Any Beds</option>
                    <option value="1">1+ Beds</option>
                    <option value="2">2+ Beds</option>
                    <option value="3">3+ Beds</option>
                    <option value="4">4+ Beds</option>
                  </select>
                  <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 transition-transform group-focus-within:rotate-180" />
                </div>

                {/* Sort */}
                <div className="group relative col-span-2 min-w-0 sm:col-span-1">
                  <ArrowUpDown aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 transition-colors group-focus-within:text-blue-600" />
                  <select
                    aria-label="Sort by"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="min-h-10 w-full appearance-none rounded-2xl border border-slate-200 bg-white/80 py-2 pl-8 pr-8 text-xs font-medium text-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.02)_inset] transition-all duration-200 hover:border-slate-300 hover:bg-white focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100/70 cursor-pointer sm:w-auto"
                  >
                    <option value="newest">Newest first</option>
                    <option value="price_asc">Price: Low → High</option>
                    <option value="price_desc">Price: High → Low</option>
                  </select>
                  <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 transition-transform group-focus-within:rotate-180" />
                </div>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="col-span-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border border-rose-200/80 bg-rose-50/70 px-3 py-2 text-xs font-semibold text-rose-600 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] transition-all duration-200 hover:border-rose-300 hover:bg-rose-100/80 active:scale-[0.97] sm:col-span-1 sm:shrink-0"
                  >
                    <X className="h-3.5 w-3.5" /> Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Count */}
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 text-[11px] font-bold text-white shadow-sm">
                {filtered.length}
              </span>
              <p className="text-sm text-slate-500">
                {filtered.length === 1 ? 'property' : 'properties'}
                {hasFilters && <span className="ml-1 font-medium text-emerald-600">· filtered</span>}
              </p>
            </div>
            <Link
              href="/listings"
              className="group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              Full listings page
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
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
