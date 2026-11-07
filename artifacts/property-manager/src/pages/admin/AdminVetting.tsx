import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  CheckCircle, ShieldCheck,
  Loader2, Users, Building2,
  BedDouble, Bath, MapPin, DollarSign, ListChecks,
  ChevronDown, Eye, Image as ImageIcon,
  Home, Ruler, CalendarDays, Tag, XCircle, Search, SlidersHorizontal,
  FileText, History, AlertCircle, RefreshCw, Check,
} from 'lucide-react'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AuthGuard from '../../components/auth/AuthGuard'
import { MobileSidebarProvider } from '@/components/ui/mobile-admin'
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
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function fmtNaira(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const details = 'details' in error && typeof error.details === 'string' ? error.details : ''
    const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : ''
    return [error.message, details, hint].filter(Boolean).join(' ')
  }
  return fallback
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

type ListingReviewFilter = 'all' | 'pending_review' | 'available' | 'rejected' | 'changes_requested'
type ListingReviewAction = 'approved' | 'rejected' | 'changes_requested'

const LISTING_REVIEW_FILTERS: { value: ListingReviewFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_review', label: 'Pending' },
  { value: 'available', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'changes_requested', label: 'Needs changes' },
]

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminVetting() {
  const { toast } = useToast()
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
  const [listingsError, setListingsError] = useState('')
  const [listingCountsError, setListingCountsError] = useState('')
  const [listingProcessing, setListingProcessing] = useState<string | null>(null)
  const [listingStatusFilter, setListingStatusFilter] = useState<ListingReviewFilter>('pending_review')
  const [listingCounts, setListingCounts] = useState({
    pending_review: 0, available: 0, rejected: 0, changes_requested: 0, all: 0,
  })

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
      setPendingListings([])
      setListingCounts({ pending_review: 0, available: 0, rejected: 0, changes_requested: 0, all: 0 })
      setListingsError('')
      setListingCountsError('')
      setListingsLoading(false)
      return
    }
    setListingsLoading(true)
    setListingsError('')
    setListingCountsError('')
    try {
      const supabase = createClient()
      const statuses: Exclude<ListingReviewFilter, 'all'>[] = [
        'pending_review', 'available', 'rejected', 'changes_requested',
      ]
      const listingQuery = supabase
        .from('properties')
        .select('*, landlords(id, full_name, whatsapp, status, is_verified), property_images(id, storage_path, alt_text, is_cover, sort_order)')
        .order('updated_at', { ascending: false })
      if (listingStatusFilter === 'all') {
        listingQuery.in('status', statuses)
      } else {
        listingQuery.eq('status', listingStatusFilter)
      }

      const listingsResult = await listingQuery
      if (listingsResult.error) throw listingsResult.error
      setPendingListings(listingsResult.data ?? [])

      const countResults = await Promise.all(statuses.map(status => supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('status', status)
          .then(result => result, () => null)))

      const counts = Object.fromEntries(statuses.map((status, index) => [
        status, !countResults[index] || countResults[index].error ? 0 : countResults[index].count ?? 0,
      ])) as Record<Exclude<ListingReviewFilter, 'all'>, number>
      const countErrors = countResults.flatMap((result, index) => {
        if (result === null) return [`${statuses[index]}: count request failed before a response was received`]
        if (result.error) return [`${statuses[index]}: ${getErrorMessage(result.error, 'count unavailable')}`]
        return []
      })
      if (countErrors.length) {
        const message = `Property submissions loaded, but some status counts are unavailable. ${countErrors.join('; ')}`
        console.error('[vetting] Failed to load property review counts:', countErrors)
        setListingCountsError(message)
      }
      setListingCounts({ ...counts, all: Object.values(counts).reduce((sum, count) => sum + count, 0) })
    } catch (error) {
      console.error('[vetting] Failed to load property review queue:', error)
      setListingsError(getErrorMessage(error, 'Could not load property submissions.'))
      setPendingListings([])
    } finally {
      setListingsLoading(false)
    }
  }, [listingStatusFilter])

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
    const patch = { status, is_verified: status === 'approved' }
    try {
      if (USE_MOCK_VETTING) {
        setLandlords(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l))
      } else {
        const current = landlords.find(landlord => landlord.id === id)
        if (!current) throw new Error('This landlord is no longer in the review queue.')
        const { data, error } = await createClient()
          .from('landlords')
          .update(patch)
          .eq('id', id)
          .eq('status', current.status)
          .select('id')
          .maybeSingle()
        if (error) throw error
        if (!data) throw new Error('This landlord was updated by another administrator. Refresh the queue and try again.')
      }
      setLandlords(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l))
      if (selectedLandlord?.id === id) setSelectedLandlord(s => s ? { ...s, ...patch } : s)
      toast({ title: 'Identity review saved', description: `Landlord status updated to ${status.replace('_', ' ')}.` })
    } catch (error) {
      console.error('[KYC] Failed to update landlord status:', error)
      toast({
        title: 'Could not save identity review',
        description: error instanceof Error ? error.message : 'Please retry the decision.',
        variant: 'destructive',
      })
      throw error
    } finally {
      setKycProcessing(null)
    }
  }

  function clearKycSelection() { setSelectedLandlord(null); setKycDocs([]); setImgErrors({}) }

  function selectLandlord(l: VettingLandlord) {
    if (kycProcessing) return
    if (selectedLandlord?.id === l.id) { clearKycSelection(); return }
    setSelectedLandlord(l); loadKycDocs(l.id)
  }

  // ── Listing actions ────────────────────────────────────────────────────────

  async function reviewListing(id: string, action: ListingReviewAction, reason?: string) {
    setListingProcessing(id)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('review_property_submission', {
        p_property_id: id,
        p_action: action,
        p_reason: reason?.trim() || null,
      })
      if (error) throw error
      if (!data?.length) throw new Error('The review did not return an updated submission.')

      const successText = action === 'approved'
        ? 'Listing approved and published.'
        : action === 'rejected'
          ? 'Listing rejected. The reason is saved in its review history.'
          : 'Changes requested. The landlord can update and resubmit the listing.'
      toast({ title: 'Review saved', description: successText })
      await loadPendingListings()
    } catch (error) {
      console.error('[vetting] Failed to save property review decision:', error)
      toast({
        title: 'Could not save review',
        description: error instanceof Error ? error.message : 'Please retry the decision.',
        variant: 'destructive',
      })
    } finally {
      setListingProcessing(null)
    }
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
  const totalPending = kycCounts.pending + listingCounts.pending_review

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AuthGuard require="admin">
      <MobileSidebarProvider>
        <div className="vetting-page lv-vetting flex h-screen h-[100dvh] overflow-hidden bg-[#F5F8FC] text-slate-900">
        <style>{vettingStyles}</style>
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="lv-vetting-content flex flex-1 min-w-0 flex-col overflow-hidden">
          <VettingHeader
            kycPendingCount={kycCounts.pending}
            listingsPendingCount={listingCounts.pending_review}
            totalNotifications={totalPending}
            adminName={displayName}
          />

          {/* Workspace navigation */}
          <div className="relative z-20 hidden min-h-12 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-6 sm:flex">
            <VettingTabs
              active={activeTab}
              onChange={setActiveTab}
              kycCount={kycCounts.pending}
              listingsCount={listingCounts.pending_review}
            />
          </div>

          {/* Tab switcher (mobile only) */}
          <div className="relative z-20 flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-white px-4 pt-2 sm:hidden">
            <VettingTabs
              active={activeTab}
              onChange={setActiveTab}
              kycCount={kycCounts.pending}
              listingsCount={listingCounts.pending_review}
            />
            {activeTab === 'identity' && (
              <StatusFilterDropdown
                value={kycStatusFilter}
                onChange={setKycStatusFilter}
                tabs={kycFilterTabs}
              />
            )}
          </div>

          {activeTab === 'identity' ? (
            /* ── Two-panel workspace — each panel scrolls independently ── */
            <div
              className="flex flex-1 min-h-0 gap-4 overflow-hidden bg-slate-50 p-4"
              data-testid="vetting-grid"
            >
              {/* LEFT: landlord queue — independently scrollable */}
              <div className="hidden w-[300px] shrink-0 min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white md:flex xl:w-[340px]">
                <div className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold tracking-tight text-slate-900">Identity checks</h2>
                      <p className="mt-1 text-xs text-slate-500">Review landlord applications</p>
                    </div>
                    <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {kycFiltered.length}
                    </span>
                  </div>
                  <div className="mb-3">
                    <StatusFilterDropdown
                      value={kycStatusFilter}
                      onChange={setKycStatusFilter}
                      tabs={kycFilterTabs}
                    />
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
                <ApplicantList
                  landlords={kycFiltered}
                  selectedId={selectedLandlord?.id}
                  onSelect={selectLandlord}
                  loading={kycLoading}
                  className="flex-1 min-h-0 border-0 shadow-none"
                />
              </div>

              {/* RIGHT: review workspace — sticky, independently scrollable */}
              <div className="flex-1 min-w-0 min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 md:overflow-hidden">
                {/* Mobile: back button when no landlord selected */}
                {selectedLandlord && (
                  <div className="md:hidden px-4 pt-3">
                    <button type="button" onClick={clearKycSelection}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-700">
                      <ChevronDown className="w-4 h-4 rotate-90" /> Back to queue
                    </button>
                  </div>
                )}
                <div className="min-h-full px-4 pb-6 pt-4 sm:px-6 md:flex md:h-full md:min-h-0 md:flex-col md:pb-4 md:pt-4">
                  {/* Mobile: compact queue header */}
                  <div className="mb-4 md:hidden">
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
                  <div className="hidden h-full min-h-0 md:block">
                    <ReviewWorkspace
                      landlord={selectedLandlord}
                      applicantCount={kycFiltered.length}
                      queueLoading={kycLoading}
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
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <ListingsTab
                listings={pendingListings}
                listingCounts={listingCounts}
                listingCountsError={listingCountsError}
                statusFilter={listingStatusFilter}
                onStatusFilter={setListingStatusFilter}
                loading={listingsLoading}
                error={listingsError}
                onRetry={() => void loadPendingListings()}
                processing={listingProcessing}
                onReviewDecision={reviewListing}
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
  listings, listingCounts, listingCountsError, statusFilter, onStatusFilter, loading, error, onRetry,
  processing, onReviewDecision, onReviewIdentity, kycPendingCount,
}: {
  listings: any[]
  listingCounts: Record<ListingReviewFilter, number>
  listingCountsError: string
  statusFilter: ListingReviewFilter
  onStatusFilter: (filter: ListingReviewFilter) => void
  loading: boolean
  error: string
  onRetry: () => void
  processing: string | null
  onReviewDecision: (id: string, action: ListingReviewAction, reason?: string) => Promise<void>
  onReviewIdentity: () => void
  kycPendingCount: number
}) {
  const [viewingListing, setViewingListing] = useState<any | null>(null)
  const [previewImageIndex, setPreviewImageIndex] = useState(0)
  const [reviewHistoryLoading, setReviewHistoryLoading] = useState(false)
  const [reviewHistoryError, setReviewHistoryError] = useState('')
  const [decision, setDecision] = useState<{ listing: any; action: ListingReviewAction } | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'updated'>('newest')

  const visibleListings = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const filtered = query
      ? listings.filter(listing => [
          listing.title,
          listing.address,
          listing.city,
          listing.state,
          listing.id,
          listing.landlords?.full_name,
        ].some(value => String(value ?? '').toLocaleLowerCase().includes(query)))
      : [...listings]
    return filtered.sort((a, b) => {
      const aDate = new Date(sort === 'updated' ? a.updated_at ?? a.created_at : a.created_at).getTime()
      const bDate = new Date(sort === 'updated' ? b.updated_at ?? b.created_at : b.created_at).getTime()
      return sort === 'oldest' ? aDate - bDate : bDate - aDate
    })
  }, [listings, search, sort])

  async function openListingPreview(listing: any) {
    const images: any[] = [...(listing.property_images ?? [])]
      .sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
    const coverIndex = images.findIndex(image => image.is_cover)
    setPreviewImageIndex(coverIndex >= 0 ? coverIndex : 0)
    setViewingListing({ ...listing, property_review_events: [] })
    setReviewHistoryLoading(true)
    setReviewHistoryError('')
    try {
      const { data, error } = await createClient()
        .from('property_review_events')
        .select('id, action, reason, created_at, admin_user_id, property_title')
        .eq('property_id', listing.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setViewingListing((current: any) => current?.id === listing.id
        ? { ...current, property_review_events: data ?? [] }
        : current)
    } catch (error) {
      console.error('[vetting] Could not load property review history:', error)
      setReviewHistoryError(getErrorMessage(error, 'Review history could not be loaded.'))
    } finally {
      setReviewHistoryLoading(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs font-semibold text-slate-500">Property review queue</p>
          <h3 className="mt-0.5 text-base font-semibold tracking-tight text-slate-900">
            {statusFilter === 'pending_review' ? 'Listings awaiting review' : 'Submitted properties'}
          </h3>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {listingCounts.pending_review} pending
        </span>
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:px-6">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search title, location, landlord or reference…"
            aria-label="Search property submissions"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
          />
        </label>
        <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500 sm:w-auto">
          <span className="sr-only sm:not-sr-only">Status</span>
          <select
            value={statusFilter}
            onChange={event => onStatusFilter(event.target.value as ListingReviewFilter)}
            className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15 sm:w-44 sm:flex-none"
            aria-label="Filter property submissions by status"
          >
            {LISTING_REVIEW_FILTERS.map(filter => (
              <option key={filter.value} value={filter.value}>
                {filter.label} ({listingCounts[filter.value]})
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500 sm:w-auto">
          <SlidersHorizontal className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
          <span className="sr-only sm:not-sr-only">Sort</span>
          <select
            value={sort}
            onChange={event => setSort(event.target.value as typeof sort)}
            className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15 sm:w-40 sm:flex-none"
            aria-label="Sort property submissions"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="updated">Recently updated</option>
          </select>
        </label>
        <span className="hidden whitespace-nowrap text-xs text-slate-500 lg:inline">
          {visibleListings.length} result{visibleListings.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {listingCountsError && (
          <p role="status" className="mx-auto mb-4 max-w-6xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {listingCountsError}
          </p>
        )}
        {loading ? (
          <div className="mx-auto max-w-5xl divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex animate-pulse items-center gap-3 p-3 sm:gap-4 sm:p-4">
                <div className="h-14 w-14 shrink-0 rounded-lg bg-slate-100 sm:h-16 sm:w-16" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-slate-100" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
                <div className="hidden w-28 space-y-2 md:block">
                  <div className="h-3 w-full rounded bg-slate-100" />
                  <div className="h-3 w-2/3 rounded bg-slate-100" />
                </div>
                <div className="h-8 w-16 rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mx-auto mt-8 max-w-lg rounded-xl border border-red-200 bg-white p-6 text-center">
            <AlertCircle className="mx-auto h-7 w-7 text-red-600" />
            <h4 className="mt-3 text-sm font-semibold text-slate-900">Could not load property submissions</h4>
            <p className="mt-1 break-words text-sm text-slate-500">{error}</p>
            <button type="button" onClick={onRetry} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700">
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        ) : visibleListings.length === 0 ? (
          <div className="mx-auto mt-8 max-w-lg rounded-xl border border-slate-200 bg-white px-5 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <ListChecks className="h-6 w-6" />
            </div>
            <h4 className="mt-4 text-base font-semibold text-slate-900">
              {search ? 'No matching submissions' : statusFilter === 'pending_review' ? 'No listings awaiting review' : 'No submissions in this status'}
            </h4>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
              {search ? 'Try another title, location, landlord name or reference.' : 'New landlord submissions will appear here when they are ready for review.'}
            </p>
            {!search && kycPendingCount > 0 && statusFilter === 'pending_review' && (
              <button type="button" onClick={onReviewIdentity} className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Review {kycPendingCount} identity check{kycPendingCount === 1 ? '' : 's'}
              </button>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-6xl divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {visibleListings.map((listing: any) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                processing={processing}
                onView={openListingPreview}
              />
            ))}
          </div>
        )}
      </div>
      <Dialog open={!!viewingListing} onOpenChange={open => { if (!open) setViewingListing(null) }}>
        {viewingListing && (
          <ListingPreviewDialog
            listing={viewingListing}
            imageIndex={previewImageIndex}
            historyLoading={reviewHistoryLoading}
            historyError={reviewHistoryError}
            onImageChange={setPreviewImageIndex}
            onClose={() => setViewingListing(null)}
            onDecision={action => {
              setDecision({ listing: viewingListing, action })
              setViewingListing(null)
            }}
          />
        )}
      </Dialog>
      <ReviewDecisionDialog
        decision={decision}
        processing={decision ? processing === decision.listing.id : false}
        onClose={() => setDecision(null)}
        onConfirm={reason => {
          if (!decision) return
          const currentDecision = decision
          setDecision(null)
          void onReviewDecision(currentDecision.listing.id, currentDecision.action, reason)
        }}
      />
    </div>
  )
}

function ReviewDecisionDialog({
  decision, processing, onClose, onConfirm,
}: {
  decision: { listing: any; action: ListingReviewAction } | null
  processing: boolean
  onClose: () => void
  onConfirm: (reason?: string) => void
}) {
  const [reason, setReason] = useState('')
  useEffect(() => { setReason('') }, [decision?.listing.id, decision?.action])

  const isPending = decision?.listing.status === 'pending_review'
  const reasonRequired = decision?.action !== 'approved'
  const actionLabel = decision?.action === 'approved'
    ? 'Approve listing'
    : decision?.action === 'rejected'
      ? 'Reject listing'
      : 'Request changes'

  return (
    <Dialog open={!!decision} onOpenChange={open => { if (!open && !processing) onClose() }}>
      {decision && (
        <DialogContent className="w-[calc(100%-1rem)] max-w-md rounded-xl border-slate-200 bg-white p-0 text-slate-900">
          <DialogHeader className="border-b border-slate-100 px-5 py-4 pr-12 text-left">
            <DialogTitle className="text-base font-semibold">{actionLabel}</DialogTitle>
            <DialogDescription className="text-sm leading-5 text-slate-500">
              {decision.listing.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4">
            {!isPending && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                This submission is no longer pending. Refresh the queue before making a decision.
              </p>
            )}
            <p className="text-sm leading-6 text-slate-600">
              {decision.action === 'approved'
                ? 'Confirm approval to make this listing available to property seekers.'
                : decision.action === 'rejected'
                  ? 'Provide a reason for rejection. The reason will be shared with the landlord and recorded in the review history.'
                  : 'Describe the corrections the landlord should make. The listing will return to review after resubmission.'}
            </p>
            {reasonRequired && (
              <label className="block text-sm font-medium text-slate-700">
                {decision.action === 'rejected' ? 'Rejection reason' : 'Requested changes'}
                <textarea
                  autoFocus
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  required
                  placeholder={decision.action === 'rejected' ? 'Explain why this listing cannot be approved…' : 'Describe the changes needed before approval…'}
                  className="mt-2 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
                <span className="mt-1 block text-right text-xs font-normal text-slate-400">{reason.trim().length}/2000</span>
              </label>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={processing} className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(reason.trim() || undefined)}
              disabled={processing || !isPending || (reasonRequired && !reason.trim())}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                decision.action === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirm {decision.action === 'approved' ? 'approval' : decision.action === 'rejected' ? 'rejection' : 'request'}
            </button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}

function ListingPreviewDialog({
  listing, imageIndex, historyLoading, historyError, onImageChange, onClose, onDecision,
}: {
  listing: any
  imageIndex: number
  historyLoading: boolean
  historyError: string
  onImageChange: (index: number) => void
  onClose: () => void
  onDecision: (action: ListingReviewAction) => void
}) {
  const images: any[] = [...(listing.property_images ?? [])]
    .sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
  const selectedImage = images[imageIndex] ?? images[0]
  const selectedImageUrl = selectedImage ? getSupabaseImageUrl(selectedImage.storage_path, 1200) : null
  const landlordName = listing.landlords?.full_name ?? 'Unknown landlord'
  const reviewEvents = [...(listing.property_review_events ?? [])]
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const propertyType = listing.property_type ?? 'Property'
  const details = [
    { label: 'Property type', value: propertyType, icon: Home },
    { label: 'Bedrooms', value: `${listing.bedrooms ?? '—'} ${listing.bedrooms === 1 ? 'bedroom' : 'bedrooms'}`, icon: BedDouble },
    { label: 'Bathrooms', value: `${listing.bathrooms ?? '—'} ${listing.bathrooms === 1 ? 'bathroom' : 'bathrooms'}`, icon: Bath },
    ...(listing.area_sqft ? [{ label: 'Floor area', value: `${Number(listing.area_sqft).toLocaleString()} sqft`, icon: Ruler }] : []),
    { label: 'Listing type', value: listing.type === 'sale' ? 'For sale' : listing.type === 'lease' ? 'For lease' : 'For rent', icon: Tag },
    { label: 'Submitted', value: daysAgo(listing.created_at), icon: CalendarDays },
  ]

  return (
    <DialogContent className="!flex max-h-[94dvh] w-[calc(100%-1rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 text-slate-900 sm:w-[calc(100%-2rem)]">
      <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 pr-12 text-left sm:px-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            listing.status === 'pending_review' ? 'bg-amber-50 text-amber-700'
              : listing.status === 'available' ? 'bg-emerald-50 text-emerald-700'
                : listing.status === 'rejected' ? 'bg-red-50 text-red-700'
                  : 'bg-blue-50 text-blue-700'
          }`}>
            {listing.status === 'pending_review' ? 'Pending review' : listing.status === 'available' ? 'Approved' : listing.status === 'rejected' ? 'Rejected' : 'Needs changes'}
          </span>
          <span className="text-xs text-slate-400">Submitted {daysAgo(listing.created_at)}</span>
        </div>
        <DialogTitle className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
          {listing.title}
        </DialogTitle>
        <DialogDescription className="flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin className="h-4 w-4 shrink-0" />
          {[listing.address, listing.city, listing.state].filter(Boolean).join(', ') || 'Location not provided'}
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70">
        <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
          <section aria-label="Property photos" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="relative flex aspect-[16/8] max-h-[420px] min-h-44 items-center justify-center bg-slate-100">
              {selectedImageUrl ? (
                <img src={selectedImageUrl} alt={selectedImage?.alt_text || listing.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <ImageIcon className="h-10 w-10" />
                  <span className="text-sm font-medium">No property photos provided</span>
                </div>
              )}
              {images.length > 0 && (
                <span className="absolute bottom-3 right-3 rounded-lg bg-slate-950/75 px-2.5 py-1 text-xs font-semibold text-white">
                  {imageIndex + 1} / {images.length}
                </span>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t border-slate-100 p-3">
                {images.map((image, index) => {
                  const imageUrl = getSupabaseImageUrl(image.storage_path, 200)
                  return (
                    <button
                      key={image.storage_path}
                      type="button"
                      onClick={() => onImageChange(index)}
                      aria-label={`View property photo ${index + 1}`}
                      aria-pressed={imageIndex === index}
                      className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        imageIndex === index ? 'border-blue-600' : 'border-transparent hover:border-slate-300'
                      }`}
                    >
                      <img src={imageUrl} alt={image.alt_text || `Property photo ${index + 1}`} className="h-full w-full object-cover" />
                      {image.is_cover && (
                        <span className="absolute bottom-1 left-1 rounded bg-slate-950/75 px-1.5 py-0.5 text-[9px] font-bold text-white">Cover</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Asking price</p>
                    <p className="mt-2 text-3xl font-extrabold tracking-tight text-blue-700">
                      {fmtNaira(Number(listing.price) || 0)}
                      {(listing.type === 'rent' || listing.type === 'lease') && (
                        <span className="ml-1 text-base font-semibold text-slate-500">/ yr</span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <h3 className="text-sm font-bold text-slate-900">Property details</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {details.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <h3 className="text-sm font-bold text-slate-900">Description</h3>
                {listing.description ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{listing.description}</p>
                ) : (
                  <p className="mt-3 text-sm italic text-slate-400">No description was provided.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <h3 className="text-sm font-bold text-slate-900">Amenities</h3>
                {Array.isArray(listing.amenities) && listing.amenities.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {listing.amenities.map((amenity: string) => (
                      <span key={amenity} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">{amenity}</span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm italic text-slate-400">No amenities listed.</p>
                )}
              </div>

              {listing.review_feedback && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="text-sm font-semibold text-amber-900">Review feedback</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-800">{listing.review_feedback}</p>
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Submitted by</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGrad(landlordName)} text-xs font-black text-white`}>
                    {getInitials(landlordName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{landlordName}</p>
                    <p className="mt-0.5 break-all text-xs text-slate-500">{listing.landlords?.email || listing.landlords?.whatsapp || 'Contact not provided'}</p>
                  </div>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-[11px] text-slate-500">Account reference</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-700">{listing.landlords?.id ?? listing.landlord_id ?? 'Unavailable'}</p>
                  <p className="mt-3 text-[11px] text-slate-500">Identity verification</p>
                  <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${listing.landlords?.is_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {listing.landlords?.is_verified ? 'Verified' : 'Not verified'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">Documents</h3>
                <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>Property images are shown above. No separate ownership-document records are attached to this submission.</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <History className="h-4 w-4 text-slate-500" /> Submission history
                </h3>
                {reviewEvents.length ? (
                  <ol className="mt-3 space-y-3">
                    {reviewEvents.map((event: any) => (
                      <li key={event.id} className="border-l-2 border-slate-200 pl-3">
                        <p className="text-xs font-semibold capitalize text-slate-800">{String(event.action).replaceAll('_', ' ')}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{new Date(event.created_at).toLocaleString()}</p>
                        {event.reason && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{event.reason}</p>}
                      </li>
                    ))}
                  </ol>
                ) : historyLoading ? (
                  <p className="mt-2 text-xs text-slate-500">Loading review history…</p>
                ) : historyError ? (
                  <p className="mt-2 break-words text-xs leading-5 text-amber-700">
                    Review history is unavailable. Apply the property review workflow migration to enable this feature.
                  </p>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-slate-500">This submission has not been reviewed before.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">Review checklist</h3>
                <ul className="mt-3 space-y-3 text-xs leading-relaxed text-slate-700">
                  <li className="flex gap-2"><CheckCircle className="h-4 w-4 shrink-0 text-blue-600" /> Verify listing information and location.</li>
                  <li className="flex gap-2"><CheckCircle className="h-4 w-4 shrink-0 text-blue-600" /> Review photos, price, and property details.</li>
                  <li className="flex gap-2"><CheckCircle className="h-4 w-4 shrink-0 text-blue-600" /> Confirm ownership evidence through the appropriate process.</li>
                </ul>
              </div>
            </aside>
          </section>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
        <p className="hidden text-xs text-slate-500 sm:block">Review the submitted information before making a decision.</p>
        <div className="ml-auto flex w-full flex-wrap justify-end gap-2 sm:w-auto">
          <button type="button" onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            Close preview
          </button>
          {listing.status === 'pending_review' && (
            <>
              <button type="button" onClick={() => onDecision('changes_requested')}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                Request changes
              </button>
              <button type="button" onClick={() => onDecision('rejected')}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                <XCircle className="h-4 w-4" /> Reject
              </button>
              <button type="button" onClick={() => onDecision('approved')}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <CheckCircle className="h-4 w-4" /> Approve
              </button>
            </>
          )}
        </div>
      </div>
    </DialogContent>
  )
}

function ListingCard({
  listing, processing, onView,
}: {
  listing: any
  processing: string | null
  onView: (listing: any) => void
}) {
  const busy = processing !== null
  const images: any[] = listing.property_images ?? []
  const cover = images.find((image: any) => image.is_cover)
    ?? [...images].sort((a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99))[0]
  const coverUrl = cover ? getSupabaseImageUrl(cover.storage_path, 200) : null
  const landlordName = listing.landlords?.full_name ?? 'Unknown landlord'
  const address = [listing.address, listing.city, listing.state].filter(Boolean).join(', ')
  const statusLabel = listing.status === 'pending_review' ? 'Pending'
    : listing.status === 'available' ? 'Approved'
      : listing.status === 'rejected' ? 'Rejected' : 'Needs changes'
  const statusClass = listing.status === 'pending_review' ? 'bg-amber-50 text-amber-700'
    : listing.status === 'available' ? 'bg-emerald-50 text-emerald-700'
      : listing.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'

  return (
    <article className="grid min-w-0 grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 p-3 transition-colors hover:bg-slate-50/70 sm:gap-4 sm:p-4 md:grid-cols-[64px_minmax(0,1.8fr)_minmax(130px,1fr)_minmax(112px,auto)_88px]">
      <div className="h-14 w-14 overflow-hidden rounded-lg bg-slate-100 sm:h-16 sm:w-16">
        {coverUrl
          ? <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          : <div className="flex h-full w-full items-center justify-center text-slate-400"><Building2 className="h-6 w-6" /></div>}
      </div>
      <button
        type="button"
        onClick={() => onView(listing)}
        aria-label={`Review ${listing.title}`}
        className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900">{listing.title || 'Untitled property'}</span>
          <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-flex ${statusClass}`}>{statusLabel}</span>
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{address || 'Location not provided'}</span>
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-slate-500 md:hidden">
          <span className="truncate">{landlordName}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{daysAgo(listing.created_at)}</span>
        </span>
      </button>
      <div className="hidden min-w-0 md:block">
        <p className="truncate text-xs font-medium text-slate-700">{landlordName}</p>
        <p className="mt-1 text-[11px] text-slate-500">Submitted {daysAgo(listing.created_at)}</p>
      </div>
      <div className="hidden min-w-0 text-right md:block">
        <p className="whitespace-nowrap text-sm font-semibold text-slate-900">{fmtNaira(Number(listing.price) || 0)}</p>
        <p className="mt-1 text-[11px] text-slate-500">{listing.type === 'sale' ? 'For sale' : 'For rent'}</p>
      </div>
      <button
        type="button"
        onClick={() => onView(listing)}
        disabled={busy}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 sm:px-3"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">Review</span>
      </button>
      <span className={`col-start-2 row-start-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold sm:hidden ${statusClass}`}>
        {statusLabel} · {fmtNaira(Number(listing.price) || 0)}
      </span>
    </article>
  )
}

const vettingStyles = `
.lv-vetting{height:100vh;height:100dvh;color-scheme:light}
.lv-vetting-content{background:#f8fafc}
.lv-vetting-content input,.lv-vetting-content select,.lv-vetting-content textarea{color:#101828;background-color:#fff;border-color:#e5e7eb;border-radius:8px;min-height:40px}
.lv-vetting-content input::placeholder,.lv-vetting-content textarea::placeholder{color:#64748b;opacity:1}
.lv-vetting-content input:focus,.lv-vetting-content select:focus,.lv-vetting-content textarea:focus{outline:2px solid #2563eb;outline-offset:2px}
.lv-vetting-content button:focus-visible{outline:2px solid #2563eb;outline-offset:3px}
.lv-vetting-content .text-slate-400{color:#64748b}
.lv-vetting-content [data-testid="vetting-grid"]{isolation:isolate}
.lv-vetting-content .overflow-y-auto{overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#cbd5e1 transparent}
@media(max-width:767px){.lv-vetting-content input,.lv-vetting-content select,.lv-vetting-content textarea{font-size:16px}.lv-vetting-content{padding-bottom:env(safe-area-inset-bottom)}}
@media(prefers-reduced-motion:reduce){.lv-vetting-content *{transition:none!important;animation:none!important}}
`