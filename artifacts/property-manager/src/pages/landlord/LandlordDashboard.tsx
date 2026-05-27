import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import {
  Building2, MessageSquare, Plus, Search, X,
  ChevronDown, CheckCircle, TrendingUp, ArrowRight,
  Clock, AlertCircle, MapPin, BedDouble, Bath,
} from 'lucide-react'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient, getSupabaseImageUrl } from '../../lib/supabase'
import type { Landlord } from '../../lib/types'

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  available:         { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Available' },
  taken:             { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Taken' },
  coming_soon:       { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Coming Soon' },
  under_negotiation: { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Negotiating' },
}

const TYPE_LABEL: Record<string, string> = {
  sale: 'For Sale', rent: 'For Rent', lease: 'Lease', commercial: 'Commercial',
}

const TYPE_TABS = [
  { value: 'all',        label: 'All' },
  { value: 'rent',       label: 'For Rent' },
  { value: 'lease',      label: 'Lease' },
  { value: 'sale',       label: 'For Sale' },
  { value: 'commercial', label: 'Commercial' },
]

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export default function LandlordDashboard() {
  const [landlord, setLandlord]               = useState<Landlord | null>(null)
  const [user, setUser]                       = useState<{ email?: string } | null>(null)
  const [listings, setListings]               = useState<any[]>([])
  const [recentEnquiries, setRecentEnquiries] = useState<any[]>([])
  const [stats, setStats]                     = useState({ total: 0, available: 0, enquiries: 0, taken: 0 })
  const [loading, setLoading]                 = useState(true)

  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('')
  const [bedsFilter, setBedsFilter] = useState('')
  const [sortBy, setSortBy]         = useState('newest')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })
      const { data: l } = await supabase
        .from('landlords').select('*').eq('user_id', user.id).single() as { data: Landlord | null }
      setLandlord(l)
      if (l) {
        const [propsRes, enqsRes, availRes, takenRes, enqCountRes] = await Promise.all([
          supabase
            .from('properties')
            .select('*, property_images(id, storage_path, alt_text, is_cover, sort_order)')
            .eq('landlord_id', l.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('enquiries')
            .select('*, properties(title), tenants(full_name)')
            .eq('landlord_id', l.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('properties').select('id', { count: 'exact', head: true }).eq('landlord_id', l.id).eq('status', 'available'),
          supabase.from('properties').select('id', { count: 'exact', head: true }).eq('landlord_id', l.id).eq('status', 'taken'),
          supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('landlord_id', l.id),
        ])
        const props = (propsRes.data as any[]) ?? []
        setListings(props)
        setRecentEnquiries(enqsRes.data ?? [])
        setStats({
          total:     props.length,
          available: availRes.count ?? 0,
          enquiries: enqCountRes.count ?? 0,
          taken:     takenRes.count ?? 0,
        })
      }
      setLoading(false)
    })
  }, [])

  const displayName = landlord?.full_name || user?.email?.split('@')[0] || 'Landlord'
  const initials    = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'LL'
  const occupancy   = stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 0

  const hasFilters = typeFilter !== 'all' || !!stateFilter || !!bedsFilter || !!search
  function clearFilters() { setSearch(''); setTypeFilter('all'); setStateFilter(''); setBedsFilter('') }

  const filtered = listings
    .filter(p => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false
      if (stateFilter && !p.city?.toLowerCase().includes(stateFilter.toLowerCase())) return false
      if (bedsFilter && p.bedrooms < Number(bedsFilter)) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !p.title?.toLowerCase().includes(q) &&
          !p.city?.toLowerCase().includes(q) &&
          !(p.address ?? '').toLowerCase().includes(q)
        ) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc')  return Number(a.price) - Number(b.price)
      if (sortBy === 'price_desc') return Number(b.price) - Number(a.price)
      return 0
    })

  return (
    <AuthGuard require="landlord">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} isVerified={landlord?.is_verified} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header — same style as UserLayout */}
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-4 bg-white border-b border-gray-100 shrink-0">
            <h1 className="text-base font-extrabold text-gray-900 tracking-tight">My Listings</h1>
            <div className="flex items-center gap-3">
              <Link href="/landlord/listings/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-600/20 transition-colors">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Listing</span>
              </Link>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
              <span className="text-sm font-semibold text-gray-700 hidden sm:block">{displayName}</span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-4">

                {/* Status alerts */}
                {landlord?.status === 'pending' && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Account under review</p>
                      <p className="text-xs text-amber-600 mt-0.5">Pending admin approval. You'll be notified once verified.</p>
                    </div>
                  </div>
                )}
                {landlord?.status === 'rejected' && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-800">Account not approved</p>
                      <p className="text-xs text-red-600 mt-0.5">Contact support@livarex.com to resolve this.</p>
                    </div>
                  </div>
                )}

                {/* Slim stats strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total',     value: stats.total,     icon: Building2,     color: 'text-blue-600',    bg: 'bg-blue-50' },
                    { label: 'Available', value: stats.available, icon: CheckCircle,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Enquiries', value: stats.enquiries, icon: MessageSquare, color: 'text-violet-600',  bg: 'bg-violet-50' },
                    { label: 'Occupancy', value: `${occupancy}%`, icon: TrendingUp,    color: 'text-amber-600',   bg: 'bg-amber-50' },
                  ].map(s => {
                    const Icon = s.icon
                    return (
                      <div key={s.label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-4 h-4 ${s.color}`} strokeWidth={1.7} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{s.label}</p>
                          <p className="text-lg font-extrabold text-gray-900 leading-tight">{s.value}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Filter bar — identical to user overview */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative flex-1 min-w-40">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search by title, city or area…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Type tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                      {TYPE_TABS.map(t => (
                        <button key={t.value} onClick={() => setTypeFilter(t.value)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                            typeFilter === t.value
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                          }`}>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* State */}
                    <div className="relative shrink-0">
                      <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
                        className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer">
                        <option value="">Any State</option>
                        <option value="Lagos">Lagos</option>
                        <option value="Ogun">Ogun</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Beds */}
                    <div className="relative shrink-0">
                      <select value={bedsFilter} onChange={e => setBedsFilter(e.target.value)}
                        className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer">
                        <option value="">Any Beds</option>
                        <option value="1">1+ Beds</option>
                        <option value="2">2+ Beds</option>
                        <option value="3">3+ Beds</option>
                        <option value="4">4+ Beds</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Sort */}
                    <div className="relative shrink-0">
                      <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                        className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer">
                        <option value="newest">Newest</option>
                        <option value="price_asc">Price ↑</option>
                        <option value="price_desc">Price ↓</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>

                    {hasFilters && (
                      <button onClick={clearFilters}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-red-500 hover:bg-red-50 border border-red-100 shrink-0">
                        <X className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Count row */}
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm text-gray-500">
                    <span className="font-bold text-gray-900">{filtered.length}</span>{' '}
                    {filtered.length === 1 ? 'listing' : 'listings'}
                    {hasFilters && <span className="text-green-600 ml-1 font-medium">· filtered</span>}
                  </p>
                  <Link href="/landlord/listings"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    Manage all →
                  </Link>
                </div>

                {/* Listing grid */}
                {filtered.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center flex flex-col items-center">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                      <Building2 className="w-7 h-7 text-gray-300" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">
                      {listings.length === 0 ? 'No listings yet' : 'No listings match your filters'}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {listings.length === 0 ? 'Add your first property to get started.' : 'Try adjusting your search or filters.'}
                    </p>
                    {listings.length === 0 ? (
                      <Link href="/landlord/listings/new"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">
                        <Plus className="w-4 h-4" /> Add your first listing
                      </Link>
                    ) : (
                      <button onClick={clearFilters}
                        className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors">
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(p => {
                      const st = STATUS_STYLE[p.status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: p.status }
                      const imgs: any[] = p.property_images ?? []
                      const cover = imgs.find((i: any) => i.is_cover) ?? imgs[0]
                      const coverUrl = cover ? getSupabaseImageUrl(cover.storage_path) : null

                      return (
                        <div key={p.id}
                          className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 flex flex-col">
                          {/* Image */}
                          <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                            {coverUrl ? (
                              <img src={coverUrl} alt={p.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Building2 className="w-12 h-12" />
                              </div>
                            )}
                            {/* Status badge */}
                            <div className="absolute top-3 left-3">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm ${st.bg} ${st.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                {st.label}
                              </span>
                            </div>
                            {/* Type badge */}
                            <div className="absolute top-3 right-3">
                              <span className="px-2.5 py-1 bg-gray-900/80 backdrop-blur-sm text-white text-[11px] font-bold rounded-lg">
                                {TYPE_LABEL[p.type] ?? p.type}
                              </span>
                            </div>
                            {/* Listed time */}
                            <div className="absolute bottom-3 left-3">
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold rounded-md">
                                <Clock className="w-2.5 h-2.5" />
                                Listed {timeAgo(p.created_at)}
                              </span>
                            </div>
                            {p.featured && (
                              <div className="absolute bottom-3 right-3">
                                <span className="px-2 py-0.5 bg-amber-400 text-amber-900 text-[10px] font-bold rounded-md uppercase tracking-wide">
                                  Featured
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-4 flex flex-col flex-1">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div>
                                <span className="text-2xl font-bold text-gray-900 tracking-tight">
                                  ₦{Number(p.price).toLocaleString()}
                                </span>
                                {(p.type === 'rent' || p.type === 'lease') && (
                                  <span className="text-sm text-gray-400 ml-1">yr</span>
                                )}
                              </div>
                              <Link href={`/landlord/listings/${p.id}/edit`}
                                className="shrink-0 px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                                Edit
                              </Link>
                            </div>

                            <p className="text-sm font-semibold text-gray-800 truncate">{p.title}</p>

                            <div className="flex items-center gap-1 mt-1.5 text-green-600 text-xs font-medium">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{p.address ? `${p.address}, ${p.city}` : p.city}</span>
                            </div>

                            {/* Specs */}
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-4 pt-4 border-t border-gray-50">
                              <span className="flex items-center gap-1.5">
                                <BedDouble className="w-4 h-4 text-blue-400" />
                                <span className="font-medium text-gray-700">{p.bedrooms}</span>
                                <span className="text-xs text-gray-400">bed{p.bedrooms !== 1 ? 's' : ''}</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Bath className="w-4 h-4 text-blue-400" />
                                <span className="font-medium text-gray-700">{p.bathrooms}</span>
                                <span className="text-xs text-gray-400">bath</span>
                              </span>
                              {p.area_sqft && (
                                <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">
                                  {Number(p.area_sqft).toLocaleString()} sqft
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Recent Enquiries strip */}
                {recentEnquiries.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                      <h2 className="text-sm font-bold text-gray-900">Recent Enquiries</h2>
                      <Link href="/landlord/inbox"
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        Open inbox <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {recentEnquiries.map((e: any) => (
                        <div key={e.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                          <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                            <MessageSquare className="w-3.5 h-3.5 text-violet-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-gray-800 truncate">
                                {e.tenants?.full_name ?? 'Tenant'} · {e.properties?.title ?? 'Property'}
                              </p>
                              <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                e.status === 'open'    ? 'bg-amber-100 text-amber-700' :
                                e.status === 'replied' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-gray-100 text-gray-500'
                              }`}>{e.status}</span>
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {e.message?.slice(0, 80)}{e.message?.length > 80 ? '…' : ''}
                            </p>
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(e.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
