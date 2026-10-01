import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  CheckCircle, Clock, ShieldCheck,
  Loader2, Users, Building2,
  BedDouble, Bath, MapPin, DollarSign, ListChecks,
  Trash2, ChevronDown, ChevronRight,
} from 'lucide-react'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AuthGuard from '../../components/auth/AuthGuard'
import { MobileSidebarProvider, MobileStatGrid, MobileStatCard } from '@/components/ui/mobile-admin'
import { createClient, getKycDocUrl, getSupabaseImageUrl } from '../../lib/supabase'
import {
  VettingHeader,
  VettingTabs,
  VettingToolbar,
  ApplicantList,
  ReviewWorkspace,
  MobileReviewScreen,
  type VettingTab,
  type SortOrder,
  USE_MOCK_VETTING,
  MOCK_LANDLORDS,
  MOCK_KYC_DOCS,
  avatarGrad,
  getInitials,
  daysAgo,
  type VettingLandlord,
  type VettingStatus,
} from '@/components/vetting'
import StatusFilterDropdown from '@/components/vetting/StatusFilterDropdown'

function fmtNaira(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

// ── Constants ─────────────────────────────────────────────────────────────────

const KYC_FILTER_TABS_BASE = [
  { key: 'pending',       label: 'Pending' },
  { key: 'approved',      label: 'Approved' },
  { key: 'rejected',      label: 'Rejected' },
  { key: 'suspended',     label: 'Suspended' },
  { key: 'not_submitted', label: 'Not Submitted' },
  { key: 'all',           label: 'All' },
] as const

const BRAND = '#6366F1'
const BRAND_D = '#4F46E5'
const ACCENT = '#A855F7'

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminVetting() {
  const [user, setUser]               = useState<{ email?: string } | null>(null)
  const [activeTab, setActiveTab]     = useState<VettingTab>('identity')

  // ── KYC state ──────────────────────────────────────────────────────────────
  const [landlords, setLandlords]           = useState<VettingLandlord[]>(USE_MOCK_VETTING ? MOCK_LANDLORDS : [])
  const [kycFiltered, setKycFiltered]       = useState<VettingLandlord[]>([])
  const [kycLoading, setKycLoading]         = useState<boolean>(!USE_MOCK_VETTING)
  const [kycSearch, setKycSearch]           = useState('')
  const [kycStatusFilter, setKycStatusFilter] = useState('pending')
  const [sortOrder, setSortOrder]           = useState<SortOrder>('newest')
  const [selectedLandlord, setSelectedLandlord] = useState<VettingLandlord | null>(null)
  const [kycProcessing, setKycProcessing]   = useState<string | null>(null)
  const [kycDocs, setKycDocs]               = useState<{ doc_type: string; url: string; file_name: string }[]>(USE_MOCK_VETTING ? MOCK_KYC_DOCS : [])
  const [kycDocsError, setKycDocsError]     = useState('')
  const [imgErrors, setImgErrors]           = useState<Record<string, boolean>>({})
  const [docsLoading, setDocsLoading]       = useState(false)

  // ── Listings state ─────────────────────────────────────────────────────────
  const [pendingListings, setPendingListings]   = useState<any[]>([])
  const [listingsLoading, setListingsLoading]   = useState<boolean>(!USE_MOCK_VETTING)
  const [listingProcessing, setListingProcessing] = useState<string | null>(null)
  const [listingConfirm, setListingConfirm]     = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (USE_MOCK_VETTING) {
      setUser({ email: 'admin@livarex.com.ng' })
      return
    }
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser({ email: user?.email })
      if (user?.id) window.__livarexUserId = user.id
    })
  }, [])

  // ── Load KYC data ──────────────────────────────────────────────────────────
  const loadLandlords = useCallback(async () => {
    if (USE_MOCK_VETTING) {
      setLandlords(MOCK_LANDLORDS)
      setKycLoading(false)
      return
    }
    const supabase = createClient()
    const { data } = await supabase
      .from('landlords').select('*').order('created_at', { ascending: false })
    setLandlords((data ?? []) as VettingLandlord[])
    setKycLoading(false)
  }, [])

  useEffect(() => { loadLandlords() }, [loadLandlords])

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const kycFilterTabs = useMemo(
    () => KYC_FILTER_TABS_BASE.map(t => ({
      key: t.key,
      label: t.label,
      count: t.key === 'all' ? landlords.length : landlords.filter(l => l.status === t.key).length,
    })),
    [landlords],
  )

  useEffect(() => {
    let list = [...landlords]
    if (kycStatusFilter !== 'all') list = list.filter(l => l.status === kycStatusFilter)
    if (kycSearch.trim()) {
      const q = kycSearch.toLowerCase()
      list = list.filter(l =>
        l.full_name?.toLowerCase().includes(q) ||
        l.whatsapp?.includes(q) ||
        l.email?.toLowerCase().includes(q),
      )
    }
    list.sort((a, b) => {
      if (sortOrder === 'name_asc') {
        return a.full_name.localeCompare(b.full_name)
      }
      const at = a.kyc_submitted_at || a.created_at
      const bt = b.kyc_submitted_at || b.created_at
      return sortOrder === 'oldest'
        ? new Date(at).getTime() - new Date(bt).getTime()
        : new Date(bt).getTime() - new Date(at).getTime()
    })
    setKycFiltered(list)
  }, [kycSearch, kycStatusFilter, sortOrder, landlords])

  // ── Load Listings data ─────────────────────────────────────────────────────
  const loadPendingListings = useCallback(async () => {
    if (USE_MOCK_VETTING) {
      setListingsLoading(false)
      return
    }
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
    if (USE_MOCK_VETTING) {
      setKycDocs(MOCK_KYC_DOCS)
      setImgErrors({})
      return
    }
    setDocsLoading(true); setKycDocs([]); setKycDocsError(''); setImgErrors({})
    const supabase = createClient()
    const { data, error } = await supabase
      .from('kyc_documents').select('doc_type, storage_path, file_name')
      .eq('landlord_id', landlordId).order('created_at', { ascending: true })
    if (error) {
      console.error('[KYC] Failed to load document records:', error.message)
      setKycDocsError(`Could not load KYC document records: ${error.message}`)
      setDocsLoading(false)
      return
    }
    if (data?.length) {
      const withUrls = await Promise.all(
        data.map(async (d: any) => ({
          doc_type:  d.doc_type,
          file_name: d.file_name ?? d.doc_type,
          url:       (await getKycDocUrl(d.storage_path)) ?? '',
        }))
      )
      setKycDocs(withUrls)
      if (withUrls.some(doc => !doc.url)) {
        setKycDocsError('Document records were found, but file access failed. Check the private KYC bucket policies.')
      }
    }
    setDocsLoading(false)
  }

  async function updateKycStatus(id: string, status: VettingStatus) {
    setKycProcessing(id)
    if (USE_MOCK_VETTING) {
      // Update mock state locally.
      setLandlords(ls => ls.map(l => l.id === id ? { ...l, status, is_verified: status === 'approved' } : l))
      if (selectedLandlord?.id === id) {
        setSelectedLandlord(s => s ? { ...s, status, is_verified: status === 'approved' } : s)
      }
      setKycProcessing(null)
      return
    }
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

  function selectLandlord(l: VettingLandlord) {
    if (selectedLandlord?.id === l.id) { clearKycSelection(); return }
    setSelectedLandlord(l); loadKycDocs(l.id)
  }

  // ── Listing actions ────────────────────────────────────────────────────────

  async function approveListing(id: string) {
    if (USE_MOCK_VETTING) {
      setPendingListings(ls => ls.filter(l => l.id !== id))
      setListingProcessing(null)
      setListingConfirm(null)
      return
    }
    setListingProcessing(id)
    const supabase = createClient()
    await supabase.from('properties').update({ status: 'available' }).eq('id', id)
    setPendingListings(ls => ls.filter(l => l.id !== id))
    setListingProcessing(null)
    setListingConfirm(null)
  }

  async function rejectListing(id: string) {
    if (USE_MOCK_VETTING) {
      setPendingListings(ls => ls.filter(l => l.id !== id))
      setListingProcessing(null)
      setListingConfirm(null)
      return
    }
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
  const totalPending = kycCounts.pending + pendingListings.length

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AuthGuard require="admin">
      <MobileSidebarProvider>
        <div className="vetting-page lv-vetting flex h-screen overflow-hidden bg-slate-50/40 text-slate-900">
        <style>{vettingStyles}</style>
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="lv-vetting-content flex flex-1 min-w-0 flex-col overflow-hidden">
          <VettingHeader
            kycPendingCount={kycCounts.pending}
            listingsPendingCount={pendingListings.length}
            totalNotifications={totalPending}
            onSearch={setKycSearch}
            adminName={displayName}
          />

          {/* Mobile: stat grid */}
          <div className="sm:hidden px-3 pt-3">
            <MobileStatGrid>
               <MobileStatCard label="KYC pending"     value={kycCounts.pending}      color="#6366F1" icon={Clock} />
               <MobileStatCard label="KYC approved"    value={kycCounts.approved}     color="#16a34a" icon={CheckCircle} />
               <MobileStatCard label="Listings pending" value={pendingListings.length} color="#A855F7" icon={ListChecks} />
               <MobileStatCard label="Landlords"       value={kycCounts.all}          color="#4F46E5" icon={Users} />
            </MobileStatGrid>
          </div>

          {/* Workspace navigation */}
          <div className="hidden sm:flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-white/70 backdrop-blur border-b border-slate-200/80 shrink-0">
            <div className="min-w-0">
              {activeTab === 'identity' ? (
                <StatusFilterDropdown
                  value={kycStatusFilter}
                  onChange={setKycStatusFilter}
                  tabs={kycFilterTabs}
                />
              ) : (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Property review</p>
                  <p className="mt-0.5 text-xs text-slate-500">Review and approve landlord listing submissions</p>
                </div>
              )}
            </div>
            <VettingTabs
              active={activeTab}
              onChange={setActiveTab}
              kycCount={kycCounts.pending}
              listingsCount={pendingListings.length}
            />
          </div>

          {/* Tab switcher (mobile only) */}
          <div className="sm:hidden shrink-0 border-b border-slate-100 bg-white px-4 py-2">
            <VettingTabs
              active={activeTab}
              onChange={setActiveTab}
              kycCount={kycCounts.pending}
              listingsCount={pendingListings.length}
            />
          </div>

          {activeTab === 'identity' ? (
            /* ── Two-panel workspace — each panel scrolls independently ── */
            <div
              className="flex flex-1 min-h-0 overflow-hidden"
              data-testid="vetting-grid"
            >
              {/* LEFT: landlord queue — independently scrollable */}
              <div className="w-72 xl:w-[21rem] shrink-0 min-h-0 overflow-hidden border-r border-slate-200/80 bg-white hidden md:flex md:flex-col">
                {/* Toolbar without status pills on desktop (pills already in header dropdown) */}
                <div className="px-4 pt-4 pb-2 border-b border-slate-100 shrink-0">
                  <VettingToolbar
                    search={kycSearch}
                    onSearch={setKycSearch}
                    statusFilter={kycStatusFilter}
                    onStatusFilter={setKycStatusFilter}
                    filterTabs={kycFilterTabs as any}
                    sort={sortOrder}
                    onSort={setSortOrder}
                    resultCount={kycFiltered.length}
                    hideFiltersOnDesktop={true}
                  />
                </div>
                <ApplicantList
                  landlords={kycFiltered}
                  selectedId={selectedLandlord?.id}
                  onSelect={selectLandlord}
                  loading={kycLoading}
                  className="flex-1 min-h-0 border-0 shadow-none"
                />
              </div>

              {/* RIGHT: review workspace — sticky, independently scrollable */}
              <div className="flex-1 min-w-0 min-h-0 overflow-y-auto bg-slate-50/40">
                {/* Mobile: back button when no landlord selected */}
                {selectedLandlord && (
                  <div className="md:hidden px-4 pt-3">
                    <button onClick={clearKycSelection}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-700">
                      <ChevronDown className="w-4 h-4 rotate-90" /> Back to queue
                    </button>
                  </div>
                )}
                <div className="px-4 pb-6 pt-4 sm:px-6 md:pt-6">
                  {/* Mobile: compact queue header */}
                  <div className="md:hidden mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Landlord queue</p>
                      <span className="text-[11px] font-semibold text-slate-500">{kycFiltered.length}</span>
                    </div>
                    <VettingToolbar
                      search={kycSearch}
                      onSearch={setKycSearch}
                      statusFilter={kycStatusFilter}
                      onStatusFilter={setKycStatusFilter}
                      filterTabs={kycFilterTabs as any}
                      sort={sortOrder}
                      onSort={setSortOrder}
                      resultCount={kycFiltered.length}
                      hideFiltersOnDesktop={true}
                    />
                  </div>
                  <div className="md:hidden">
                    <ApplicantList
                      landlords={kycFiltered}
                      selectedId={selectedLandlord?.id}
                      onSelect={selectLandlord}
                      loading={kycLoading}
                      className="min-h-0 rounded-2xl border border-slate-200/80 shadow-sm"
                    />
                  </div>
                  <div className="hidden md:block">
                  <ReviewWorkspace
                    landlord={selectedLandlord}
                    kycDocs={kycDocs}
                    docsError={kycDocsError}
                    docsLoading={docsLoading}
                    processing={kycProcessing}
                    imgErrors={imgErrors}
                    onImgError={(k: string) => setImgErrors(prev => ({ ...prev, [k]: true }))}
                    onClose={clearKycSelection}
                    onUpdateStatus={updateKycStatus}
                  />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 sm:p-6">
              <ListingsTab
                listings={pendingListings}
                loading={listingsLoading}
                processing={listingProcessing}
                confirm={listingConfirm}
                setConfirm={setListingConfirm}
                onApprove={approveListing}
                onReject={rejectListing}
                onReviewIdentity={() => { setActiveTab('identity'); setKycStatusFilter('pending') }}
                kycPendingCount={kycCounts.pending}
              />
            </div>
          )}
        </div>

        {/* Mobile full-screen review */}
        {selectedLandlord && (
          <div className="md:hidden">
            <MobileReviewScreen
              landlord={selectedLandlord}
              kycDocs={kycDocs}
              docsError={kycDocsError}
              docsLoading={docsLoading}
              processing={kycProcessing}
              imgErrors={imgErrors}
              onImgError={(k: string) => setImgErrors(prev => ({ ...prev, [k]: true }))}
              onBack={clearKycSelection}
              onUpdateStatus={updateKycStatus}
            />
          </div>
        )}
      </div>
      </MobileSidebarProvider>
    </AuthGuard>
  )
}

// ── Listing Approvals tab ─────────────────────────────────────────────────────

function ListingsTab({
  listings, loading, processing, confirm, setConfirm, onApprove, onReject,
  onReviewIdentity, kycPendingCount,
}: {
  listings: any[]; loading: boolean; processing: string | null
  confirm: { id: string; action: 'approve' | 'reject' } | null
  setConfirm: (c: { id: string; action: 'approve' | 'reject' } | null) => void
  onApprove: (id: string) => Promise<void>
  onReject:  (id: string) => Promise<void>
  onReviewIdentity: () => void
  kycPendingCount: number
}) {
  return (
    <div className="relative flex flex-1 min-h-0 overflow-hidden flex-col rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-60"
        style={{
          background:
            'linear-gradient(180deg, rgba(99,102,241,0.05) 0%, rgba(168,85,247,0.03) 50%, transparent 100%)',
        }}
      />
      <div className="relative shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 backdrop-blur px-4 py-4 sm:px-6 sm:py-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Property review</p>
          <h3 className="mt-1 text-base font-extrabold tracking-tight text-slate-900">
            {loading ? 'Loading…' : listings.length === 0
              ? 'No submissions waiting for review'
              : `${listings.length} listing${listings.length !== 1 ? 's' : ''} awaiting review`}
          </h3>
        </div>
        {listings.length > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm shrink-0">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-indigo-500 opacity-70" />
              <span className="relative h-2 w-2 rounded-full bg-indigo-500" />
            </span>
            {listings.length} pending
          </div>
        )}
      </div>

      <div className="relative flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 sm:py-24 gap-3 text-slate-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <span className="text-sm font-semibold">Loading pending listings…</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="flex min-h-[min(60vh,520px)] items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50/70 via-white to-white px-6 py-10 text-center shadow-sm sm:px-10">
              <div className="relative mx-auto mb-5 w-fit">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-3xl bg-emerald-400/20 blur-xl"
                />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl border border-emerald-100 bg-white shadow-sm">
                  <ListChecks className="w-7 h-7 text-emerald-600" />
                </div>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Listing approvals</p>
              <h4 className="mt-2 text-lg font-extrabold tracking-tight text-slate-900">Your listing queue is clear</h4>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                There are no property submissions waiting for approval. New listings will appear here when landlords submit them.
              </p>
              {kycPendingCount > 0 && (
                <button
                  type="button"
                  onClick={onReviewIdentity}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Review {kycPendingCount} pending identity check{kycPendingCount === 1 ? '' : 's'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {listings.map((listing: any) => (
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
  )
}

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

  const images: any[] = listing.property_images ?? []
  const cover = images.find((i: any) => i.is_cover) ?? images.sort((a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99))[0]
  const coverUrl = cover ? getSupabaseImageUrl(cover.storage_path, 400) : null

  const landlordName = listing.landlords?.full_name ?? 'Unknown landlord'

  return (
      <div className="group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-2 shadow-sm shadow-slate-900/[0.02] transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/[0.06]">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100">
        {coverUrl ? (
          <img src={coverUrl} alt={listing.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-10 h-10 text-slate-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider shadow-md ${
             listing.type === 'sale' ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-indigo-500/30' : 'bg-slate-900/90 text-white backdrop-blur'
          }`}>
            {listing.type === 'sale' ? 'For Sale' : 'For Rent'}
          </span>
        </div>
        <div className="absolute top-3 right-3">
             <span className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-600 backdrop-blur shadow-sm">
            {daysAgo(listing.created_at)}
          </span>
        </div>
      </div>

      <div className="flex-1 px-3 py-4">
         <h4 className="text-base font-extrabold tracking-tight text-slate-900 line-clamp-2 leading-snug">{listing.title}</h4>

        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
            <span className="truncate">{listing.address}{listing.city ? `, ${listing.city}` : ''}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><BedDouble className="w-3 h-3 text-slate-400" />{listing.bedrooms} bed</span>
            <span className="flex items-center gap-1"><Bath className="w-3 h-3 text-slate-400" />{listing.bathrooms} bath</span>
            {listing.area_sqft && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{listing.area_sqft} sqft</span>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
           <p
             className="text-xl font-extrabold tracking-tight break-words"
             style={{ background: `linear-gradient(135deg, ${BRAND}, ${ACCENT})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
           >
             {fmtNaira(listing.price)}
           </p>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {listing.type === 'rent' ? '/yr' : 'outright'}
          </div>
        </div>

         <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white px-3 py-3">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGrad(landlordName)} flex items-center justify-center shrink-0 text-[10px] font-black text-white shadow-sm ring-2 ring-white`}>
            {getInitials(landlordName)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-700 truncate">{landlordName}</p>
            {listing.landlords?.whatsapp && (
              <p className="text-[10px] text-slate-400 truncate">{listing.landlords.whatsapp}</p>
            )}
          </div>
           <span className="ml-auto shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 shadow-sm">Submitted</span>
        </div>
      </div>

      <div className="shrink-0 px-3 pb-3">
        {isConfirming ? (
           <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold text-slate-700 mb-2.5 text-center">
              {confirm?.action === 'approve'
                ? 'Approve this listing and make it live?'
                : 'Reject and permanently delete this listing?'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirm(null)}
                 className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50">
                Cancel
              </button>
               <button
                onClick={() => confirm?.action === 'approve' ? onApprove(listing.id) : onReject(listing.id)}
                disabled={busy}
                 className={`flex-1 rounded-xl py-2 text-xs font-bold text-white transition-all disabled:opacity-60 shadow-md ${
                    confirm?.action === 'approve'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/40'
                      : 'bg-gradient-to-br from-red-500 to-rose-500 shadow-red-500/30 hover:shadow-lg hover:shadow-red-500/40'
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
               className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white transition-all disabled:opacity-60 shadow-md hover:shadow-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/30 hover:shadow-indigo-500/40">
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </button>
            <button
              onClick={() => setConfirm({ id: listing.id, action: 'reject' })}
              disabled={busy}
               className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200/80 bg-white text-red-700 py-2.5 text-xs font-bold transition-all hover:bg-red-50 hover:border-red-300 hover:shadow-md hover:shadow-red-500/10 disabled:opacity-60">
              <Trash2 className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const vettingStyles = `
.lv-vetting{height:100vh;height:100dvh;color-scheme:light}
.lv-vetting-content{background:#f8fafc}
.lv-vetting-content input,.lv-vetting-content select,.lv-vetting-content textarea{color:#0f172a;background-color:#fff;border-color:#e2e8f0;border-radius:12px;min-height:42px}
.lv-vetting-content input::placeholder,.lv-vetting-content textarea::placeholder{color:#64748b;opacity:1}
.lv-vetting-content input:focus,.lv-vetting-content select:focus,.lv-vetting-content textarea:focus{outline:2px solid #6366f1;outline-offset:2px}
.lv-vetting-content button:focus-visible{outline:2px solid #6366f1;outline-offset:3px}
.lv-vetting-content .text-slate-400{color:#64748b}
.lv-vetting-content [data-testid="vetting-grid"]{isolation:isolate}
.lv-vetting-content .overflow-y-auto{overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#cbd5e1 transparent}
.lv-vetting-card button{min-height:44px}
@media(max-width:767px){.lv-vetting-content input,.lv-vetting-content select,.lv-vetting-content textarea{font-size:16px}.lv-vetting-content{padding-bottom:env(safe-area-inset-bottom)}}
@media(prefers-reduced-motion:reduce){.lv-vetting-content *{transition:none!important;animation:none!important}}
`