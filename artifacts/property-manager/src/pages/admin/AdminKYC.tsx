import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShieldCheck, Search, CheckCircle, Clock, XCircle, Ban,
  X, FileText, Phone, Calendar, CreditCard, Hash,
  Loader2, AlertTriangle, Eye, Users,
} from 'lucide-react'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AdminHeader from '../../components/layout/AdminHeader'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient, getKycDocUrl } from '../../lib/supabase'

// ── Constants ─────────────────────────────────────────────────────────────────

const DOC_LABELS: Record<string, string> = {
  id_front:     'ID Card — Front',
  id_back:      'ID Card — Back',
  utility_bill: 'Utility Bill',
  selfie:       'Selfie with ID',
}

const STATUS_META: Record<string, {
  label: string; bg: string; text: string; border: string; dot: string
}> = {
  approved:      { label: 'Approved',      bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  pending:       { label: 'Pending KYC',   bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  rejected:      { label: 'Rejected',      bg: 'bg-red-50',      text: 'text-red-600',     border: 'border-red-200',     dot: 'bg-red-500'     },
  suspended:     { label: 'Suspended',     bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500'  },
  not_submitted: { label: 'Not Submitted', bg: 'bg-slate-50',    text: 'text-slate-500',   border: 'border-slate-200',   dot: 'bg-slate-400'   },
}

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600', 'from-blue-500 to-blue-700',
  'from-emerald-400 to-teal-600',  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',  'from-indigo-400 to-indigo-600',
]

function avatarGrad(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysAgo(d: string | null) {
  if (!d) return null
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return '1 day ago'
  return `${diff} days ago`
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminKYC() {
  const [user, setUser]                   = useState<{ email?: string } | null>(null)
  const [landlords, setLandlords]         = useState<any[]>([])
  const [filtered, setFiltered]           = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [refreshing, setRefreshing]       = useState(false)
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState('pending')
  const [selected, setSelected]           = useState<any | null>(null)
  const [processing, setProcessing]       = useState<string | null>(null)
  const [kycDocs, setKycDocs]             = useState<{ doc_type: string; url: string; file_name: string }[]>([])
  const [imgErrors, setImgErrors]         = useState<Record<string, boolean>>({})
  const [docsLoading, setDocsLoading]     = useState(false)
  const debounceRef                       = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const loadData = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('landlords').select('*').order('created_at', { ascending: false })
    const rows = data ?? []
    setLandlords(rows)
    // Update selected landlord in-place if its record changed externally
    setSelected((prev: any) => {
      if (!prev) return prev
      const updated = rows.find((l: any) => l.id === prev.id)
      return updated ?? prev
    })
    if (initial) setLoading(false)
    else setRefreshing(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser({ email: user?.email })
      if (user?.id) window.__livarexUserId = user.id
      loadData(true)
    })
  }, [loadData])

  // Realtime subscription on landlords table
  useEffect(() => {
    const supabase = createClient()
    const debouncedLoad = () => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => loadData(false), 1500)
    }
    const channel = supabase.channel('kyc-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'landlords' }, debouncedLoad)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'landlords' }, debouncedLoad)
      .subscribe()
    return () => { clearTimeout(debounceRef.current); supabase.removeChannel(channel) }
  }, [loadData])

  useEffect(() => {
    let list = [...landlords]
    if (statusFilter !== 'all') list = list.filter(l => l.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(l => l.full_name?.toLowerCase().includes(q) || l.whatsapp?.includes(q))
    }
    setFiltered(list)
  }, [search, statusFilter, landlords])

  async function loadKycDocs(landlordId: string) {
    setDocsLoading(true)
    setKycDocs([])
    setImgErrors({})
    const supabase = createClient()
    const { data } = await supabase
      .from('kyc_documents').select('doc_type, storage_path, file_name')
      .eq('landlord_id', landlordId).order('created_at', { ascending: true })
    if (data && data.length > 0) {
      const withUrls = await Promise.all(
        data.map(async (d: any) => ({
          doc_type:  d.doc_type,
          file_name: d.file_name ?? d.doc_type,
          url:       (await getKycDocUrl(d.storage_path)) ?? '',
        }))
      )
      setKycDocs(withUrls)
    }
    setDocsLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    setProcessing(id)
    const supabase = createClient()
    const patch: any = { status }
    if (status === 'approved') patch.is_verified = true
    if (status !== 'approved') patch.is_verified = false
    await supabase.from('landlords').update(patch).eq('id', id)
    setLandlords(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l))
    if (selected?.id === id) setSelected((s: any) => s ? { ...s, ...patch } : s)
    setProcessing(null)
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const counts = {
    pending:       landlords.filter(l => l.status === 'pending').length,
    approved:      landlords.filter(l => l.status === 'approved').length,
    rejected:      landlords.filter(l => l.status === 'rejected').length,
    suspended:     landlords.filter(l => l.status === 'suspended').length,
    not_submitted: landlords.filter(l => l.status === 'not_submitted').length,
    all:           landlords.length,
  }

  const FILTER_TABS = [
    { key: 'pending',       label: 'Pending',       count: counts.pending       },
    { key: 'approved',      label: 'Approved',      count: counts.approved      },
    { key: 'rejected',      label: 'Rejected',      count: counts.rejected      },
    { key: 'suspended',     label: 'Suspended',     count: counts.suspended     },
    { key: 'not_submitted', label: 'Not Submitted', count: counts.not_submitted },
    { key: 'all',           label: 'All',           count: counts.all           },
  ]

  function clearSelection() { setSelected(null); setKycDocs([]); setImgErrors({}) }

  function selectLandlord(l: any) {
    if (selected?.id === l.id) { clearSelection(); return }
    setSelected(l)
    loadKycDocs(l.id)
  }

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminHeader
            title="KYC Review"
            subtitle={`${counts.pending} pending · ${landlords.length} landlords total`}
            pendingCount={counts.pending}
          />

          {/* ── Hero header ────────────────────────────────────────────────── */}
          <div className="shrink-0 px-4 md:px-6 py-4">
            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_80px_-40px_rgba(15,23,42,0.18)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Identity verification</p>
                  <h2 className="mt-2 text-xl md:text-2xl font-extrabold text-slate-950">KYC Review</h2>
                  <p className="mt-1 text-sm text-slate-500">Verify landlord identities before they go live on the platform.</p>
                </div>

                {/* Stats row + live indicator */}
                <div className="flex flex-col items-stretch md:items-end gap-2 shrink-0">
                  {/* Live indicator */}
                  <div className="flex items-center self-end">
                    {refreshing ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 12a9 9 0 11-6.219-8.56"/>
                        </svg>
                        Updating…
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </span>
                        Live
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:flex-wrap justify-end">
                    {[
                      { label: 'Pending',  value: counts.pending,  accent: 'text-amber-700 bg-amber-500/10'      },
                      { label: 'Approved', value: counts.approved, accent: 'text-emerald-700 bg-emerald-500/10'  },
                      { label: 'Rejected', value: counts.rejected, accent: 'text-red-700 bg-red-500/10'          },
                      { label: 'Total',    value: counts.all,      accent: 'text-blue-700 bg-blue-500/10'        },
                    ].map(s => (
                      <div key={s.label} className="rounded-3xl border border-slate-100 bg-slate-50 px-3 md:px-4 py-2.5 md:py-3 text-center sm:min-w-[70px]">
                        <p className={`text-xl md:text-2xl font-extrabold ${s.accent}`}>{s.value}</p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter pills — exactly matching AdminProperties style */}
              <div className="mt-4 flex items-center gap-2 overflow-x-auto -mx-1 px-1 sm:flex-wrap sm:overflow-visible sm:mx-0 sm:px-0">
            </div>
          </div>

          {/* ── Body: queue + review panel ─────────────────────────────────── */}
          <div className="flex flex-1 min-h-0 overflow-hidden px-4 md:px-6 pb-4 md:pb-6 gap-4">

            {/* ── LEFT: Queue ─────────────────────────────────────────────── */}
            <div className={`${selected ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:max-w-xs xl:max-w-sm shrink-0 rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden`}>

              {/* Search */}
              <div className="shrink-0 p-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5 rounded-3xl border border-slate-200 bg-slate-100 px-4 py-2.5">
                  <Search className="w-4 h-4 text-slate-500 shrink-0" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search name or phone…"
                    className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-2.5 text-[11px] text-slate-400 font-medium pl-0.5">
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                  {search || statusFilter !== 'all' ? ' matching filters' : ''}
                </p>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
                      <Users className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">No results</p>
                    <p className="text-xs text-slate-400 mt-1">Try a different filter or search term.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {filtered.map(l => {
                      const meta       = STATUS_META[l.status] ?? STATUS_META.pending
                      const isSelected = selected?.id === l.id
                      const isPending  = l.status === 'pending'
                      const ago        = isPending ? daysAgo(l.kyc_submitted_at) : null

                      return (
                        <button key={l.id} type="button" onClick={() => selectLandlord(l)}
                          className={`w-full text-left px-4 py-4 transition-all group ${
                            isSelected
                              ? 'bg-blue-50 border-l-[3px] border-l-blue-600'
                              : 'hover:bg-slate-50/80 border-l-[3px] border-l-transparent'
                          }`}>
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad(l.full_name)} flex items-center justify-center shrink-0 text-[11px] font-bold text-white shadow-sm`}>
                              {getInitials(l.full_name)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                  {l.full_name}
                                </p>
                                {/* Waiting timer for pending */}
                                {ago && (
                                  <span className="shrink-0 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 whitespace-nowrap">
                                    {ago}
                                  </span>
                                )}
                              </div>

                              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                  {meta.label}
                                </span>
                                {l.whatsapp && (
                                  <span className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                                    <Phone className="w-2.5 h-2.5 shrink-0" />{l.whatsapp}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Review panel ─────────────────────────────────────── */}
            <div className={`${selected ? 'flex' : 'hidden lg:flex'} flex-1 min-w-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm`}>
              {selected ? (
                <ReviewPanel
                  landlord={selected}
                  kycDocs={kycDocs}
                  docsLoading={docsLoading}
                  processing={processing}
                  imgErrors={imgErrors}
                  onImgError={key => setImgErrors(prev => ({ ...prev, [key]: true }))}
                  onClose={clearSelection}
                  onUpdateStatus={updateStatus}
                />
              ) : (
                <EmptyReview pendingCount={counts.pending} />
              )}
            </div>

          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

// ── Review Panel ───────────────────────────────────────────────────────────────

function ReviewPanel({
  landlord, kycDocs, docsLoading, processing, imgErrors,
  onImgError, onClose, onUpdateStatus,
}: {
  landlord: any
  kycDocs: { doc_type: string; url: string; file_name: string }[]
  docsLoading: boolean
  processing: string | null
  imgErrors: Record<string, boolean>
  onImgError: (key: string) => void
  onClose: () => void
  onUpdateStatus: (id: string, status: string) => Promise<void>
}) {
  const meta = STATUS_META[landlord.status] ?? STATUS_META.pending
  const busy = processing === landlord.id

  const identityFields = [
    { icon: Calendar,   label: 'Joined',    value: fmtDate(landlord.created_at)        },
    { icon: Calendar,   label: 'Submitted', value: fmtDate(landlord.kyc_submitted_at)  },
    { icon: Hash,       label: 'NIN',       value: landlord.nin                         },
    { icon: CreditCard, label: 'ID Type',   value: landlord.id_type                     },
    { icon: Hash,       label: 'ID Number', value: landlord.id_number                   },
    { icon: Phone,      label: 'WhatsApp',  value: landlord.whatsapp                    },
  ]

  const ACTIONS = [
    {
      key: 'approve', show: landlord.status !== 'approved',
      label: 'Approve', icon: CheckCircle,
      cls: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20',
      status: 'approved',
    },
    {
      key: 'reject', show: landlord.status !== 'rejected',
      label: 'Reject', icon: XCircle,
      cls: 'border border-red-200 bg-red-50 hover:bg-red-100 text-red-700',
      status: 'rejected',
    },
    {
      key: 'suspend', show: landlord.status !== 'suspended',
      label: 'Suspend', icon: Ban,
      cls: 'border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700',
      status: 'suspended',
    },
    {
      key: 'reset', show: landlord.status !== 'pending' && landlord.status !== 'not_submitted',
      label: 'Reset to Pending', icon: Clock,
      cls: 'border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700',
      status: 'pending',
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Panel header ── */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarGrad(landlord.full_name)} flex items-center justify-center shrink-0 text-[13px] font-bold text-white shadow-sm`}>
            {getInitials(landlord.full_name)}
          </div>
          <div className="min-w-0">
            <p className="text-base font-extrabold text-slate-950 truncate">{landlord.full_name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
              {landlord.whatsapp && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" />{landlord.whatsapp}
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* ── Action buttons ── */}
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 mb-4">Review Actions</p>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.filter(a => a.show).map(a => {
              const Icon = a.icon
              return (
                <button key={a.key} onClick={() => onUpdateStatus(landlord.id, a.status)} disabled={busy}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50 ${a.cls}`}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                  {a.label}
                </button>
              )
            })}
          </div>

          {landlord.status === 'approved' && (
            <div className="mt-4 flex items-center gap-2.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
              <CheckCircle className="w-4 h-4 shrink-0" />
              This landlord is verified and active on the platform.
            </div>
          )}
          {landlord.status === 'rejected' && (
            <div className="mt-4 flex items-center gap-2.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Account rejected. Use Reset KYC on the Landlords page to allow resubmission.
            </div>
          )}
          {landlord.status === 'suspended' && (
            <div className="mt-4 flex items-center gap-2.5 text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
              <Ban className="w-4 h-4 shrink-0" />
              This account is currently suspended from the platform.
            </div>
          )}
        </div>

        {/* ── Identity details ── */}
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 mb-4">Identity Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {identityFields.map(f => (
              <div key={f.label} className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <f.icon className="w-3 h-3 text-slate-400" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">{f.label}</p>
                </div>
                <p className="text-sm font-semibold text-slate-900 truncate">{f.value || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── KYC Documents ── */}
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">KYC Documents</p>
            <span className="text-[11px] font-semibold text-slate-500">
              {docsLoading ? 'Loading…' : `${kycDocs.length} file${kycDocs.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {docsLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Loading documents…</span>
            </div>
          ) : kycDocs.length === 0 ? (
            <div className="rounded-3xl bg-slate-50 border border-slate-100 p-8 text-center">
              <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">No documents uploaded</p>
              <p className="text-xs text-slate-400 mt-1">This landlord hasn't submitted KYC files yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {kycDocs.map(doc => {
                const isImage = /\.(jpe?g|png|webp)$/i.test(doc.file_name)
                const showImg = isImage && !imgErrors[doc.doc_type]
                return (
                  <a key={doc.doc_type} href={doc.url} target="_blank" rel="noreferrer"
                    className="group flex flex-col rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all">
                    {/* Thumbnail */}
                    <div className="relative h-36 bg-slate-100 flex items-center justify-center overflow-hidden">
                      {showImg ? (
                        <img src={doc.url} alt={doc.file_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={() => onImgError(doc.doc_type)} />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-300">
                          <FileText className="w-9 h-9" />
                          <span className="text-[11px] font-semibold text-slate-400">PDF / Document</span>
                        </div>
                      )}
                      {/* Open overlay */}
                      <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="inline-flex items-center gap-1.5 text-white text-xs font-bold bg-blue-600 rounded-full px-4 py-2 shadow-lg">
                          <Eye className="w-3.5 h-3.5" /> Open
                        </span>
                      </div>
                    </div>
                    {/* Label */}
                    <div className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {DOC_LABELS[doc.doc_type] ?? doc.doc_type}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{doc.file_name}</p>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Empty review placeholder ───────────────────────────────────────────────────

function EmptyReview({ pendingCount }: { pendingCount: number }) {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-10 text-center">
      <div className="w-20 h-20 rounded-[28px] bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center mb-5">
        <ShieldCheck className="w-10 h-10 text-slate-300" />
      </div>
      <h3 className="text-lg font-extrabold text-slate-800">Select a landlord to review</h3>
      <p className="text-sm text-slate-400 mt-2 max-w-xs leading-relaxed">
        {pendingCount > 0
          ? `${pendingCount} submission${pendingCount !== 1 ? 's are' : ' is'} waiting for your review. Click any name in the queue to get started.`
          : 'All submissions are up to date. Great work!'}
      </p>
      {pendingCount > 0 && (
        <div className="mt-5 inline-flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-4 py-2 font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          {pendingCount} pending review
        </div>
      )}
    </div>
  )
}
