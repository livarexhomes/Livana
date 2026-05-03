import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import {
  Building2, Search, SlidersHorizontal, LayoutGrid, List,
  MapPin, BedDouble, Bath, Square, Pencil, Trash2, ArrowRight, Plus,
} from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
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

const BADGE: Record<string, { label: string; bg: string; text: string }> = {
  sale:    { label: 'For Sale', bg: 'bg-blue-600',   text: 'text-white' },
  rent:    { label: 'For Rent', bg: 'bg-emerald-500', text: 'text-white' },
}

export default function AdminProperties() {
  const [user, setUser]           = useState<{ email?: string } | null>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [filtered, setFiltered]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [viewMode, setViewMode]   = useState<'grid' | 'list'>('grid')
  const [sort, setSort]           = useState('newest')
  const [deleting, setDeleting]   = useState<string | null>(null)

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
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.property_type?.toLowerCase().includes(q)
      )
    }
    if (sort === 'newest') list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    if (sort === 'oldest') list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (sort === 'price_asc') list.sort((a, b) => Number(a.price) - Number(b.price))
    if (sort === 'price_desc') list.sort((a, b) => Number(b.price) - Number(a.price))
    setFiltered(list)
  }, [search, sort, properties])

  async function handleDelete(id: string) {
    if (!confirm('Delete this property? This cannot be undone.')) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('properties').delete().eq('id', id)
    setProperties(ps => ps.filter(p => p.id !== id))
    setDeleting(null)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'

  return (
    <AuthGuard require="admin">
      <div className="flex min-h-screen bg-slate-50">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* ── Top bar ── */}
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-5 bg-white border-b border-gray-100 shrink-0">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Properties</h1>
              <p className="text-sm text-gray-400 mt-0.5">Manage your property listings</p>
            </div>
            <Link href="/landlord/listings/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-600/20 transition-colors">
              <Plus className="w-4 h-4" />
              Add Property
            </Link>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4">
            {/* ── Search & Filters ── */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search properties..."
                  className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent"
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
              <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="hidden sm:block px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
            </div>

            {/* ── Content ── */}
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">
                  {search ? 'No properties match your search.' : 'No properties found.'}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              /* ── Grid View ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                {filtered.map(p => {
                  const badge = BADGE[p.type] ?? BADGE.sale
                  const imgSrc = getCoverImage(p)
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                      {/* Image */}
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={imgSrc}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e: any) => { e.currentTarget.src = FALLBACK_IMAGES.default }}
                        />
                        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text} shadow`}>
                          {badge.label}
                        </span>
                        {p.featured && (
                          <span className="absolute top-3 right-3 px-2 py-0.5 bg-amber-400 text-gray-900 text-[10px] font-black rounded-full uppercase tracking-wide">
                            Featured
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1 flex-1">{p.title}</h3>
                          <div className="shrink-0 text-right">
                            <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide leading-none">NGN</p>
                            <p className="text-base font-extrabold text-blue-600 leading-tight">
                              {Number(p.price).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1 mb-3">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            {p.city}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            {p.property_type ?? p.type}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3 text-xs text-gray-500 border-t border-gray-100 pt-3 mb-3">
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
                          {p.area_sqft != null && (
                            <span className="flex items-center gap-1">
                              <Square className="w-3.5 h-3.5 text-gray-400" />
                              {Number(p.area_sqft).toLocaleString()} sqft
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            <button
                              title="Edit"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deleting === p.id}
                              title="Delete"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <Link href={`/listings/${p.id}`}
                            className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                            View Details <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* ── List View ── */
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Property</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Landlord</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Price</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                      <th className="text-right px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(p => {
                      const badge = BADGE[p.type] ?? BADGE.sale
                      const imgSrc = getCoverImage(p)
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <img src={imgSrc} alt={p.title} className="w-12 h-12 rounded-xl object-cover shrink-0"
                                onError={(e: any) => { e.currentTarget.src = FALLBACK_IMAGES.default }} />
                              <div>
                                <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1">{p.title}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">{p.city}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-600 hidden md:table-cell">{p.landlords?.full_name ?? '—'}</td>
                          <td className="px-5 py-3 text-sm font-semibold text-blue-600 hidden sm:table-cell">₦{Number(p.price).toLocaleString()}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>{badge.label}</span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <Link href={`/listings/${p.id}`}
                                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700">
                                Details <ArrowRight className="w-3 h-3" />
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
