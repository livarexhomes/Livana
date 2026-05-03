import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { Building2 } from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const statusStyles: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  taken: 'bg-red-100 text-red-700',
  coming_soon: 'bg-blue-100 text-blue-700',
  under_negotiation: 'bg-yellow-100 text-yellow-700',
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
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <AdminSidebar userEmail={user?.email} userName={displayName} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-100 shrink-0">
            <h1 className="font-semibold text-gray-900">Properties</h1>
            <span className="text-sm text-gray-500">{properties.length} total</span>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-[#aadb5a] border-t-transparent rounded-full" />
              </div>
            ) : properties.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500">No properties found.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Property</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Landlord</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Price</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {properties.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <Link href={`/listings/${p.id}`} className="font-medium text-gray-900 text-sm hover:underline">{p.title}</Link>
                          <p className="text-xs text-gray-400 mt-0.5">{p.city} · {p.type}</p>
                          {p.featured && <span className="inline-block mt-1 px-1.5 py-0.5 bg-[#aadb5a] text-gray-900 text-[10px] font-bold rounded">Featured</span>}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 hidden md:table-cell">{p.landlords?.full_name ?? '—'}</td>
                        <td className="px-5 py-4 text-sm text-gray-900 font-medium hidden sm:table-cell">₦{Number(p.price).toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <select
                            value={p.status}
                            onChange={e => updateStatus(p.id, e.target.value)}
                            className="text-xs font-semibold border-0 bg-transparent focus:outline-none cursor-pointer"
                          >
                            <option value="available">Available</option>
                            <option value="taken">Taken</option>
                            <option value="coming_soon">Coming Soon</option>
                            <option value="under_negotiation">Under Negotiation</option>
                          </select>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <button
                              onClick={() => toggleFeatured(p.id, !p.featured)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${p.featured ? 'bg-[#aadb5a] text-gray-900 hover:bg-[#9bcf4a]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
