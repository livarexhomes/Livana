import { useState, useEffect } from 'react'
import {
  Users, Search, MapPin, Phone,
  CheckCircle, Clock, XCircle, Ban, ShieldCheck,
  ArrowUpRight, UserCheck, ChevronDown,
  Trash2, ShieldOff, TrendingUp,
} from 'lucide-react'
import { Link } from '@/lib/navigation'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AdminHeader from '../../components/layout/AdminHeader'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient, isSupabaseConfigured } from '../../lib/supabase'

const STATUS_META: Record<string, {
  label: string; pill: string; dot: string
}> = {
  approved:      { label: 'Approved',      pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60', dot: 'bg-emerald-400' },
  pending:       { label: 'KYC Pending',   pill: 'bg-amber-50 text-amber-700 ring-amber-200/60',       dot: 'bg-amber-400'   },
  rejected:      { label: 'Rejected',      pill: 'bg-red-50 text-red-600 ring-red-200/60',             dot: 'bg-red-400'     },
  suspended:     { label: 'Suspended',     pill: 'bg-orange-50 text-orange-700 ring-orange-200/60',    dot: 'bg-orange-400'  },
  not_submitted: { label: 'Not Submitted', pill: 'bg-slate-100 text-slate-500 ring-slate-200/60',      dot: 'bg-slate-300'   },
}

const AVATAR_PALETTE = [
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'ring-violet-200' },
  { bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'ring-sky-200'    },
  { bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'ring-teal-200'   },
  { bg: 'bg-rose-100',   text: 'text-rose-700',   border: 'ring-rose-200'   },
  { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'ring-amber-200'  },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'ring-indigo-200' },
]
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

type DeleteConfirm = { userId: string; landlordId: string; name: string }

function ConfirmDeleteModal({ target, onConfirm, onCancel, loading }: {
  target: DeleteConfirm; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-gray-100">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <h3 className="text-base font-extrabold text-gray-900 mb-1">Delete landlord</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          This will permanently delete <strong>{target.name}</strong> and all their data. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
            {loading ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LandlordCard({
  l, processing, onStatus, onDelete,
}: {
  l: any; processing: string | null
  onStatus: (id: string, status: string) => void
  onDelete: (userId: string, landlordId: string) => void
}) {
  const meta    = STATUS_META[l.status] ?? STATUS_META.not_submitted
  const palette = avatarColor(l.full_name)
  const initials = getInitials(l.full_name)
  const busy    = processing === l.id

  return (
    <article className="group relative flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4
      shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all duration-200
      hover:border-slate-200 hover:shadow-[0_6px_24px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]">

      <div className="flex items-start gap-3">
        <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${palette.bg} ${palette.text} ${palette.border}`}>
          <span className="text-[13px] font-semibold">{initials}</span>
          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${meta.dot}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-semibold text-slate-900 leading-tight">{l.full_name}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${meta.pill}`}>
              {meta.label}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="h-3.5 w-3.5" />{l.city ?? '—'}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Phone className="h-3.5 w-3.5" />{l.whatsapp ?? '—'}
            </span>
          </div>
        </div>

        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-100">
            {l.property_count} {l.property_count === 1 ? 'property' : 'properties'}
          </span>
          <span className="text-[11px] text-slate-400">Joined {formatDate(l.created_at)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-50 pt-3">
        {l.status === 'pending' && (
          <>
            <Link href="/admin/kyc">
              <button type="button"
                className="h-8 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors">
                Review KYC
              </button>
            </Link>
            <button type="button" disabled={busy} onClick={() => onStatus(l.id, 'approved')}
              className="h-8 rounded-xl bg-emerald-500 px-3 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors disabled:opacity-40">
              Approve
            </button>
            <button type="button" disabled={busy} onClick={() => onStatus(l.id, 'suspended')}
              className="h-8 rounded-xl border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-40">
              Suspend
            </button>
          </>
        )}
        {l.status === 'approved' && (
          <button type="button" disabled={busy} onClick={() => onStatus(l.id, 'suspended')}
            className="h-8 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-40 flex items-center gap-1.5">
            <ShieldOff className="w-3 h-3" /> Suspend
          </button>
        )}
        {l.status === 'suspended' && (
          <button type="button" disabled={busy} onClick={() => onStatus(l.id, 'approved')}
            className="h-8 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40 flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" /> Reinstate
          </button>
        )}

        <div className="flex-1" />

        <button type="button" disabled={busy} onClick={() => onDelete(l.user_id, l.id)}
          className="h-8 rounded-xl border border-red-100 bg-red-50 px-3 text-xs font-semibold text-red-500 hover:bg-red-100 transition-colors disabled:opacity-40 flex items-center gap-1.5">
          <Trash2 className="w-3 h-3" /> Delete
        </button>

        {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />}
      </div>
    </article>
  )
}

export default function AdminLandlords() {
  const [user, setUser]           = useState<{ email?: string } | null>(null)
  const [clients, setClients]     = useState<any[]>([])
  const [filtered, setFiltered]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [sort, setSort]           = useState('newest')
  const [statusFilter, setStatusFilter] = useState('all')
  const [processing, setProcessing]     = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteConfirm | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast]               = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))
    supabase
      .from('landlords').select('*').order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (error) { setLoading(false); return }
        const landlordIds = (data ?? []).map(l => l.id)
        let propertyCounts: Record<string, number> = {}
        if (landlordIds.length > 0) {
          const { data: props } = await supabase.from('properties').select('landlord_id').in('landlord_id', landlordIds)
          propertyCounts = (props ?? []).reduce((acc: Record<string, number>, p: any) => {
            acc[p.landlord_id] = (acc[p.landlord_id] || 0) + 1; return acc
          }, {})
        }
        const list = (data ?? []).map((l: any) => ({ ...l, property_count: propertyCounts[l.id] || 0 }))
        setClients(list); setFiltered(list); setLoading(false)
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

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(null), 3500)
  }

  async function updateStatus(id: string, status: string) {
    setProcessing(id)
    const supabase = createClient()
    const patch: any = { status }
    if (status === 'approved') patch.is_verified = true
    await supabase.from('landlords').update(patch).eq('id', id)
    setClients(cs => cs.map(c => (c.id === id ? { ...c, ...patch } : c)))
    setProcessing(null)
  }

  function handleDelete(userId: string, landlordId: string) {
    const landlord = clients.find(c => c.id === landlordId)
    setDeleteTarget({ userId, landlordId, name: landlord?.full_name ?? 'this landlord' })
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    const supabase = createClient()

    const deleteProperties = await supabase.from('properties').delete().eq('landlord_id', deleteTarget.landlordId)
    if (deleteProperties.error) {
      showToast(`Failed to delete listings: ${deleteProperties.error.message}`)
      setDeleteLoading(false)
      return
    }

    const deleteSettings = await supabase.from('landlord_settings').delete().eq('landlord_id', deleteTarget.landlordId)
    if (deleteSettings.error) {
      showToast(`Failed to delete landlord settings: ${deleteSettings.error.message}`)
      setDeleteLoading(false)
      return
    }

    const deleteLandlord = await supabase.from('landlords').delete().eq('id', deleteTarget.landlordId)
    if (deleteLandlord.error) {
      showToast(`Failed to delete landlord: ${deleteLandlord.error.message}`)
    } else {
      setClients(cs => cs.filter(c => c.id !== deleteTarget.landlordId))
      showToast(`${deleteTarget.name} has been deleted.`)
    }

    setDeleteLoading(false)
    setDeleteTarget(null)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const pending   = clients.filter(c => c.status === 'pending').length
  const approved  = clients.filter(c => c.status === 'approved').length
  const suspended = clients.filter(c => c.status === 'suspended').length
  const notSub    = clients.filter(c => c.status === 'not_submitted').length
  const topPending = clients.filter(c => c.status === 'pending').slice(0, 4)

  const STATUS_TABS = [
    { key: 'all',           label: 'All',           count: clients.length },
    { key: 'approved',      label: 'Approved',      count: approved },
    { key: 'pending',       label: 'KYC Pending',   count: pending },
    { key: 'suspended',     label: 'Suspended',     count: suspended },
    { key: 'not_submitted', label: 'Not Submitted', count: notSub },
  ]

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F7F8FC]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title="Landlords"
            subtitle={`${clients.length.toLocaleString()} total${pending > 0 ? ` · ${pending} awaiting KYC` : ''}`}
            pendingCount={pending}
            action={
              <Link href="/admin/kyc">
                <button type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 active:scale-95 transition-all">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">KYC Review</span>
                  {pending > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-amber-900">
                      {pending}
                    </span>
                  )}
                </button>
              </Link>
            }
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-8">
            <div className="mx-auto max-w-7xl">

              {/* Stat cards */}
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Total',         value: clients.length, icon: Users,       color: 'text-slate-900',   bg: 'bg-slate-100' },
                  { label: 'Approved',      value: approved,       icon: UserCheck,   color: 'text-emerald-700', bg: 'bg-emerald-100', sub: 'verified' },
                  { label: 'KYC Pending',   value: pending,        icon: Clock,       color: 'text-amber-700',   bg: 'bg-amber-100',   sub: 'awaiting review' },
                  { label: 'Suspended',     value: suspended,      icon: TrendingUp,  color: 'text-orange-600',  bg: 'bg-orange-100' },
                ].map(s => {
                  const Icon = s.icon
                  return (
                    <div key={s.label} className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 flex flex-col gap-3 transition hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>
                        <Icon className={`w-4 h-4 ${s.color}`} />
                      </div>
                      <div>
                        <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">{s.label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_288px]">

                {/* Left column */}
                <div className="space-y-3">

                  {/* Filter / search bar */}
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,0.05)] sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_TABS.map(tab => (
                        <button key={tab.key} type="button" onClick={() => setStatusFilter(tab.key)}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                            statusFilter === tab.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                          }`}>
                          {tab.label}
                          <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                            statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>{tab.count}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-within:border-slate-400 focus-within:bg-white transition-all">
                        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                          placeholder="Search name, city, phone…"
                          className="w-44 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none" />
                      </label>
                      <div className="relative">
                        <select value={sort} onChange={e => setSort(e.target.value)}
                          className="h-9 appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer">
                          <option value="newest">Newest</option>
                          <option value="oldest">Oldest</option>
                          <option value="name">Name A–Z</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* Results */}
                  {loading ? (
                    <div className="flex h-64 items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
                    </div>
                  ) : clients.length === 0 ? (
                    <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                      <Users className="mb-3 h-10 w-10 text-slate-200" />
                      <p className="text-sm font-semibold text-slate-500">No landlords registered yet</p>
                      <p className="mt-1 text-xs text-slate-400">Landlords will appear here when they register.</p>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                      <Users className="mb-3 h-10 w-10 text-slate-200" />
                      <p className="text-sm font-semibold text-slate-500">No landlords match this filter</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filtered.map(l => (
                        <LandlordCard key={l.id} l={l} processing={processing} onStatus={updateStatus} onDelete={handleDelete} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Right sidebar */}
                <aside className="space-y-4">

                  {/* Pending queue */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Pending Queue</p>
                      {pending > 0 && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                          {pending}
                        </span>
                      )}
                    </div>
                    {topPending.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-center">
                        <UserCheck className="mb-2 h-8 w-8 text-emerald-200" />
                        <p className="text-xs text-slate-400">All clear — no pending KYC</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {topPending.map(item => {
                          const pal = avatarColor(item.full_name)
                          return (
                            <div key={item.id} className="flex items-center gap-2.5 rounded-xl border border-slate-50 bg-slate-50/80 p-2.5 hover:bg-slate-100/70 transition-colors">
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold ring-1 ${pal.bg} ${pal.text} ${pal.border}`}>
                                {getInitials(item.full_name)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-slate-800">{item.full_name}</p>
                                <p className="truncate text-[11px] text-slate-400">{item.city ?? 'No city'}</p>
                              </div>
                              <Link href="/admin/kyc" className="ml-auto shrink-0">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200 hover:text-slate-700 transition-colors">
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </span>
                              </Link>
                            </div>
                          )
                        })}
                        {pending > 4 && (
                          <Link href="/admin/kyc">
                            <button type="button" className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors">
                              View all {pending} pending →
                            </button>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Overview breakdown */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Overview</p>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Approved',      value: approved,  color: 'bg-emerald-400' },
                        { label: 'KYC Pending',   value: pending,   color: 'bg-amber-400'   },
                        { label: 'Suspended',     value: suspended, color: 'bg-orange-400'  },
                        { label: 'Not submitted', value: notSub,    color: 'bg-slate-300'   },
                      ].map(row => (
                        <div key={row.label} className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${row.color}`} />
                          <span className="flex-1 text-xs text-slate-600">{row.label}</span>
                          <span className="text-xs font-semibold text-slate-800">{row.value}</span>
                          <div className="h-1 w-16 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full ${row.color} transition-all duration-500`}
                              style={{ width: clients.length ? `${(row.value / clients.length) * 100}%` : '0%' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </aside>
              </div>
            </div>
          </main>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDeleteModal
          target={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl whitespace-nowrap">
          {toast}
        </div>
      )}
    </AuthGuard>
  )
}
