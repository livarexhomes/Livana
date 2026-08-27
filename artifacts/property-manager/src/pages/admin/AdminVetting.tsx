import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShieldCheck, Search, CheckCircle, Clock, XCircle, Ban,
  X, FileText, Phone, Calendar, CreditCard, Hash,
  Loader2, AlertTriangle, Eye, Users, Building2,
  BedDouble, Bath, MapPin, DollarSign, ListChecks,
  Trash2, ChevronDown, ChevronLeft,
} from 'lucide-react'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AdminHeader from '../../components/layout/AdminHeader'
import AuthGuard from '../../components/auth/AuthGuard'
import { MobileSidebarProvider, MobilePageHeader, MobileStatGrid, MobileStatCard, MobileEmptyState } from '@/components/ui/mobile-admin'
import { createClient, getKycDocUrl, getSupabaseImageUrl } from '../../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'identity' | 'listings'

// ── Constants ─────────────────────────────────────────────────────────────────

const DOC_LABELS: Record<string, string> = {
  id_front:     'ID Card — Front',
  id_back:      'ID Card — Back',
  utility_bill: 'Utility Bill',
  selfie:       'Selfie with ID',
}

const KYC_STATUS_META: Record<string, {
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

function fmtNaira(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminVetting() {
  const [user, setUser]               = useState<{ email?: string } | null>(null)
  const [activeTab, setActiveTab]     = useState<Tab>('identity')

  // ── KYC state ──────────────────────────────────────────────────────────────
  const [landlords, setLandlords]           = useState<any[]>([])
  const [kycFiltered, setKycFiltered]       = useState<any[]>([])
  const [kycLoading, setKycLoading]         = useState(true)
  const [kycSearch, setKycSearch]           = useState('')
  const [kycStatusFilter, setKycStatusFilter] = useState('pending')
  const [selectedLandlord, setSelectedLandlord] = useState<any | null>(null)
  const [kycProcessing, setKycProcessing]   = useState<string | null>(null)
  const [kycDocs, setKycDocs]               = useState<{ doc_type: string; url: string; file_name: string }[]>([])
  const [imgErrors, setImgErrors]           = useState<Record<string, boolean>>({})
  const [docsLoading, setDocsLoading]       = useState(false)

  // ── Listings state ─────────────────────────────────────────────────────────
  const [pendingListings, setPendingListings]   = useState<any[]>([])
  const [listingsLoading, setListingsLoading]   = useState(true)
  const [listingProcessing, setListingProcessing] = useState<string | null>(null)
  const [listingConfirm, setListingConfirm]     = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser({ email: user?.email })
      if (user?.id) window.__livarexUserId = user.id
    })
  }, [])

  // ── Load KYC data ──────────────────────────────────────────────────────────
  const loadLandlords = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('landlords').select('*').order('created_at', { ascending: false })
    setLandlords(data ?? [])
    setKycLoading(false)
  }, [])

  useEffect(() => { loadLandlords() }, [loadLandlords])

  useEffect(() => {
    let list = [...landlords]
    if (kycStatusFilter !== 'all') list = list.filter(l => l.status === kycStatusFilter)
    if (kycSearch.trim()) {
      const q = kycSearch.toLowerCase()
      list = list.filter(l => l.full_name?.toLowerCase().includes(q) || l.whatsapp?.includes(q))
    }
    setKycFiltered(list)
  }, [kycSearch, kycStatusFilter, landlords])

  // ── Load Listings data ─────────────────────────────────────────────────────
  const loadPendingListings = useCallback(async () => {
    setListingsLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('properties')
      .select('*, landlords(full_name, whatsapp), property_images(storage_path, is_cover, sort_order)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })
    setPendingListings(data ?? [])
    setListingsLoading(false)
  }, [])

  useEffect(() => { loadPendingListings() }, [loadPendingListings])

  // ── KYC actions ───────────────────────────────────────────────────────────

  async function loadKycDocs(landlordId: string) {
    setDocsLoading(true); setKycDocs([]); setImgErrors({})
    const supabase = createClient()
    const { data } = await supabase
      .from('kyc_documents').select('doc_type, storage_path, file_name')
      .eq('landlord_id', landlordId).order('created_at', { ascending: true })
    if (data?.length) {
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

  async function updateKycStatus(id: string, status: string) {
    setKycProcessing(id)
    const supabase = createClient()
    const patch: any = { status }
    if (status === 'approved') patch.is_verified = true
    if (status !== 'approved') patch.is_verified = false
    await supabase.from('landlords').update(patch).eq('id', id)
    setLandlords(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l))
    if (selectedLandlord?.id === id) setSelectedLandlord((s: any) => s ? { ...s, ...patch } : s)
    setKycProcessing(null)
  }

  function clearKycSelection() { setSelectedLandlord(null); setKycDocs([]); setImgErrors({}) }

  function selectLandlord(l: any) {
    if (selectedLandlord?.id === l.id) { clearKycSelection(); return }
    setSelectedLandlord(l); loadKycDocs(l.id)
  }

  // ── Listing actions ────────────────────────────────────────────────────────

  async function approveListing(id: string) {
    setListingProcessing(id)
    const supabase = createClient()
    await supabase.from('properties').update({ status: 'available' }).eq('id', id)
    setPendingListings(ls => ls.filter(l => l.id !== id))
    setListingProcessing(null)
    setListingConfirm(null)
  }

  async function rejectListing(id: string) {
    setListingProcessing(id)
    const supabase = createClient()
    await supabase.from('properties').delete().eq('id', id)
    setPendingListings(ls => ls.filter(l => l.id !== id))
    setListingProcessing(null)
    setListingConfirm(null)
  }

  // ── Derived counts ─────────────────────────────────────────────────────────

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const kycCounts = {
    pending:       landlords.filter(l => l.status === 'pending').length,
    approved:      landlords.filter(l => l.status === 'approved').length,
    rejected:      landlords.filter(l => l.status === 'rejected').length,
    suspended:     landlords.filter(l => l.status === 'suspended').length,
    not_submitted: landlords.filter(l => l.status === 'not_submitted').length,
    all:           landlords.length,
  }

  const KYC_FILTER_TABS = [
    { key: 'pending',       label: 'Pending',       count: kycCounts.pending       },
    { key: 'approved',      label: 'Approved',      count: kycCounts.approved      },
    { key: 'rejected',      label: 'Rejected',      count: kycCounts.rejected      },
    { key: 'suspended',     label: 'Suspended',     count: kycCounts.suspended     },
    { key: 'not_submitted', label: 'Not Submitted', count: kycCounts.not_submitted },
    { key: 'all',           label: 'All',           count: kycCounts.all           },
  ]

  const totalPending = kycCounts.pending + pendingListings.length

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AuthGuard require="admin">
      <MobileSidebarProvider>
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminHeader
            title="Vetting Hub"
            subtitle={`${kycCounts.pending} identity ${kycCounts.pending === 1 ? 'check' : 'checks'} · ${pendingListings.length} listing ${pendingListings.length === 1 ? 'submission' : 'submissions'} pending`}
            pendingCount={totalPending}
          />

          {/* ── Mobile: compact page header ── */}
          <div className="sm:hidden px-3 pb-1">
            <MobilePageHeader
              title="Vetting Hub"
              subtitle={`${kycCounts.pending} identity ${kycCounts.pending === 1 ? 'check' : 'checks'} · ${pendingListings.length} listing ${pendingListings.length === 1 ? 'approval' : 'approvals'}`}
            />
          </div>

          {/* ── Hero header ── */}
          <div className="shrink-0 px-4 md:px-6 pt-3 pb-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                {/* <div className="hidden sm:block">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Platform Vetting</p>
                  <h2 className="mt-0.5 text-xl md:text-2xxl font-extrabold text-slate-950">Vetting Hub</h2>
                </div> */}

                {/* Mobile: compact KPI grid */}
                {/* <div className="sm:hidden">
                  <MobileStatGrid>
                    <MobileStatCard label="KYC Pending" value={kycCounts.pending} color="text-amber-700" icon={Clock} />
                    <MobileStatCard label="KYC Approved" value={kycCounts.approved} color="text-emerald-700" icon={CheckCircle} />
                    <MobileStatCard label="Listing Pending" value={pendingListings.length} color="text-violet-700" icon={ListChecks} />
                    <MobileStatCard label="Landlords" value={kycCounts.all} color="text-blue-700" icon={Users} />
                  </MobileStatGrid>
                </div> */}

                {/* Stats — desktop only */}
                {/* <div className="hidden sm:grid sm:grid-cols-2 sm:gap-1.5 sm:flex sm:items-center sm:gap-2 sm:flex-wrap shrink-0">
                  {[
                    { label: 'KYC Pending',     value: kycCounts.pending,      accent: 'text-amber-700'   },
                    { label: 'KYC Approved',    value: kycCounts.approved,     accent: 'text-emerald-700' },
                    { label: 'Listing Pending', value: pendingListings.length, accent: 'text-violet-700'  },
                    { label: 'Landlords',       value: kycCounts.all,          accent: 'text-blue-700'    },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50 px-2 sm:px-3 py-1.5 sm:py-2 text-center sm:min-w-[64px]">
                      <p className={`text-sm sm:text-lg font-extrabold ${s.accent}`}>{s.value}</p>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500 whitespace-nowrap">{s.label}</p>
                    </div>
                  ))}
                </div> */}
              </div>

              {/* ── Tab switcher ── */}
              <div className="mt-2.5 flex items-center gap-2 overflow-x-auto -mx-1 px-1 sm:overflow-visible sm:mx-0 sm:px-0">
                <button type="button" onClick={() => setActiveTab('identity')}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 sm:py-1.5 text-xs font-semibold transition h-10 sm:h-auto min-h-[44px] ${
                    activeTab === 'identity'
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Identity Checks
                  <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full text-[10px] font-bold ${
                activeTab === 'identity' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-blue-100 text-blue-700'
                }`}>{kycCounts.pending}</span>
                </button>

                <button type="button" onClick={() => setActiveTab('listings')}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 sm:py-1.5 text-xs font-semibold transition h-10 sm:h-auto min-h-[44px] ${
                    activeTab === 'listings'
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}>
                  <Building2 className="w-3.5 h-3.5" />
                  Listing Approvals
                  {pendingListings.length > 0 && (
                    <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full text-[10px] font-bold ${
                activeTab === 'listings' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-violet-100 text-violet-700'
                }`}>{pendingListings.length}</span>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* ── Tab content ── */}
          {activeTab === 'identity' ? (
            <IdentityTab
              landlords={landlords}
              filtered={kycFiltered}
              loading={kycLoading}
              search={kycSearch}
              setSearch={setKycSearch}
              statusFilter={kycStatusFilter}
              setStatusFilter={setKycStatusFilter}
              filterTabs={KYC_FILTER_TABS}
              selected={selectedLandlord}
              kycDocs={kycDocs}
              docsLoading={docsLoading}
              processing={kycProcessing}
              imgErrors={imgErrors}
              onImgError={(key: string) => setImgErrors(prev => ({ ...prev, [key]: true }))}
              onSelect={selectLandlord}
              onClear={clearKycSelection}
              onUpdateStatus={updateKycStatus}
              pendingCount={kycCounts.pending}
            />
          ) : (
            <ListingsTab
              listings={pendingListings}
              loading={listingsLoading}
              processing={listingProcessing}
              confirm={listingConfirm}
              setConfirm={setListingConfirm}
              onApprove={approveListing}
              onReject={rejectListing}
            />
          )}
        </div>
      </div>
      </MobileSidebarProvider>
    </AuthGuard>
  )
}

// ── Status filter dropdown ─────────────────────────────────────────────────────

function StatusFilterDropdown({ value, onChange, tabs }: {
  value: string
  onChange: (v: string) => void
  tabs: { key: string; label: string; count: number }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const selected = tabs.find(t => t.key === value) ?? tabs[0]

  const DOT: Record<string, string> = {
    pending: 'bg-amber-400', approved: 'bg-emerald-500',
    rejected: 'bg-red-500', suspended: 'bg-orange-500',
    not_submitted: 'bg-slate-400', all: 'bg-blue-500',
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[selected.key] ?? 'bg-slate-400'}`} />
          <span>{selected.label}</span>
          <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-900/10 text-[10px] font-bold text-slate-600 px-1">
            {selected.count}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/10 overflow-hidden">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { onChange(tab.key); setOpen(false) }}
              className={`flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                tab.key === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  tab.key === value ? 'bg-white/50' : (DOT[tab.key] ?? 'bg-slate-400')
                }`} />
                <span>{tab.label}</span>
              </div>
              <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full text-[10px] font-bold px-1 ${
                tab.key === value ? 'bg-white/20 text-white' : 'bg-slate-900/10 text-slate-600'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Identity (KYC) tab ─────────────────────────────────────────────────────────

function IdentityTab({
  filtered, loading, search, setSearch, statusFilter, setStatusFilter,
  filterTabs, selected, kycDocs, docsLoading, processing, imgErrors,
  onImgError, onSelect, onClear, onUpdateStatus, pendingCount,
}: any) {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden px-4 md:px-6 pb-4 md:pb-6 gap-4">

      {/* ── Queue ── */}
      <div className={`${selected ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:max-w-xs xl:max-w-sm shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden`}>

        {/* Filter dropdown */}
        <div className="shrink-0 p-4 border-b border-slate-100 space-y-3">
          <StatusFilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            tabs={filterTabs}
          />

          {/* Search */}
          <div className="flex items-center gap-2.5 rounded-3xl border border-slate-200 bg-slate-100 px-3.5 py-2">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or phone…"
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-medium pl-0.5">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12">
              <MobileEmptyState
                title="No results"
                description="Try a different filter or search term."
                icon={<Users className="w-5 h-5 text-slate-300" />}
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((l: any) => {
                const meta       = KYC_STATUS_META[l.status] ?? KYC_STATUS_META.pending
                const isSelected = selected?.id === l.id
                const isPending  = l.status === 'pending'
                const ago        = isPending ? daysAgo(l.kyc_submitted_at) : null
                return (
                  <button key={l.id} type="button" onClick={() => onSelect(l)}
                    className={`w-full text-left px-4 py-4 transition-all group ${
                      isSelected
                        ? 'bg-blue-50 border-l-[3px] border-l-blue-600'
                        : 'hover:bg-slate-50/80 border-l-[3px] border-l-transparent'
                    }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad(l.full_name)} flex items-center justify-center shrink-0 text-[11px] font-bold text-white shadow-sm`}>
                        {getInitials(l.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                            {l.full_name}
                          </p>
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

      {/* ── Review panel ── */}
      <div className={`${selected ? 'flex' : 'hidden lg:flex'} flex-1 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm`}>
        {selected ? (
          <KycReviewPanel
            landlord={selected}
            kycDocs={kycDocs}
            docsLoading={docsLoading}
            processing={processing}
            imgErrors={imgErrors}
            onImgError={onImgError}
            onClose={onClear}
            onUpdateStatus={onUpdateStatus}
          />
        ) : (
          <div className="flex-1 h-full flex flex-col items-center justify-center p-10 text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center mb-5">
              <ShieldCheck className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800">Select a landlord to review</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-xs leading-relaxed">
              {pendingCount > 0
                ? `${pendingCount} submission${pendingCount !== 1 ? 's are' : ' is'} waiting for your review. Click any name in the queue to get started.`
                : 'All identity checks are up to date.'}
            </p>
            {pendingCount > 0 && (
              <div className="mt-5 inline-flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-4 py-2 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {pendingCount} pending review
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── KYC Review panel ───────────────────────────────────────────────────────────

function KycReviewPanel({
  landlord, kycDocs, docsLoading, processing, imgErrors,
  onImgError, onClose, onUpdateStatus,
}: {
  landlord: any; kycDocs: any[]; docsLoading: boolean; processing: string | null
  imgErrors: Record<string, boolean>; onImgError: (k: string) => void
  onClose: () => void; onUpdateStatus: (id: string, status: string) => Promise<void>
}) {
  const meta = KYC_STATUS_META[landlord.status] ?? KYC_STATUS_META.pending
  const busy = processing === landlord.id

  const identityFields = [
    { icon: Calendar,   label: 'Joined',    value: fmtDate(landlord.created_at)       },
    { icon: Calendar,   label: 'Submitted', value: fmtDate(landlord.kyc_submitted_at) },
    { icon: Hash,       label: 'NIN',       value: landlord.nin                        },
    { icon: CreditCard, label: 'ID Type',   value: landlord.id_type                    },
    { icon: Hash,       label: 'ID Number', value: landlord.id_number                  },
    { icon: Phone,      label: 'WhatsApp',  value: landlord.whatsapp                   },
  ]

  const ACTIONS = [
    { key: 'approve', show: landlord.status !== 'approved',  label: 'Approve',         icon: CheckCircle, cls: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20', status: 'approved'  },
    { key: 'reject',  show: landlord.status !== 'rejected',  label: 'Reject',          icon: XCircle,     cls: 'border border-red-200 bg-red-50 hover:bg-red-100 text-red-700',               status: 'rejected'  },
    { key: 'suspend', show: landlord.status !== 'suspended', label: 'Suspend',         icon: Ban,         cls: 'border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700',   status: 'suspended' },
    { key: 'reset',   show: !['pending','not_submitted'].includes(landlord.status), label: 'Reset to Pending', icon: Clock, cls: 'border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700', status: 'pending' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-5 border-b border-slate-100">
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

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400 mb-3">Review Actions</p>
          <div className="flex flex-wrap gap-1.5">
            {ACTIONS.filter(a => a.show).map(a => {
              const Icon = a.icon
              return (
                <button key={a.key} onClick={() => onUpdateStatus(landlord.id, a.status)} disabled={busy}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-2xl text-[11px] sm:text-sm font-semibold transition-colors disabled:opacity-50 ${a.cls}`}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
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

        {/* Identity details */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400 mb-3">Identity Details</p>
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

        {/* KYC Documents */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">KYC Documents</p>
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
                    <div className="relative h-28 sm:h-36 bg-slate-100 flex items-center justify-center overflow-hidden">
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
                      <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="inline-flex items-center gap-1.5 text-white text-xs font-bold bg-blue-600 rounded-full px-4 py-2 shadow-lg">
                          <Eye className="w-3.5 h-3.5" /> Open
                        </span>
                      </div>
                    </div>
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

// ── Listing Approvals tab ──────────────────────────────────────────────────────

function ListingsTab({
  listings, loading, processing, confirm, setConfirm, onApprove, onReject,
}: {
  listings: any[]; loading: boolean; processing: string | null
  confirm: { id: string; action: 'approve' | 'reject' } | null
  setConfirm: (c: { id: string; action: 'approve' | 'reject' } | null) => void
  onApprove: (id: string) => Promise<void>
  onReject:  (id: string) => Promise<void>
}) {
  return (
    <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-6 pb-4 md:pb-6">
      <div className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">

        {/* Panel header */}
        <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-5 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Listing Approvals</p>
            <h3 className="mt-1 text-base font-extrabold text-slate-950">
              {loading ? 'Loading…' : listings.length === 0
                ? 'All listings approved'
                : `${listings.length} listing${listings.length !== 1 ? 's' : ''} awaiting review`}
            </h3>
          </div>
          {listings.length > 0 && (
            <div className="inline-flex items-center gap-2 text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-4 py-2 font-semibold shrink-0">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              {listings.length} pending
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 sm:py-24 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Loading pending listings…</span>
            </div>
          ) : listings.length === 0 ? (
            <div className="py-12">
              <MobileEmptyState
                title="All caught up!"
                description="No listing submissions waiting for review. New landlord listings will appear here automatically."
                icon={<ListChecks className="w-5 h-5 text-slate-300" />}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map(listing => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  processing={processing}
                  confirm={confirm}
                  setConfirm={setConfirm}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Listing card ───────────────────────────────────────────────────────────────

function ListingCard({
  listing, processing, confirm, setConfirm, onApprove, onReject,
}: {
  listing: any; processing: string | null
  confirm: { id: string; action: 'approve' | 'reject' } | null
  setConfirm: (c: { id: string; action: 'approve' | 'reject' } | null) => void
  onApprove: (id: string) => Promise<void>
  onReject:  (id: string) => Promise<void>
}) {
  const busy = processing === listing.id
  const isConfirming = confirm?.id === listing.id

  // Pick cover image
  const images: any[] = listing.property_images ?? []
  const cover = images.find((i: any) => i.is_cover) ?? images.sort((a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99))[0]
  const coverUrl = cover ? getSupabaseImageUrl(cover.storage_path, 400) : null

  const landlordName = listing.landlords?.full_name ?? 'Unknown landlord'

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md hover:border-slate-300 transition-all">
      {/* Cover image */}
      <div className="relative h-32 sm:h-44 bg-slate-100 overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt={listing.title}
            className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-10 h-10 text-slate-200" />
          </div>
        )}
        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
            listing.type === 'sale' ? 'bg-blue-600 text-white' : 'bg-emerald-500 text-white'
          }`}>
            {listing.type === 'sale' ? 'For Sale' : 'For Rent'}
          </span>
        </div>
        {/* Submitted time */}
        <div className="absolute top-3 right-3">
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50/90 border border-amber-200 rounded-full px-2.5 py-1 backdrop-blur-sm">
            {daysAgo(listing.created_at)}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="flex-1 p-4">
        <h4 className="text-sm font-extrabold text-slate-900 line-clamp-2 leading-snug">{listing.title}</h4>

        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
            <span className="truncate">{listing.address}{listing.city ? `, ${listing.city}` : ''}</span>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-slate-500">
            <span className="flex items-center gap-1"><BedDouble className="w-3 h-3 text-slate-400" />{listing.bedrooms} bed</span>
            <span className="flex items-center gap-1"><Bath className="w-3 h-3 text-slate-400" />{listing.bathrooms} bath</span>
            {listing.area_sqft && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{listing.area_sqft} sqft</span>}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-lg font-extrabold text-slate-950">{fmtNaira(listing.price)}</p>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {listing.type === 'rent' ? '/yr' : 'outright'}
          </div>
        </div>

        {/* Landlord */}
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGrad(landlordName)} flex items-center justify-center shrink-0 text-[9px] font-bold text-white`}>
            {getInitials(landlordName)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-700 truncate">{landlordName}</p>
            {listing.landlords?.whatsapp && (
              <p className="text-[10px] text-slate-400 truncate">{listing.landlords.whatsapp}</p>
            )}
          </div>
          <span className="ml-auto shrink-0 text-[10px] font-bold text-slate-400 bg-slate-200 rounded-full px-2 py-0.5">Submitted</span>
        </div>
      </div>

      {/* Action footer */}
      <div className="shrink-0 px-4 pb-4">
        {isConfirming ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700 mb-2.5 text-center">
              {confirm?.action === 'approve'
                ? 'Approve this listing and make it live?'
                : 'Reject and permanently delete this listing?'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirm(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => confirm?.action === 'approve' ? onApprove(listing.id) : onReject(listing.id)}
                disabled={busy}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60 ${
                  confirm?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : confirm?.action === 'approve' ? 'Approve' : 'Delete listing'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirm({ id: listing.id, action: 'approve' })}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold transition-colors disabled:opacity-60 shadow-sm shadow-emerald-600/20">
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </button>
            <button
              onClick={() => setConfirm({ id: listing.id, action: 'reject' })}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 py-2.5 text-xs font-bold transition-colors disabled:opacity-60">
              <Trash2 className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
