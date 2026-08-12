import { useState, useEffect } from 'react'
import {
  ShieldCheck, Search, CheckCircle, Clock, XCircle, Ban,
  X, FileText, Phone, Calendar, CreditCard, Hash,
  ChevronRight, Loader2, AlertTriangle, Eye,
} from 'lucide-react'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AdminHeader from '../../components/layout/AdminHeader'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient, getKycDocUrl } from '../../lib/supabase'

// ── Constants ────────────────────────────────────────────────────────────────

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
  const [user, setUser]               = useState<{ email?: string } | null>(null)
  const [landlords, setLandlords]     = useState<any[]>([])
  const [filtered, setFiltered]       = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [selected, setSelected]       = useState<any | null>(null)
  const [processing, setProcessing]   = useState<string | null>(null)
  const [kycDocs, setKycDocs]         = useState<{ doc_type: string; url: string; file_name: string }[]>([])
  const [imgErrors, setImgErrors]     = useState<Record<string, boolean>>({})
  const [docsLoading, setDocsLoading] = useState(false)

  // ── Load landlords ──────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser({ email: user?.email })
      if (user?.id) window.__livarexUserId = user.id
    })
    supabase
      .from('landlords').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = data ?? []
        setLandlords(rows)
        setFiltered(rows.filter(l => l.status === 'pending'))
        setLoading(false)
      })
  }, [])

  // ── Filter / search ─────────────────────────────────────────────────────────
  useEffect(() => {
    let list = [...landlords]
    if (statusFilter !== 'all') list = list.filter(l => l.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(l =>
        l.full_name?.toLowerCase().includes(q) || l.whatsapp?.includes(q)
      )
    }
    setFiltered(list)
  }, [search, statusFilter, landlords])

  // ── Load KYC documents ──────────────────────────────────────────────────────
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

  // ── Status update ───────────────────────────────────────────────────────────
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

  // ── Derived ─────────────────────────────────────────────────────────────────
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
    { key: 'pending',       label: 'Pending',       count: counts.pending },
    { key: 'approved',      label: 'Approved',      count: counts.approved },
    { key: 'rejected',      label: 'Rejected',      count: counts.rejected },
    { key: 'suspended',     label: 'Suspended',     count: counts.suspended },
    { key: 'not_submitted', label: 'Not Submitted', count: counts.not_submitted },
    { key: 'all',           label: 'All',           count: counts.all },
  ]

  // ── Review panel helpers ────────────────────────────────────────────────────
  function clearSelection() {
    setSelected(null)
    setKycDocs([])
    setImgErrors({})
  }

  function selectLandlord(l: any) {
    if (selected?.id === l.id) { clearSelection(); return }
    setSelected(l)
    loadKycDocs(l.id)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminHeader
            title="KYC Review"
            subtitle={`${counts.pending} pending${counts.pending !== 1 ? '' : ''} · ${landlords.length} landlords total`}
            pendingCount={counts.pending}
          />

          {/* ── Stat strip ── */}
          <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3">
            <div className="flex items-center gap-3 overflow-x-auto">
              {[
                { label: 'Pending',       value: counts.pending,       color: 'text-amber-700',   dot: 'bg-amber-400'  },
                { label: 'Approved',      value: counts.approved,      color: 'text-emerald-700', dot: 'bg-emerald-500'},
                { label: 'Rejected',      value: counts.rejected,      color: 'text-red-600',     dot: 'bg-red-500'    },
                { label: 'Suspended',     value: counts.suspended,     color: 'text-orange-700',  dot: 'bg-orange-500' },
                { label: 'Not Submitted', value: counts.not_submitted, color: 'text-slate-500',   dot: 'bg-slate-400'  },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 shrink-0">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className="text-xs text-slate-500">{s.label}</span>
                  <span className={`text-sm font-extrabold tabular-nums ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Body: queue + review panel ── */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* ── LEFT: Queue ── */}
            <div className="flex flex-col w-full max-w-xs xl:max-w-sm shrink-0 border-r border-slate-200 bg-white">

              {/* Search + filter */}
              <div className="shrink-0 p-3 border-b border-slate-100 space-y-2">
                {/* Search */}
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search name or WhatsApp…"
                    className="flex-1 bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {/* Filter tabs */}
                <div className="flex flex-wrap gap-1">
                  {FILTER_TABS.map(tab => (
                    <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        statusFilter === tab.key
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>
                      {tab.label}
                      <span className={`text-[10px] tabular-nums ${statusFilter === tab.key ? 'text-white/70' : 'text-slate-400'}`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 pl-0.5">
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                    <ShieldCheck className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-sm font-semibold text-slate-600">No results</p>
                    <p className="text-xs text-slate-400 mt-1">Try a different filter or search term.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filtered.map(l => {
                      const meta  = STATUS_META[l.status] ?? STATUS_META.pending
                      const isSelected = selected?.id === l.id
                      const isPending  = l.status === 'pending'
                      const ago        = isPending ? daysAgo(l.kyc_submitted_at) : null

                      return (
                        <button key={l.id} type="button" onClick={() => selectLandlord(l)}
                          className={`w-full text-left px-4 py-3.5 transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-l-2 border-l-blue-600'
                              : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                          }`}>
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad(l.full_name)} flex items-center justify-center shrink-0 text-[11px] font-bold text-white`}>
                              {getInitials(l.full_name)}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-[13px] font-semibold truncate ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                  {l.full_name}
                                </p>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                  {meta.label}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-[11.5px] text-slate-400">
                                {l.whatsapp
                                  ? <span className="truncate">{l.whatsapp}</span>
                                  : <span className="italic">No phone</span>
                                }
                                {ago && (
                                  <span className={`shrink-0 font-semibold ${isPending ? 'text-amber-600' : 'text-slate-400'}`}>
                                    · {ago}
                                  </span>
                                )}
                                {!isPending && l.kyc_submitted_at && (
                                  <span className="shrink-0">{fmtDate(l.kyc_submitted_at)}</span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${isSelected ? 'text-blue-500' : 'text-slate-300'}`} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Review panel ── */}
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
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

// ── Review Panel ──────────────────────────────────────────────────────────────

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
  const meta   = STATUS_META[landlord.status] ?? STATUS_META.pending
  const busy   = processing === landlord.id

  const identityFields = [
    { icon: Calendar,    label: 'Joined',    value: fmtDate(landlord.created_at) },
    { icon: Calendar,    label: 'Submitted', value: fmtDate(landlord.kyc_submitted_at) },
    { icon: Hash,        label: 'NIN',       value: landlord.nin },
    { icon: CreditCard,  label: 'ID Type',   value: landlord.id_type },
    { icon: Hash,        label: 'ID Number', value: landlord.id_number },
    { icon: Phone,       label: 'WhatsApp',  value: landlord.whatsapp },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Panel header ── */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarGrad(landlord.full_name)} flex items-center justify-center shrink-0 text-[13px] font-bold text-white`}>
            {getInitials(landlord.full_name)}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-slate-900 truncate">{landlord.full_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
              {landlord.whatsapp && (
                <span className="text-[12px] text-slate-400">{landlord.whatsapp}</span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">

          {/* ── Action buttons ── */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Review Actions</p>
            <div className="flex flex-wrap gap-2">
              {landlord.status !== 'approved' && (
                <button onClick={() => onUpdateStatus(landlord.id, 'approved')} disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-sm shadow-emerald-600/20">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve
                </button>
              )}
              {landlord.status !== 'rejected' && (
                <button onClick={() => onUpdateStatus(landlord.id, 'rejected')} disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 text-sm font-semibold transition-colors">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Reject
                </button>
              )}
              {landlord.status !== 'suspended' && (
                <button onClick={() => onUpdateStatus(landlord.id, 'suspended')} disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 text-orange-700 text-sm font-semibold transition-colors">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  Suspend
                </button>
              )}
              {landlord.status !== 'pending' && landlord.status !== 'not_submitted' && (
                <button onClick={() => onUpdateStatus(landlord.id, 'pending')} disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-700 text-sm font-semibold transition-colors">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                  Reset to Pending
                </button>
              )}
            </div>

            {landlord.status === 'approved' && (
              <div className="mt-3 flex items-center gap-2 text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                This landlord is verified and active on the platform.
              </div>
            )}
            {landlord.status === 'rejected' && (
              <div className="mt-3 flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Account is rejected. Use Reset KYC on the Landlords page to allow resubmission.
              </div>
            )}
          </div>

          {/* ── Identity details ── */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Identity Details</p>
            <div className="grid grid-cols-2 gap-2">
              {identityFields.map(f => (
                <div key={f.label} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <f.icon className="w-3 h-3 text-slate-400" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{f.label}</p>
                  </div>
                  <p className="text-[13px] font-semibold text-slate-900 truncate">{f.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── KYC Documents ── */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">KYC Documents</p>
              <span className="text-[11px] font-semibold text-slate-500">
                {docsLoading ? 'Loading…' : `${kycDocs.length} file${kycDocs.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {docsLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading documents…</span>
              </div>
            ) : kycDocs.length === 0 ? (
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-6 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">No documents uploaded</p>
                <p className="text-xs text-slate-400 mt-0.5">This landlord has not submitted any KYC files yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {kycDocs.map(doc => {
                  const isImage = /\.(jpe?g|png|webp)$/i.test(doc.file_name)
                  const showImg = isImage && !imgErrors[doc.doc_type]
                  return (
                    <a key={doc.doc_type} href={doc.url} target="_blank" rel="noreferrer"
                      className="group flex flex-col rounded-xl border border-slate-200 bg-slate-50 overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all">
                      {/* Thumbnail */}
                      <div className="relative h-32 bg-slate-100 flex items-center justify-center overflow-hidden">
                        {showImg ? (
                          <img src={doc.url} alt={doc.file_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={() => onImgError(doc.doc_type)} />
                        ) : (
                          <FileText className="w-8 h-8 text-slate-400" />
                        )}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="inline-flex items-center gap-1.5 text-white text-xs font-bold bg-blue-600 rounded-full px-3 py-1.5">
                            <Eye className="w-3.5 h-3.5" /> Open
                          </span>
                        </div>
                      </div>
                      {/* Label */}
                      <div className="px-3 py-2.5">
                        <p className="text-[12px] font-semibold text-slate-800 truncate">
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
    </div>
  )
}

// ── Empty review placeholder ──────────────────────────────────────────────────

function EmptyReview({ pendingCount }: { pendingCount: number }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/60 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4">
        <ShieldCheck className="w-8 h-8 text-slate-300" />
      </div>
      <p className="text-base font-semibold text-slate-700">Select a landlord to review</p>
      <p className="text-sm text-slate-400 mt-1 max-w-xs">
        {pendingCount > 0
          ? `${pendingCount} submission${pendingCount !== 1 ? 's' : ''} waiting for your review.`
          : 'All submissions are up to date.'}
      </p>
      {pendingCount > 0 && (
        <div className="mt-4 inline-flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-3 py-1.5 font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          {pendingCount} pending review
        </div>
      )}
    </div>
  )
}
