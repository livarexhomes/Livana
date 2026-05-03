import { useState, useEffect } from 'react'
import { useSearch } from 'wouter'
import { Bell, Search, Users } from 'lucide-react'
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
      <div className="flex min-h-screen bg-slate-50">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-white border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">Landlords</h1>
                <p className="text-[11px] text-gray-400 font-medium">{landlords.length} total</p>
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

          {/* Filter tabs */}
          <div className="px-4 md:px-6 py-3 bg-white border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
            {['', 'pending', 'approved', 'rejected'].map(s => (
              <button key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                {s || 'All'}
              </button>
            ))}
          </div>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : landlords.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No landlords found.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Landlord</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">WhatsApp</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Verified</th>
                      <th className="text-right px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {landlords.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-blue-600">{l.full_name.slice(0, 2).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{l.full_name}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {new Date(l.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 hidden sm:table-cell">{l.whatsapp}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusStyles[l.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <button
                            onClick={() => toggleVerified(l.id, !l.is_verified)}
                            disabled={processing === l.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                              l.is_verified
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {l.is_verified ? 'Verified' : 'Unverified'}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            {l.status !== 'approved' && (
                              <button
                                onClick={() => updateStatus(l.id, 'approved')}
                                disabled={processing === l.id}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                              >
                                Approve
                              </button>
                            )}
                            {l.status !== 'rejected' && (
                              <button
                                onClick={() => updateStatus(l.id, 'rejected')}
                                disabled={processing === l.id}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
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
