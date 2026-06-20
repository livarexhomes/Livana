import { useState, useEffect } from 'react'
import {
  Users, Search, MapPin, Phone,
  CheckCircle, Clock, XCircle, Ban, ShieldCheck,
  TrendingUp, ArrowUpRight, MoreHorizontal, Filter,
  UserCheck, UserX, ChevronDown,
} from 'lucide-react'
import { Link } from '@/lib/navigation'
import AdminSidebar from '../../components/AdminSidebar'
import AdminHeader from '../../components/AdminHeader'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const STATUS_META: Record<string, {
  label: string
  icon: any
  pill: string
  dot: string
  ring: string
}> = {
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    dot: 'bg-emerald-400',
    ring: 'ring-emerald-100',
  },
  pending: {
    label: 'KYC Pending',
    icon: Clock,
    pill: 'bg-amber-50 text-amber-700 ring-amber-200/60',
    dot: 'bg-amber-400',
    ring: 'ring-amber-100',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    pill: 'bg-red-50 text-red-600 ring-red-200/60',
    dot: 'bg-red-400',
    ring: 'ring-red-100',
  },
  suspended: {
    label: 'Suspended',
    icon: Ban,
    pill: 'bg-orange-50 text-orange-700 ring-orange-200/60',
    dot: 'bg-orange-400',
    ring: 'ring-orange-100',
  },
  not_submitted: {
    label: 'Not Submitted',
    icon: Clock,
    pill: 'bg-slate-100 text-slate-500 ring-slate-200/60',
    dot: 'bg-slate-300',
    ring: 'ring-slate-100',
  },
}

// Carefully curated palette — soft but distinct
const AVATAR_PALETTE = [
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'ring-violet-200' },
  { bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'ring-sky-200'    },
  { bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'ring-teal-200'   },
  { bg: 'bg-rose-100',   text: 'text-rose-700',   border: 'ring-rose-200'   },
  { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'ring-amber-200'  },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'ring-indigo-200' },
  { bg: 'bg-cyan-100',   text: 'text-cyan-700',   border: 'ring-cyan-200'   },
  { bg: 'bg-lime-100',   text: 'text-lime-700',   border: 'ring-lime-200'   },
]

function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─── Mini Stat Card ───────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, accent,
}: {
  label: string; value: number; sub?: string; accent: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">{label}</p>
      <p className={`text-3xl font-bold tracking-tight ${accent}`}>{value.toLocaleString()}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
      <div className={`absolute -bottom-2 -right-2 h-14 w-14 rounded-full opacity-[0.07] ${accent.replace('text-', 'bg-')}`} />
    </div>
  )
}

// ─── Landlord Row Card ────────────────────────────────────────────────────────
function LandlordCard({
  l, processing, onStatus, onDelete,
}: {
  l: any
  processing: string | null
  onStatus: (id: string, status: string) => void
  onDelete: (userId: string, landlordId: string) => void
}) {
  const meta    = STATUS_META[l.status] ?? STATUS_META.not_submitted
  const palette = avatarColor(l.full_name)
  const initials = getInitials(l.full_name)
  const busy    = processing === l.id

  return (
    <article
      className="group relative flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-all duration-200
        hover:border-slate-200 hover:shadow-[0_6px_24px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]"
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${palette.bg} ${palette.text} ${palette.border}`}
        >
          <span className="text-[13px] font-semibold">{initials}</span>
          {/* status dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${meta.dot}`}
          />
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-semibold text-slate-900 leading-tight">
              {l.full_name}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${meta.pill}`}
            >
              {meta.label}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              {l.city ?? '—'}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Phone className="h-3.5 w-3.5" />
              {l.whatsapp ?? '—'}
            </span>
          </div>
        </div>

        {/* Right side meta */}
        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-100">
            {l.property_count} {l.property_count === 1 ? 'property' : 'properties'}
          </span>
          <span className="text-[11px] text-slate-400">Joined {formatDate(l.created_at)}</span>
        </div>
      </div>

      {/* Action strip — appears on hover / when relevant */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-50 pt-3">
        {l.status === 'pending' && (
          <>
            <Link href="/admin/kyc">
              <button
                type="button"
                className="h-8 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                Review KYC
              </button>
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus(l.id, 'approved')}
              className="h-8 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-40"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus(l.id, 'suspended')}
              className="h-8 rounded-lg border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-40"
            >
              Suspend
            </button>
          </>
        )}
        {l.status === 'approved' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus(l.id, 'suspended')}
            className="h-8 rounded-lg border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-40"
          >
            Suspend
          </button>
        )}
        {l.status === 'suspended' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus(l.id, 'approved')}
            className="h-8 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
          >
            Reinstate
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(l.user_id, l.id)}
          className="h-8 rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-semibold text-red-500 transition hover:bg-red-100 disabled:opacity-40"
        >
          Delete
        </button>

        {busy && (
          <span className="ml-1 h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
        )}
      </div>
    </article>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminLandlords() {
  const [user, setUser]           = useState<{ email?: string } | null>(null)
  const [clients, setClients]     = useState<any[]>([])
  const [filtered, setFiltered]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [sort, setSort]           = useState('newest')
  const [statusFilter, setStatusFilter] = useState('all')
  const [processing, setProcessing]     = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) =>
      setUser({ email: user?.email }),
    )
    // Fetch landlords - admins should have full access via RLS policy
    supabase
      .from('landlords')
      .select('*')
      .order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        console.log('Landlords fetch result:', { data, error })
        if (error) {
          console.error('Error fetching landlords:', error)
          setLoading(false)
          return
        }
        
        // Get property counts separately to avoid RLS issues with joined queries
        const landlordIds = (data ?? []).map(l => l.id)
        let propertyCounts: Record<string, number> = {}
        
        if (landlordIds.length > 0) {
          const { data: properties } = await supabase
            .from('properties')
            .select('landlord_id')
            .in('landlord_id', landlordIds)
          
          propertyCounts = (properties ?? []).reduce((acc: Record<string, number>, p: any) => {
            acc[p.landlord_id] = (acc[p.landlord_id] || 0) + 1
            return acc
          }, {})
        }
        
        const list = (data ?? []).map((l: any) => ({
          ...l,
          property_count: propertyCounts[l.id] || 0,
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
      list = list.filter(
        l =>
          l.full_name?.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q) ||
          l.whatsapp?.includes(q),
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
    setClients(cs => cs.map(c => (c.id === id ? { ...c, ...patch } : c)))
    setProcessing(null)
  }

  async function handleDelete(userId: string, landlordId: string) {
    if (!confirm('Permanently delete this landlord? This cannot be undone.')) return
    setProcessing(landlordId)
    const supabase = createClient()
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch('/api/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ user_id: userId }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('Delete error:', body.error)
      alert('Failed to delete: ' + (body.error ?? res.statusText))
      setProcessing(null)
      return
    }
    setClients(cs => cs.filter(c => c.id !== landlordId))
    setProcessing(null)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const pending   = clients.filter(c => c.status === 'pending').length
  const approved  = clients.filter(c => c.status === 'approved').length
  const suspended = clients.filter(c => c.status === 'suspended').length
  const notSub    = clients.filter(c => c.status === 'not_submitted').length

  const STATUS_TABS = [
    { key: 'all',           label: 'All',           count: clients.length },
    { key: 'approved',      label: 'Approved',      count: approved },
    { key: 'pending',       label: 'KYC Pending',   count: pending },
    { key: 'suspended',     label: 'Suspended',     count: suspended },
    { key: 'not_submitted', label: 'Not Submitted', count: notSub },
  ]

  // Top pending for sidebar
  const topPending = clients.filter(c => c.status === 'pending').slice(0, 4)

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
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 active:scale-95"
                >
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

          {/* ── Main scroll area ── */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-8">
            <div className="mx-auto max-w-7xl">

              {/* ── Stat row ── */}
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Total" value={clients.length} accent="text-slate-900" />
                <StatCard label="Approved" value={approved} sub="verified landlords" accent="text-emerald-600" />
                <StatCard label="Pending" value={pending} sub="awaiting review" accent="text-amber-600" />
                <StatCard label="Suspended" value={suspended} accent="text-orange-600" />
              </div>

              {/* ── Body grid ── */}
              <div className="grid gap-5 xl:grid-cols-[1fr_288px]">

                {/* ── Left column ── */}
                <div className="space-y-3">

                  {/* Filter / search bar */}
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,0.05)] sm:flex-row sm:items-center sm:justify-between">
                    {/* Status tabs */}
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_TABS.map(tab => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setStatusFilter(tab.key)}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                            statusFilter === tab.key
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                        >
                          {tab.label}
                          <span
                            className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold transition-colors ${
                              statusFilter === tab.key
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Search + sort */}
                    <div className="flex shrink-0 items-center gap-2">
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-within:border-slate-400 focus-within:bg-white transition-all">
                        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <input
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Search name, city, phone…"
                          className="w-44 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                      </label>

                      <div className="relative">
                        <select
                          value={sort}
                          onChange={e => setSort(e.target.value)}
                          className="h-9 appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                        >
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
                      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-500" />
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
                      <p className="mt-1 text-xs text-slate-400">Try adjusting the status or search terms.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filtered.map(l => (
                        <LandlordCard
                          key={l.id}
                          l={l}
                          processing={processing}
                          onStatus={updateStatus}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Right sidebar ── */}
                <aside className="space-y-4">

                  {/* Pending queue */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                        Pending Queue
                      </p>
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
                            <div
                              key={item.id}
                              className="flex items-center gap-2.5 rounded-xl border border-slate-50 bg-slate-50/80 p-2.5 transition hover:bg-slate-100/70"
                            >
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold ring-1 ${pal.bg} ${pal.text} ${pal.border}`}
                              >
                                {getInitials(item.full_name)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-slate-800">{item.full_name}</p>
                                <p className="truncate text-[11px] text-slate-400">{item.city ?? 'No city'}</p>
                              </div>
                              <Link href="/admin/kyc" className="ml-auto shrink-0">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200 transition hover:text-slate-700">
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </span>
                              </Link>
                            </div>
                          )
                        })}
                        {pending > 4 && (
                          <Link href="/admin/kyc">
                            <button
                              type="button"
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                            >
                              View all {pending} pending →
                            </button>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick summary */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Overview
                    </p>
                    <div className="space-y-2">
                      {[
                        { label: 'Approved', value: approved,  color: 'bg-emerald-400' },
                        { label: 'Pending',  value: pending,   color: 'bg-amber-400'   },
                        { label: 'Suspended',value: suspended, color: 'bg-orange-400'  },
                        { label: 'Not submitted', value: notSub, color: 'bg-slate-300' },
                      ].map(row => (
                        <div key={row.label} className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${row.color}`} />
                          <span className="flex-1 text-xs text-slate-600">{row.label}</span>
                          <span className="text-xs font-semibold text-slate-800">{row.value}</span>
                          {/* mini progress */}
                          <div className="h-1 w-16 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${row.color} transition-all duration-500`}
                              style={{ width: clients.length ? `${(row.value / clients.length) * 100}%` : '0%' }}
                            />
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
    </AuthGuard>
  )
}