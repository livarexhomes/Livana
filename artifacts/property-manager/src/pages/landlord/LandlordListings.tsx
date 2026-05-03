import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import {
  Plus, Building2, Pencil, Trash2, MapPin, BedDouble, Bath,
  LayoutGrid, List, Search, CheckCircle, Clock, XCircle, AlertCircle,
} from 'lucide-react'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Property, Landlord } from '../../lib/types'

const STATUS: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  available:         { label: 'Available',   bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle },
  taken:             { label: 'Taken',        bg: 'bg-red-50',     text: 'text-red-600',     icon: XCircle    },
  coming_soon:       { label: 'Coming Soon', bg: 'bg-blue-50',    text: 'text-blue-700',    icon: Clock      },
  under_negotiation: { label: 'Negotiating', bg: 'bg-amber-50',   text: 'text-amber-700',   icon: AlertCircle},
}

export default function LandlordListings() {
  const [landlord, setLandlord]   = useState<Landlord | null>(null)
  const [user, setUser]           = useState<{ email?: string } | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [filtered, setFiltered]   = useState<Property[]>([])
  const [loading, setLoading]     = useState(true)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [viewMode, setViewMode]   = useState<'grid' | 'list'>('list')
  const [search, setSearch]       = useState('')

  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(q
      ? properties.filter(p =>
          (p.title ?? '').toLowerCase().includes(q) ||
          (p.city ?? '').toLowerCase().includes(q)
        )
      : properties
    )
  }, [search, properties])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUser({ email: user.email })
    const { data: l } = await supabase.from('landlords').select('*').eq('user_id', user.id).single() as { data: Landlord | null }
    setLandlord(l)
    if (l) {
      const { data } = await supabase.from('properties').select('*').eq('landlord_id', l.id).order('created_at', { ascending: false }) as unknown as { data: Property[] | null }
      setProperties(data ?? [])
      setFiltered(data ?? [])
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this listing? This cannot be undone.')) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('property_images').delete().eq('property_id', id)
    await supabase.from('properties').delete().eq('id', id)
    setProperties(ps => ps.filter(p => p.id !== id))
    setDeleting(null)
  }

  return (
    <AuthGuard require="landlord">
      <div className="flex min-h-screen bg-[#F4F6FB]">
        <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} isVerified={landlord?.is_verified} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-4 bg-white border-b border-gray-100 shrink-0">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">My Listings</h1>
              <p className="text-sm text-gray-400 mt-0.5">{properties.length} total properties</p>
            </div>
            <Link href="/landlord/listings/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-600/20 transition-colors">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Listing</span>
            </Link>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4">
            {/* Search + view toggle */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by title or city…"
                  className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent" />
              </div>
              <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <button type="button" onClick={() => setViewMode('list')}
                  className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <List className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setViewMode('grid')}
                  className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-1">
                  {search ? 'No listings match your search' : 'No listings yet'}
                </h3>
                <p className="text-sm text-gray-500 mb-5">
                  {search ? 'Try a different search term.' : 'Add your first property listing to get started.'}
                </p>
                {!search && (
                  <Link href="/landlord/listings/new"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4" /> Add your first listing
                  </Link>
                )}
              </div>
            ) : viewMode === 'list' ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Property</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Location</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Price</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="text-right px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((p: any) => {
                      const s = STATUS[p.status] ?? { label: p.status, bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock }
                      const SIcon = s.icon
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-900 text-sm leading-tight">{p.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {p.bedrooms != null && `${p.bedrooms}bd`}{p.bathrooms != null && ` · ${p.bathrooms}ba`}
                              {p.property_type && ` · ${p.property_type}`}
                            </p>
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />{p.city}
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <p className="text-sm font-bold text-gray-900">₦{Number(p.price).toLocaleString()}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${s.bg} ${s.text}`}>
                              <SIcon className="w-3 h-3" />{s.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/landlord/listings/${p.id}/edit`}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </Link>
                              <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((p: any) => {
                  const s = STATUS[p.status] ?? { label: p.status, bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock }
                  const SIcon = s.icon
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${s.bg} ${s.text}`}>
                          <SIcon className="w-3 h-3" />{s.label}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2">{p.title}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                        <MapPin className="w-3.5 h-3.5" />{p.city}
                      </div>
                      <p className="text-base font-extrabold text-blue-600 mb-3">₦{Number(p.price).toLocaleString()}</p>
                      {(p.bedrooms != null || p.bathrooms != null) && (
                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 pb-3 border-b border-gray-100">
                          {p.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{p.bedrooms} Beds</span>}
                          {p.bathrooms != null && <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{p.bathrooms} Baths</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Link href={`/landlord/listings/${p.id}/edit`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Link>
                        <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                          className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
