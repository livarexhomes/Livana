import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { Building2, Bell, Search } from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const statusStyles: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  taken: 'bg-red-100 text-red-700',
  coming_soon: 'bg-blue-100 text-blue-700',
  under_negotiation: 'bg-amber-100 text-amber-700',
}

export default function AdminProperties() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser({ email: user?.email })
    })
    supabase
      .from('properties')
      .select('*, landlords(full_name, is_verified)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProperties(data ?? [])
        setLoading(false)
      })
  }, [])

  async function toggleFeatured(id: string, featured: boolean) {
    const supabase = createClient()
    await supabase.from('properties').update({ featured }).eq('id', id)
    setProperties(ps => ps.map(p => p.id === id ? { ...p, featured } : p))
  }

  async function updateStatus(id: string, status: string) {
    const supabase = createClient()
    await supabase.from('properties').update({ status }).eq('id', id)
    setProperties(ps => ps.map(p => p.id === id ? { ...p, status } : p))
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'

  return (
    <AuthGuard require="admin">
      <div className="flex min-h-screen bg-slate-50">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 flex items-center justify-between pl-14 pr-4 md:px-6 bg-white border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">Properties</h1>
                <p className="text-[11px] text-gray-400 font-medium">{properties.length} total</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 w-44 md:w-56">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input placeholder="Search…" className="bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none w-full" />
              </div>
              <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                <Bell className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : properties.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No properties found.</p>
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
                    {properties.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <Link href={`/listings/${p.id}`} className="font-semibold text-gray-900 text-sm hover:text-blue-600 transition-colors">{p.title}</Link>
                          <p className="text-[11px] text-gray-400 mt-0.5">{p.city} · {p.type}</p>
                          {p.featured && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">Featured</span>
                          )}
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-blue-600">{(p.landlords?.full_name ?? 'UN').slice(0, 2).toUpperCase()}</span>
                            </div>
                            <span className="text-sm text-gray-600">{p.landlords?.full_name ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900 hidden sm:table-cell">₦{Number(p.price).toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusStyles[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {p.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={p.status}
                              onChange={e => updateStatus(p.id, e.target.value)}
                              className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer hidden sm:block"
                            >
                              <option value="available">Available</option>
                              <option value="taken">Taken</option>
                              <option value="coming_soon">Coming Soon</option>
                              <option value="under_negotiation">Negotiation</option>
                            </select>
                            <button
                              onClick={() => toggleFeatured(p.id, !p.featured)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                                p.featured
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {p.featured ? 'Unfeature' : 'Feature'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
