import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import {
  Building2, Search, LayoutGrid, List,
  MapPin, BedDouble, Bath, Pencil, Trash2, ArrowRight, Plus, Eye,
  SlidersHorizontal, CheckCircle, Clock, XCircle,
} from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AdminHeader from '../../components/AdminHeader'
import AuthGuard from '../../components/AuthGuard'
import { createClient, getSupabaseImageUrl } from '../../lib/supabase'

const FALLBACK_IMAGES: Record<string, string> = {
  apartment: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=70',
  villa:     'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=70',
  duplex:    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=70',
  bungalow:  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=70',
  studio:    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=70',
  office:    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=70',
  shop:      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=70',
  land:      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=70',
  default:   'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=70',
}

function getCoverImage(p: any): string {
  const images = p.property_images ?? []
  const cover = images.find((img: any) => img.is_cover) ?? images[0]
  if (cover?.storage_path) return getSupabaseImageUrl(cover.storage_path)
  return FALLBACK_IMAGES[p.property_type?.toLowerCase()] ?? FALLBACK_IMAGES.default
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  sale: { label: 'For Sale', cls: 'bg-blue-600 text-white' },
  rent: { label: 'For Rent', cls: 'bg-emerald-500 text-white' },
}

const STATUS_META: Record<string, { label: string; icon: any; cls: string }> = {
  available:         { label: 'Available',    icon: CheckCircle, cls: 'text-emerald-600 bg-emerald-50' },
  taken:             { label: 'Taken',         icon: XCircle,     cls: 'text-red-500 bg-red-50' },
  coming_soon:       { label: 'Coming Soon',   icon: Clock,       cls: 'text-blue-600 bg-blue-50' },
  under_negotiation: { label: 'Negotiating',   icon: Clock,       cls: 'text-amber-600 bg-amber-50' },
}

export default function AdminProperties() {
  const [user, setUser]             = useState<{ email?: string } | null>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [filtered, setFiltered]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [viewMode, setViewMode]     = useState<'grid' | 'list'>('grid')
  const [sort, setSort]             = useState('newest')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleting, setDeleting]     = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
    supabase
      .from('properties')
      .select('*, landlords(full_name, is_verified), property_images(id, storage_path, is_cover, sort_order)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProperties(data ?? [])
        setFiltered(data ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    let list = [...properties]
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.property_type?.toLowerCase().includes(q)
      )
    }
    if (sort === 'newest')     list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    if (sort === 'oldest')     list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (sort === 'price_asc')  list.sort((a, b) => Number(a.price) - Number(b.price))
    if (sort === 'price_desc') list.sort((a, b) => Number(b.price) - Number(a.price))
    setFiltered(list)
  }, [search, sort, statusFilter, properties])

  async function handleDelete(id: string) {
    if (!confirm('Delete this property? This cannot be undone.')) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('properties').delete().eq('id', id)
    setProperties(ps => ps.filter(p => p.id !== id))
    setDeleting(null)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const available = properties.filter(p => p.status === 'available').length
  const taken     = properties.filter(p => p.status === 'taken').length

  const STATUS_TABS = [
    { key: 'all',       label: 'All',       count: properties.length },
    { key: 'available', label: 'Available',  count: available },
    { key: 'taken',     label: 'Taken',      count: taken },
  ]

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title="Properties"
            subtitle={`${properties.length.toLocaleString()} total listings`}
            action={
              <Link href="/landlord/listings/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-600/20 transition-colors">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Property</span>
              </Link>
            }
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4">
            {/* Summary chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {STATUS_TABS.map(tab => (
                <button key={tab.key} type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    statusFilter === tab.key
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  }`}>
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                    statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Search + controls */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by title, city, type…"
                  className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent" />
              </div>
              <button className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>
              <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <button type="button" onClick={() => setViewMode('grid')}
                  className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setViewMode('list')}
                  className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="hidden sm:block px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-40">
                <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">{search ? 'No properties match your search.' : 'No properties found.'}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                {filtered.map(p => {
                  const badge  = TYPE_BADGE[p.type] ?? TYPE_BADGE.sale
                  const status = STATUS_META[p.status] ?? STATUS_META.available
                  const StatusIcon = status.icon
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group">
                      <div className="relative h-48 overflow-hidden">
                        <img src={getCoverImage(p)} alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          onError={(e: any) => { e.currentTarget.src = FALLBACK_IMAGES.default }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm ${badge.cls}`}>{badge.label}</span>
                          {p.featured && (
                            <span className="px-2 py-0.5 bg-amber-400 text-gray-900 text-[10px] font-black rounded-lg uppercase tracking-wide shadow-sm">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="absolute bottom-3 left-3">
                          <p className="text-xs font-bold text-white/90 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-lg">
                            ₦{Number(p.price).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1 flex-1">{p.title}</h3>
                          <div className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${status.cls}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {p.city}
                          {p.landlords?.full_name && (
                            <span className="text-gray-300 mx-1">·</span>
                          )}
                          {p.landlords?.full_name && (
                            <span className="truncate">{p.landlords.full_name}</span>
                          )}
                        </div>

                        {(p.bedrooms != null || p.bathrooms != null) && (
                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 pb-3 border-b border-gray-100">
                            {p.bedrooms != null && (
                              <span className="flex items-center gap-1">
                                <BedDouble className="w-3.5 h-3.5 text-gray-400" />
                                {p.bedrooms} Beds
                              </span>
                            )}
                            {p.bathrooms != null && (
                              <span className="flex items-center gap-1">
                                <Bath className="w-3.5 h-3.5 text-gray-400" />
                                {p.bathrooms} Baths
                              </span>
                            )}
                            <span className="ml-auto text-[10px] font-semibold text-gray-400 uppercase">{p.property_type ?? p.type}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button title="Edit"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} title="Delete"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <Link href={`/listings/${p.id}`}
                            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                            View <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Property</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Landlord</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Price</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="text-right px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(p => {
                      const badge  = TYPE_BADGE[p.type] ?? TYPE_BADGE.sale
                      const status = STATUS_META[p.status] ?? STATUS_META.available
                      const StatusIcon = status.icon
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
                                <img src={getCoverImage(p)} alt={p.title} className="w-full h-full object-cover"
                                  onError={(e: any) => { e.currentTarget.src = FALLBACK_IMAGES.default }} />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1">{p.title}</p>
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                                  <MapPin className="w-3 h-3" />{p.city}
                                  <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">
                            {p.landlords?.full_name ?? '—'}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-bold text-gray-900 hidden sm:table-cell">
                            ₦{Number(p.price).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${status.cls}`}>
                              <StatusIcon className="w-3 h-3" />{status.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <Link href={`/listings/${p.id}`}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
