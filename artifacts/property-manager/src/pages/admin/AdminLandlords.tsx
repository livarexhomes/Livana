import { useState, useEffect } from 'react'
import {
  Users, Search, Mail, Phone, MapPin,
  Building2, CheckCircle, Clock, XCircle, Plus, SlidersHorizontal,
} from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AdminHeader from '../../components/AdminHeader'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const STATUS_META: Record<string, { label: string; icon: any; bg: string; text: string; dot: string }> = {
  approved: { label: 'Verified',  icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  pending:  { label: 'Pending',   icon: Clock,       bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  rejected: { label: 'Rejected',  icon: XCircle,     bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500'     },
}

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600', 'from-blue-500 to-blue-700',
  'from-emerald-400 to-teal-600',  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',  'from-indigo-400 to-indigo-600',
  'from-cyan-400 to-cyan-600',
]

function avatarGrad(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function AdminLandlords() {
  const [user, setUser]         = useState<{ email?: string } | null>(null)
  const [clients, setClients]   = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [sort, setSort]         = useState('newest')
  const [statusFilter, setStatusFilter] = useState('all')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
    supabase
      .from('landlords')
      .select('*, properties(count)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data ?? []).map((l: any) => ({
          ...l,
          property_count: l.properties?.[0]?.count ?? 0,
        }))
        setClients(list)
        setFiltered(list)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    let list = [...clients]
    if (statusFilter !== 'all') list = list.filter(l => l.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(l =>
        l.full_name?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.whatsapp?.includes(q)
      )
    }
    if (sort === 'newest') list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    if (sort === 'oldest') list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (sort === 'name')   list.sort((a, b) => a.full_name.localeCompare(b.full_name))
    setFiltered(list)
  }, [search, sort, statusFilter, clients])

  async function handleApprove(id: string) {
    setProcessing(id)
    const supabase = createClient()
    await supabase.from('landlords').update({ status: 'approved' }).eq('id', id)
    setClients(cs => cs.map(c => c.id === id ? { ...c, status: 'approved' } : c))
    setProcessing(null)
  }

  async function handleReject(id: string) {
    if (!confirm('Reject this landlord?')) return
    setProcessing(id)
    const supabase = createClient()
    await supabase.from('landlords').update({ status: 'rejected' }).eq('id', id)
    setClients(cs => cs.map(c => c.id === id ? { ...c, status: 'rejected' } : c))
    setProcessing(null)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const pending  = clients.filter(c => c.status === 'pending').length
  const approved = clients.filter(c => c.status === 'approved').length

  const STATUS_TABS = [
    { key: 'all',      label: 'All',      count: clients.length },
    { key: 'approved', label: 'Verified', count: approved },
    { key: 'pending',  label: 'Pending',  count: pending },
  ]

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title="Clients"
            subtitle={`${clients.length.toLocaleString()} landlords${pending > 0 ? ` · ${pending} pending` : ''}`}
            pendingCount={pending}
            action={
              <button type="button"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-600/20 transition-colors">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Invite Client</span>
              </button>
            }
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4">
            {/* Status tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {STATUS_TABS.map(tab => (
                <button key={tab.key} type="button" onClick={() => setStatusFilter(tab.key)}
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

            {/* Search + sort */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, city, phone…"
                  className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent" />
              </div>
              <button className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>

            {/* Pending banner */}
            {pending > 0 && statusFilter === 'all' && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm font-semibold text-amber-800 flex-1">
                  {pending} landlord{pending > 1 ? 's' : ''} waiting for approval — review and approve their accounts.
                </p>
                <button type="button" onClick={() => setStatusFilter('pending')}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors">
                  Show pending →
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-40">
                <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">{search ? 'No clients match your search.' : 'No clients found.'}</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead className="bg-slate-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Landlord</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Contact</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden lg:table-cell">Location</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Properties</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="text-right px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(l => {
                      const meta = STATUS_META[l.status] ?? STATUS_META.pending
                      const StatusIcon = meta.icon
                      const grad = avatarGrad(l.full_name)
                      const initials = getInitials(l.full_name)
                      return (
                        <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 shadow-sm`}>
                                <span className="text-xs font-bold text-white">{initials}</span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 text-sm leading-tight">{l.full_name}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  Since {new Date(l.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <div className="space-y-1">
                              {l.email && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Mail className="w-3 h-3 text-gray-400" />
                                  <span className="truncate max-w-[160px]">{l.email}</span>
                                </div>
                              )}
                              {l.whatsapp && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Phone className="w-3 h-3 text-gray-400" />
                                  {l.whatsapp}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            {l.city ? (
                              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                {l.city}
                              </div>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                              <Building2 className="w-3.5 h-3.5 text-gray-400" />
                              {l.property_count}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${meta.bg} ${meta.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {l.status === 'pending' && (
                                <>
                                  <button type="button"
                                    onClick={() => handleApprove(l.id)}
                                    disabled={processing === l.id}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50">
                                    Approve
                                  </button>
                                  <button type="button"
                                    onClick={() => handleReject(l.id)}
                                    disabled={processing === l.id}
                                    className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold rounded-lg transition-colors disabled:opacity-50">
                                    Reject
                                  </button>
                                </>
                              )}
                              {l.status !== 'pending' && (
                                <span className="text-xs text-gray-400 italic">No actions</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
