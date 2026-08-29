import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  CheckCircle, Clock,
  Loader2, Users, Building2,
  BedDouble, Bath, MapPin, DollarSign, ListChecks,
  Trash2, ChevronDown,
} from 'lucide-react'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AuthGuard from '../../components/auth/AuthGuard'
import { MobileSidebarProvider, MobilePageHeader, MobileStatGrid, MobileStatCard, MobileEmptyState } from '@/components/ui/mobile-admin'
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
        <div className="vetting-page flex min-h-[100dvh] h-screen overflow-hidden bg-slate-50 text-slate-900">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
          <VettingHeader
            kycPendingCount={kycCounts.pending}
            listingsPendingCount={pendingListings.length}
            totalNotifications={totalPending}
            onSearch={setKycSearch}
            adminName={displayName}
          />

          {/* Mobile: legacy stat grid (kept compact, fits below header) */}
          <div className="sm:hidden px-3 pt-3">
            <MobileStatGrid>
               <MobileStatCard label="KYC pending"     value={kycCounts.pending}      color="#C8102E" icon={Clock} />
               <MobileStatCard label="KYC approved"    value={kycCounts.approved}     color="#16a34a" icon={CheckCircle} />
               <MobileStatCard label="Listings pending" value={pendingListings.length} color="#7c3aed" icon={ListChecks} />
               <MobileStatCard label="Landlords"       value={kycCounts.all}          color="#1e40af" icon={Users} />
            </MobileStatGrid>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6 sm:pt-4">
            <div className="space-y-4 pt-3 sm:pt-0">
              <VettingTabs
                active={activeTab}
                onChange={setActiveTab}
                kycCount={kycCounts.pending}
                listingsCount={pendingListings.length}
              />

              {activeTab === 'identity' ? (
                <div
                  className="grid min-h-[520px] grid-cols-1 gap-4 lg:min-h-[calc(100vh-12rem)] lg:grid-cols-[minmax(0,35%)_minmax(0,65%)]"
                  data-testid="vetting-grid"
                >
                  <ApplicantList
                    landlords={kycFiltered}
                    selectedId={selectedLandlord?.id}
                    onSelect={selectLandlord}
                    loading={kycLoading}
                    toolbar={
                      <VettingToolbar
                        search={kycSearch}
                        onSearch={setKycSearch}
                        statusFilter={kycStatusFilter}
                        onStatusFilter={setKycStatusFilter}
                        filterTabs={kycFilterTabs as any}
                        sort={sortOrder}
                        onSort={setSortOrder}
                        resultCount={kycFiltered.length}
                      />
                    }
                  />
                  <ReviewWorkspace
                    landlord={selectedLandlord}
                    kycDocs={kycDocs}
                    docsLoading={docsLoading}
                    processing={kycProcessing}
                    imgErrors={imgErrors}
                    onImgError={(k: string) => setImgErrors(prev => ({ ...prev, [k]: true }))}
                    onClose={clearKycSelection}
                    onUpdateStatus={updateKycStatus}
                  />
                </div>
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
        </div>

        {/* Mobile full-screen review */}
        {selectedLandlord && (
          <div className="md:hidden">
            <MobileReviewScreen
              landlord={selectedLandlord}
              kycDocs={kycDocs}
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

// ── Status filter dropdown (legacy) ───────────────────────────────────────────

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

// ── Listing Approvals tab (unchanged from previous design) ────────────────────

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
    <div className="flex flex-1 min-h-0 overflow-hidden flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="shrink-0 flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-6 sm:py-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Property review</p>
          <h3 className="mt-1 text-base font-bold tracking-tight text-slate-900">
            {loading ? 'Loading…' : listings.length === 0
              ? 'All listings approved'
              : `${listings.length} listing${listings.length !== 1 ? 's' : ''} awaiting review`}
          </h3>
        </div>
        {listings.length > 0 && (
          <div className="inline-flex items-center gap-2 text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-4 py-2 font-semibold shrink-0">
             <span className="w-2 h-2 rounded-full bg-[#C8102E] animate-pulse" />
            {listings.length} pending
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 sm:py-24 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Loading pending listings…</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-200 mx-auto">
              <ListChecks className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-600">All caught up!</p>
            <p className="mt-1 text-xs text-slate-400">No listing submissions waiting for review.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      <div className="relative h-32 overflow-hidden bg-slate-100 sm:h-44">
        {coverUrl ? (
          <img src={coverUrl} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-10 h-10 text-slate-300" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
             listing.type === 'sale' ? 'bg-[#C8102E] text-white' : 'bg-slate-800 text-white'
          }`}>
            {listing.type === 'sale' ? 'For Sale' : 'For Rent'}
          </span>
        </div>
        <div className="absolute top-3 right-3">
             <span className="text-[11px] font-bold text-slate-600 bg-white/90 border border-slate-200 rounded-full px-2.5 py-1 backdrop-blur-sm shadow-sm">
            {daysAgo(listing.created_at)}
          </span>
        </div>
      </div>

      <div className="flex-1 p-4">
         <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">{listing.title}</h4>

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
           <p className="text-lg font-black text-slate-900">{fmtNaira(listing.price)}</p>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {listing.type === 'rent' ? '/yr' : 'outright'}
          </div>
        </div>

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
           <span className="ml-auto shrink-0 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">Submitted</span>
        </div>
      </div>

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
                 className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
               <button
                onClick={() => confirm?.action === 'approve' ? onApprove(listing.id) : onReject(listing.id)}
                disabled={busy}
                 className={`flex-1 rounded-xl py-2 text-xs font-bold text-white transition-colors disabled:opacity-60 ${
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
               className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold transition-colors disabled:opacity-60 shadow-sm">
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
