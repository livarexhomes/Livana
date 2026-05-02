import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Property, Landlord } from '../../lib/types'

const statusStyles: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  taken: 'bg-red-100 text-red-700',
  coming_soon: 'bg-blue-100 text-blue-700',
  under_negotiation: 'bg-yellow-100 text-yellow-700',
}

export default function LandlordListings() {
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

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
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this listing?')) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('property_images').delete().eq('property_id', id)
    await supabase.from('properties').delete().eq('id', id)
    setProperties(ps => ps.filter(p => p.id !== id))
    setDeleting(null)
  }

  return (
    <AuthGuard require="landlord">
      <div className="flex min-h-screen bg-gray-50">
        <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} isVerified={landlord?.is_verified} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-100 shrink-0">
            <h1 className="font-semibold text-gray-900">My Listings</h1>
            <Link href="/landlord/listings/new"
              className="flex items-center gap-2 px-4 py-2 bg-[#6b9e6e] hover:bg-[#4a7f4d] text-white text-sm font-semibold rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Add Listing
            </Link>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-[#aadb5a] border-t-transparent rounded-full" />
              </div>
            ) : properties.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-1">No listings yet</h3>
                <p className="text-sm text-gray-500 mb-4">Add your first property listing to get started.</p>
                <Link href="/landlord/listings/new" className="inline-flex items-center gap-2 px-4 py-2 bg-[#6b9e6e] text-white text-sm font-semibold rounded-xl">
                  <Plus className="w-4 h-4" /> Add Listing
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Property</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">City</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Price</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {properties.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900 text-sm">{p.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{p.bedrooms}bd · {p.bathrooms}ba</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 hidden sm:table-cell">{p.city}</td>
                        <td className="px-5 py-4 text-sm text-gray-900 font-medium hidden md:table-cell">₦{Number(p.price).toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {p.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            <Link href={`/landlord/listings/${p.id}/edit`}
                              className="p-2 text-gray-400 hover:text-[#6b9e6e] hover:bg-[#6b9e6e]/10 rounded-lg transition-colors">
                              <Pencil className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deleting === p.id}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
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
