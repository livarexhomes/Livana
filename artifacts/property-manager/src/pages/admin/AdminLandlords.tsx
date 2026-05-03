import { useState, useEffect } from 'react'
import { useSearch } from 'wouter'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Landlord } from '../../lib/types'

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function AdminLandlords() {
  const search = useSearch()
  const params = new URLSearchParams(search)
  const filterParam = params.get('filter') ?? ''

  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [landlords, setLandlords] = useState<Landlord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(filterParam)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser({ email: user?.email })
    })
    fetchLandlords()
  }, [statusFilter])

  async function fetchLandlords() {
    setLoading(true)
    const supabase = createClient()
    let query = supabase.from('landlords').select('*').order('created_at', { ascending: false })
    if (statusFilter) query = query.eq('status', statusFilter)
    const { data } = await query
    setLandlords((data as Landlord[]) ?? [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setProcessing(id)
    const supabase = createClient()
    await supabase.from('landlords').update({ status }).eq('id', id)
    setLandlords(ls => ls.map(l => l.id === id ? { ...l, status } : l))
    setProcessing(null)
  }

  async function toggleVerified(id: string, is_verified: boolean) {
    setProcessing(id)
    const supabase = createClient()
    await supabase.from('landlords').update({ is_verified }).eq('id', id)
    setLandlords(ls => ls.map(l => l.id === id ? { ...l, is_verified } : l))
    setProcessing(null)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'

  return (
    <AuthGuard require="admin">
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <AdminSidebar userEmail={user?.email} userName={displayName} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-100 shrink-0">
            <h1 className="font-semibold text-gray-900">Landlords</h1>
            <div className="flex items-center gap-2">
              {['', 'pending', 'approved', 'rejected'].map(s => (
                <button key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === s ? 'bg-[#6b9e6e] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s || 'All'}
                </button>
              ))}
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-[#aadb5a] border-t-transparent rounded-full" />
              </div>
            ) : landlords.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                <p className="text-gray-500">No landlords found.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Landlord</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">WhatsApp</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Verified</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {landlords.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900 text-sm">{l.full_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(l.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 hidden sm:table-cell">{l.whatsapp}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[l.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <button
                            onClick={() => toggleVerified(l.id, !l.is_verified)}
                            disabled={processing === l.id}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${l.is_verified ? 'bg-[#6b9e6e] text-white hover:bg-[#4a7f4d]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          >
                            {l.is_verified ? 'Verified' : 'Not verified'}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            {l.status !== 'approved' && (
                              <button
                                onClick={() => updateStatus(l.id, 'approved')}
                                disabled={processing === l.id}
                                className="px-3 py-1.5 bg-[#6b9e6e] hover:bg-[#4a7f4d] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                              >
                                Approve
                              </button>
                            )}
                            {l.status !== 'rejected' && (
                              <button
                                onClick={() => updateStatus(l.id, 'rejected')}
                                disabled={processing === l.id}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                              >
                                Reject
                              </button>
                            )}
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
