import { useState, useEffect } from 'react'
import {
  Users, Search, Mail, Phone, MapPin,
  Building2, CheckCircle, Clock, XCircle, Plus, SlidersHorizontal, Ban, ShieldCheck,
} from 'lucide-react'
import { Link } from 'wouter'
import AdminSidebar from '../../components/AdminSidebar'
import AdminHeader from '../../components/AdminHeader'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const STATUS_META: Record<string, { label: string; icon: any; bg: string; text: string; dot: string }> = {
  approved:      { label: 'Approved',      icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  pending:       { label: 'KYC Pending',   icon: Clock,       bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  rejected:      { label: 'Rejected',      icon: XCircle,     bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500'     },
  suspended:     { label: 'Suspended',     icon: Ban,         bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500'  },
  not_submitted: { label: 'Not Submitted', icon: Clock,       bg: 'bg-gray-50',    text: 'text-gray-500',    dot: 'bg-gray-400'    },
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

  async function updateStatus(id: string, status: string) {
    setProcessing(id)
    const supabase = createClient()
    const patch: any = { status }
    if (status === 'approved') patch.is_verified = true
    await supabase.from('landlords').update(patch).eq('id', id)
    setClients(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c))
    setProcessing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Permanently delete this landlord record? This cannot be undone.')) return
    setProcessing(id)
    const supabase = createClient()
    await supabase.from('landlords').delete().eq('id', id)
    setClients(cs => cs.filter(c => c.id !== id))
    setProcessing(null)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const pending  = clients.filter(c => c.status === 'pending').length
  const approved = clients.filter(c => c.status === 'approved').length

  const STATUS_TABS = [
    { key: 'all',           label: 'All',           count: clients.length },
    { key: 'approved',      label: 'Approved',      count: approved },
    { key: 'pending',       label: 'KYC Pending',   count: pending },
    { key: 'suspended',     label: 'Suspended',     count: clients.filter(c => c.status === 'suspended').length },
    { key: 'not_submitted', label: 'Not Submitted', count: clients.filter(c => c.status === 'not_submitted').length },
  ]

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title="Clients"
            subtitle={`${clients.length.toLocaleString()} landlords${pending > 0 ? ` · ${pending} pending KYC` : ''}`}
            pendingCount={pending}
            action={
              <Link href="/admin/kyc">
                <button type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">KYC Review</span>
                </button>
              </Link>
            }
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            <div className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
              <div className="space-y-4">
                <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_80px_-40px_rgba(15,23,42,0.18)]">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Landlord management</p>
                      <h2 className="mt-3 text-3xl font-extrabold text-slate-950">A fresh view of landlord health</h2>
                      <p className="mt-3 text-sm leading-6 text-slate-500">Search, filter, and act on landlord accounts with a modern admin experience.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { label: 'Total', value: clients.length },
                        { label: 'Approved', value: approved },
                        { label: 'Pending', value: pending },
                        { label: 'Suspended', value: clients.filter(c => c.status === 'suspended').length },
                      ].map(item => (
                        <div key={item.label} className="rounded-3xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-2xl font-extrabold text-slate-950">{item.value}</p>
                          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {STATUS_TABS.map(tab => (
                        <button key={tab.key} type="button" onClick={() => setStatusFilter(tab.key)}
                          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${statusFilter === tab.key ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                          {tab.label}
                          <span className="ml-2 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-slate-900 text-[11px] text-white font-bold">{tab.count}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-100 px-3 py-2 shadow-sm">
                        <Search className="w-4 h-4 text-slate-500" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                          placeholder="Search by name, city, or phone"
                          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none" />
                      </div>
                      <select value={sort} onChange={e => setSort(e.target.value)}
                        className="rounded-3xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="name">Name A–Z</option>
                      </select>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-32">
                    <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-[32px] border border-slate-200 bg-white p-16 text-center shadow-sm">
                    <Users className="mx-auto mb-4 h-12 w-12 text-slate-200" />
                    <p className="text-lg font-semibold text-slate-700">No landlords match this filter</p>
                    <p className="mt-2 text-sm text-slate-500">Try changing the status or search terms.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filtered.map(l => {
                      const meta = STATUS_META[l.status] ?? STATUS_META.not_submitted
                      const grad = avatarGrad(l.full_name)
                      const initials = getInitials(l.full_name)
                      return (
                        <div key={l.id} className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex items-start gap-2.5">
                              <div className={`flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br ${grad}`}>
                                <span className="text-sm font-semibold text-white">{initials}</span>
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-base font-semibold text-slate-950 truncate">{l.full_name}</p>
                                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${meta.bg} ${meta.text}`}>
                                    <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />{meta.label}
                                  </span>
                                </div>
                                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                  <div className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                                    <MapPin className="w-4 h-4 text-slate-400" />{l.city ?? '—'}
                                  </div>
                                  <div className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                                    <Phone className="w-4 h-4 text-slate-400" />{l.whatsapp ?? '—'}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-3 sm:items-end">
                              <div className="rounded-3xl bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-900">{l.property_count} properties</div>
                              <div className="text-sm text-slate-400">Joined {new Date(l.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {l.status === 'pending' && (
                              <>
                                <Link href="/admin/kyc" className="inline-flex items-center rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100">Review KYC</Link>
                                <button type="button" onClick={() => updateStatus(l.id, 'approved')} disabled={processing === l.id}
                                  className="inline-flex items-center rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition disabled:opacity-50">Approve</button>
                                <button type="button" onClick={() => updateStatus(l.id, 'suspended')} disabled={processing === l.id}
                                  className="inline-flex items-center rounded-2xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition disabled:opacity-50 hover:bg-orange-100">Suspend</button>
                              </>
                            )}
                            {l.status === 'approved' && (
                              <button type="button" onClick={() => updateStatus(l.id, 'suspended')} disabled={processing === l.id}
                                className="inline-flex items-center rounded-2xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition disabled:opacity-50 hover:bg-orange-100">Suspend</button>
                            )}
                            {l.status === 'suspended' && (
                              <button type="button" onClick={() => updateStatus(l.id, 'approved')} disabled={processing === l.id}
                                className="inline-flex items-center rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition disabled:opacity-50 hover:bg-emerald-100">Reinstate</button>
                            )}
                            <button type="button" onClick={() => handleDelete(l.id)} disabled={processing === l.id}
                              className="inline-flex items-center rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition disabled:opacity-50 hover:bg-red-100">Delete</button>
                          </div>
                        </div>
                      )})}
                  </div>
                )}
              </div>

              <aside className="space-y-4">
                <div className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Top pending</p>
                  <div className="mt-3 space-y-2.5">
                    {filtered.filter(item => item.status === 'pending').slice(0, 3).map(item => (
                      <div key={item.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-3.5">
                        <p className="text-sm font-semibold text-slate-950 truncate">{item.full_name}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.city ?? 'No city'}</p>
                      </div>
                    ))}
                    {filtered.filter(item => item.status === 'pending').length === 0 && (
                      <p className="text-sm text-slate-500">No pending landlords in this view.</p>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
