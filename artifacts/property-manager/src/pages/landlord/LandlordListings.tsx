import { useEffect, useMemo, useState } from 'react'
import { Link } from '@/lib/navigation'
import {
  AlertCircle, ArrowDownUp, Bath, BedDouble, Building2, ChevronDown,
  Eye, History, ImagePlus, LayoutGrid, List, MapPin, MoreHorizontal,
  Pencil, Plus, Search, Trash2,
} from 'lucide-react'
import LandlordSidebar from '../../components/layout/LandlordSidebar'
import AuthGuard from '../../components/auth/AuthGuard'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient, getSupabaseImageUrl } from '../../lib/supabase'
import type { Property, PropertyImage, Landlord } from '@/types'

type Listing = Property & { property_images?: PropertyImage[] }

const AVAILABILITY: Record<string, { label: string; tone: string }> = {
  available: { label: 'Available', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10' },
  taken: { label: 'Taken', tone: 'bg-slate-100 text-slate-700 ring-slate-500/10' },
  coming_soon: { label: 'Coming Soon', tone: 'bg-blue-50 text-blue-700 ring-blue-600/10' },
  under_negotiation: { label: 'Negotiating', tone: 'bg-amber-50 text-amber-700 ring-amber-600/10' },
  sold: { label: 'Sold', tone: 'bg-slate-100 text-slate-700 ring-slate-500/10' },
}

const MODERATION: Record<string, { label: string; tone: string }> = {
  pending_review: { label: 'Pending Review', tone: 'bg-amber-50 text-amber-700 ring-amber-600/10' },
  changes_requested: { label: 'Changes Requested', tone: 'bg-blue-50 text-blue-700 ring-blue-600/10' },
  rejected: { label: 'Rejected', tone: 'bg-red-50 text-red-700 ring-red-600/10' },
  approved: { label: 'Approved', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10' },
}

const LISTING_TYPES: Record<string, string> = {
  rent: 'For Rent',
  sale: 'For Sale',
  lease: 'Lease',
  commercial: 'Commercial',
}

type PropertyReviewEvent = {
  property_id: string | null
  action: 'approved' | 'rejected' | 'changes_requested' | 'review_started' | 'resubmitted'
  reason: string | null
  created_at: string
}

const REVIEW_EVENT_LABEL: Record<PropertyReviewEvent['action'], string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes requested',
  review_started: 'Admin started review',
  resubmitted: 'Listing resubmitted',
}

function formatPrice(price: number) {
  return `₦${Number(price).toLocaleString('en-NG')}`
}

function getModeration(status: string) {
  return MODERATION[status] ?? MODERATION.approved
}

function ListingBadges({ property }: { property: Listing }) {
  const availability = AVAILABILITY[property.status]
  const moderation = getModeration(property.status)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {availability && <StatusBadge label={availability.label} tone={availability.tone} />}
      <StatusBadge label={moderation.label} tone={moderation.tone} />
    </div>
  )
}

function StatusBadge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ring-1 ring-inset ${tone}`}>
      {label}
    </span>
  )
}

export default function LandlordListings() {
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [properties, setProperties] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [viewModeReady, setViewModeReady] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [reviewEvents, setReviewEvents] = useState<PropertyReviewEvent[]>([])
  const [reviewTimelineError, setReviewTimelineError] = useState('')

  useEffect(() => {
    try {
      const savedView = window.localStorage.getItem('landlord-listings-view')
      if (savedView === 'grid' || savedView === 'list') setViewMode(savedView)
    } catch (error) {
      console.error('[landlord-listings] Could not restore view preference:', error)
    }
    setViewModeReady(true)
    void load()
  }, [])

  useEffect(() => {
    if (!viewModeReady) return
    try {
      window.localStorage.setItem('landlord-listings-view', viewMode)
    } catch (error) {
      console.error('[landlord-listings] Could not save view preference:', error)
    }
  }, [viewMode, viewModeReady])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return properties
      .filter(property => {
        const matchesSearch = !query || [
          property.title,
          property.city,
          property.address,
        ].some(value => (value ?? '').toLocaleLowerCase().includes(query))
        const matchesStatus = statusFilter === 'all'
          || (statusFilter === 'approved'
            ? ['available', 'taken', 'coming_soon', 'under_negotiation', 'sold'].includes(property.status)
            : property.status === statusFilter)
        const matchesType = typeFilter === 'all' || property.type === typeFilter
        return matchesSearch && matchesStatus && matchesType
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') return a.created_at.localeCompare(b.created_at)
        if (sortBy === 'price-low') return Number(a.price) - Number(b.price)
        if (sortBy === 'price-high') return Number(b.price) - Number(a.price)
        return b.created_at.localeCompare(a.created_at)
      })
  }, [properties, search, statusFilter, typeFilter, sortBy])

  async function load() {
    setLoading(true)
    setLoadError('')
    const supabase = createClient()
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('[landlord-listings] Could not verify the current user:', authError)
        setLoadError('Your listings could not be loaded. Please try again.')
        return
      }
      if (!authData.user) {
        setLoadError('Your session could not be verified. Please sign in again.')
        return
      }
      setUser({ email: authData.user.email })

      const { data: landlordData, error: landlordError } = await supabase
        .from('landlords')
        .select('*')
        .eq('user_id', authData.user.id)
        .single() as { data: Landlord | null; error: Error | null }
      if (landlordError) {
        console.error('[landlord-listings] Could not load landlord profile:', landlordError)
        setLoadError('Your landlord profile could not be loaded. Please try again.')
        return
      }
      setLandlord(landlordData)
      if (!landlordData) {
        setProperties([])
        return
      }

      const { data: listingData, error: listingError } = await supabase
        .from('properties')
        .select('*, property_images(id, property_id, storage_path, alt_text, is_cover, sort_order, created_at)')
        .eq('landlord_id', landlordData.id)
        .order('created_at', { ascending: false }) as unknown as {
          data: Listing[] | null
          error: Error | null
        }
      if (listingError) {
        console.error('[landlord-listings] Could not load listings:', listingError)
        setLoadError('Your listings could not be loaded. Please try again.')
        return
      }

      const listings = listingData ?? []
      setProperties(listings)
      const propertyIds = listings.map(property => property.id)
      if (!propertyIds.length) {
        setReviewTimelineError('')
        setReviewEvents([])
        return
      }

      const { data: events, error: eventsError } = await supabase
        .from('property_review_events')
        .select('property_id, action, reason, created_at')
        .in('property_id', propertyIds)
        .order('created_at', { ascending: true })
      if (eventsError) {
        console.error('[landlord-listings] Could not load review timeline:', eventsError)
        setReviewTimelineError('Review timeline is unavailable right now. Please refresh to try again.')
        setReviewEvents([])
      } else {
        setReviewTimelineError('')
        setReviewEvents((events ?? []) as PropertyReviewEvent[])
      }
    } catch (error) {
      console.error('[landlord-listings] Unexpected loading error:', error)
      setLoadError('Your listings could not be loaded. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !landlord) return
    const id = deleteTarget.id
    setDeleting(id)
    setActionError('')
    const supabase = createClient()

    const { data: property, error: ownershipError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', id)
      .eq('landlord_id', landlord.id)
      .single()
    if (ownershipError || !property) {
      if (ownershipError) console.error('[landlord-listings] Could not verify listing ownership:', ownershipError)
      setActionError('This listing could not be verified and was not deleted. Please refresh and try again.')
      setDeleting(null)
      setDeleteTarget(null)
      return
    }

    const { error: imageDeleteError } = await supabase.from('property_images').delete().eq('property_id', id)
    if (imageDeleteError) {
      console.error('[landlord-listings] Could not delete listing images:', imageDeleteError)
      setActionError('The listing images could not be deleted. Please try again.')
      setDeleting(null)
      setDeleteTarget(null)
      return
    }
    const { error: propertyDeleteError } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)
      .eq('landlord_id', landlord.id)
    if (propertyDeleteError) {
      console.error('[landlord-listings] Could not delete listing:', propertyDeleteError)
      setActionError('The listing could not be deleted. Please try again.')
      setDeleting(null)
      setDeleteTarget(null)
      return
    }

    setProperties(current => current.filter(item => item.id !== id))
    setReviewEvents(current => current.filter(event => event.property_id !== id))
    setDeleteTarget(null)
    setDeleting(null)
  }

  function getCover(property: Listing) {
    const images = property.property_images ?? []
    const cover = images.find(image => image.is_cover) ?? images[0]
    return cover ? getSupabaseImageUrl(cover.storage_path) : null
  }

  function getEvents(property: Listing) {
    return reviewEvents.filter(event => event.property_id === property.id)
  }

  return (
    <AuthGuard require="landlord">
      <div className="flex h-dvh overflow-hidden bg-slate-50">
        <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} isVerified={landlord?.is_verified} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white py-3 pl-14 pr-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-2xl">My Listings</h1>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                {properties.length} {properties.length === 1 ? 'property' : 'properties'} in your portfolio
              </p>
            </div>
            <Link
              href="/landlord/listings/new"
              aria-label="Add listing"
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-4"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add Listing</span>
            </Link>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-8">
            <div className="mx-auto max-w-[1600px] space-y-4">
              <section aria-label="Listing filters" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                  <label className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <input
                      aria-label="Search listings by title, location or city"
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      placeholder="Search title, location or city"
                      className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:shrink-0">
                    <FilterSelect ariaLabel="Filter by property status" value={statusFilter} onChange={setStatusFilter}>
                      <option value="all">All statuses</option>
                      <optgroup label="Availability">
                        <option value="available">Available</option>
                        <option value="taken">Taken</option>
                        <option value="coming_soon">Coming Soon</option>
                        <option value="sold">Sold</option>
                        <option value="under_negotiation">Negotiating</option>
                      </optgroup>
                      <optgroup label="Moderation">
                        <option value="approved">Approved</option>
                        <option value="pending_review">Pending Review</option>
                        <option value="rejected">Rejected</option>
                        <option value="changes_requested">Changes Requested</option>
                      </optgroup>
                    </FilterSelect>
                    <FilterSelect ariaLabel="Filter by listing type" value={typeFilter} onChange={setTypeFilter}>
                      <option value="all">All types</option>
                      <option value="rent">For Rent</option>
                      <option value="sale">For Sale</option>
                      <option value="lease">Lease</option>
                      <option value="commercial">Commercial</option>
                    </FilterSelect>
                    <FilterSelect
                      ariaLabel="Sort listings"
                      value={sortBy}
                      onChange={setSortBy}
                      className="col-span-2 sm:col-span-1"
                      icon={<ArrowDownUp className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
                    >
                      <option value="newest">Recently Added</option>
                      <option value="oldest">Oldest</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                    </FilterSelect>
                  </div>

                  <div className="flex h-10 items-center justify-end rounded-xl border border-slate-200 bg-slate-50 p-1 lg:ml-auto">
                    <button
                      type="button"
                      aria-label="Grid view"
                      aria-pressed={viewMode === 'grid'}
                      onClick={() => setViewMode('grid')}
                      className={`flex h-8 w-9 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${viewMode === 'grid' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="List view"
                      aria-pressed={viewMode === 'list'}
                      onClick={() => setViewMode('list')}
                      className={`flex h-8 w-9 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${viewMode === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <List className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </section>

              {actionError && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="flex items-center justify-between px-0.5">
                <p className="text-sm text-slate-500" aria-live="polite">
                  <span className="font-semibold text-slate-800">{filtered.length}</span>
                  {' '}{filtered.length === 1 ? 'listing' : 'listings'}
                  {(search || statusFilter !== 'all' || typeFilter !== 'all') && <span> matching your filters</span>}
                </p>
                <span className="hidden text-xs text-slate-400 sm:inline">Manage your property portfolio</span>
              </div>

              {loading ? (
                <div
                  aria-label="Loading listings"
                  aria-busy="true"
                  className={viewMode === 'grid'
                    ? 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3'
                    : 'space-y-3'}
                >
                  {Array.from({ length: 6 }, (_, index) => (
                    <ListingSkeleton key={index} viewMode={viewMode} />
                  ))}
                </div>
              ) : loadError ? (
                <div role="alert" className="rounded-2xl border border-red-200 bg-white px-5 py-10 text-center shadow-sm">
                  <AlertCircle className="mx-auto mb-3 h-9 w-9 text-red-500" aria-hidden="true" />
                  <h2 className="font-semibold text-slate-900">We couldn’t load your listings</h2>
                  <p className="mt-1 text-sm text-slate-500">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => void load()}
                    className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    Try again
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm sm:py-16">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    {properties.length === 0 ? <Building2 className="h-6 w-6" /> : <Search className="h-6 w-6" />}
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {properties.length === 0 ? 'No listings yet' : 'No listings match your filters'}
                  </h2>
                  <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
                    {properties.length === 0
                      ? 'Add your first property to start managing your portfolio.'
                      : 'Try a different search or clear one or more filters.'}
                  </p>
                  {properties.length === 0 ? (
                    <Link
                      href="/landlord/listings/new"
                      className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" /> Add your first listing
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all') }}
                      className="mt-5 rounded-lg px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3 transition-all">
                  {filtered.map(property => (
                    <article
                      key={property.id}
                      className="group min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="relative aspect-[16/10] max-h-[180px] overflow-hidden bg-slate-100">
                        {getCover(property) ? (
                          <img
                            src={getCover(property) ?? undefined}
                            alt={property.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-slate-400">
                            <ImagePlus className="h-7 w-7" aria-hidden="true" />
                            <span className="text-xs font-medium">No property photo</span>
                          </div>
                        )}
                        <span className="absolute left-2.5 top-2.5 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-semibold text-slate-800 shadow-sm backdrop-blur">
                          {LISTING_TYPES[property.type] ?? property.type}
                        </span>
                      </div>

                      <div className="p-3">
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/listings/${property.id}`}
                              className="line-clamp-1 text-[15px] font-semibold leading-5 text-slate-900 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              {property.title}
                            </Link>
                            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[13px] text-slate-500">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                              <span className="truncate">{property.city || property.address}</span>
                            </p>
                          </div>
                          <p className="shrink-0 pt-0.5 text-[13px] font-bold text-slate-900">
                            {formatPrice(property.price)}
                          </p>
                        </div>

                        <div className="mt-2 flex min-h-6 items-center gap-3 text-[11px] text-slate-500">
                          {property.bedrooms != null && (
                            <span className="inline-flex items-center gap-1.5">
                              <BedDouble className="h-4 w-4 text-slate-400" aria-hidden="true" />
                              {property.bedrooms} {property.bedrooms === 1 ? 'bed' : 'beds'}
                            </span>
                          )}
                          {property.bathrooms != null && (
                            <span className="inline-flex items-center gap-1.5">
                              <Bath className="h-4 w-4 text-slate-400" aria-hidden="true" />
                              {property.bathrooms} {property.bathrooms === 1 ? 'bath' : 'baths'}
                            </span>
                          )}
                        </div>

                        {property.review_feedback && (
                          <p title={property.review_feedback} className="mt-2 line-clamp-1 text-xs text-amber-700">
                            Feedback: {property.review_feedback}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100 pt-2">
                          <ListingBadges property={property} />
                          <ListingActions
                            property={property}
                            deleting={deleting === property.id}
                            onDelete={() => setDeleteTarget(property)}
                            className="ml-auto"
                          />
                        </div>
                        <ReviewTimeline
                          property={property}
                          events={getEvents(property)}
                          error={reviewTimelineError}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5 transition-all">
                  {filtered.map(property => (
                    <article
                      key={property.id}
                      className="flex min-w-0 flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:items-center sm:gap-4 sm:p-3.5"
                    >
                      <Link
                        href={`/listings/${property.id}`}
                        aria-label={`View ${property.title}`}
                        className="relative h-[72px] w-[100px] shrink-0 overflow-hidden rounded-xl bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-[82px] sm:w-[132px]"
                      >
                        {getCover(property) ? (
                          <img src={getCover(property) ?? undefined} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full items-center justify-center text-slate-400">
                            <Building2 className="h-6 w-6" aria-hidden="true" />
                          </span>
                        )}
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Link
                              href={`/listings/${property.id}`}
                              className="line-clamp-1 text-[15px] font-semibold text-slate-900 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              {property.title}
                            </Link>
                            <span className="text-[11px] font-medium text-slate-400">
                              {LISTING_TYPES[property.type] ?? property.type}
                            </span>
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                            <span className="truncate">{property.city || property.address}</span>
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            {property.bedrooms != null && <span>{property.bedrooms} beds</span>}
                            {property.bathrooms != null && <span>{property.bathrooms} baths</span>}
                            <span className="font-semibold text-slate-900">{formatPrice(property.price)}</span>
                            <ListingBadges property={property} />
                          </div>
                          <ReviewTimeline
                            property={property}
                            events={getEvents(property)}
                            error={reviewTimelineError}
                          />
                        </div>
                        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 pt-2 sm:justify-end sm:border-0 sm:pt-0">
                          <ListingActions
                            property={property}
                            deleting={deleting === property.id}
                            onDelete={() => setDeleteTarget(property)}
                          />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open && !deleting) setDeleteTarget(null) }}>
        <AlertDialogContent className="max-w-md rounded-2xl border-slate-200 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              “{deleteTarget?.title}” and its listing photos will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={!!deleting} className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!deleting}
              onClick={event => { event.preventDefault(); void handleDelete() }}
              className="rounded-xl bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
            >
              {deleting ? 'Deleting…' : 'Delete listing'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthGuard>
  )
}

function FilterSelect({
  ariaLabel, value, onChange, children, className = '', icon,
}: {
  ariaLabel: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
}) {
  return (
    <div className={`relative ${className}`}>
      {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={event => onChange(event.target.value)}
        className={`h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-600 outline-none transition hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:min-w-[132px] sm:text-[13px] ${icon ? 'pl-9' : ''}`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
    </div>
  )
}

function ListingActions({
  property, deleting, onDelete, className = '',
}: {
  property: Listing
  deleting: boolean
  onDelete: () => void
  className?: string
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Link
        href={`/listings/${property.id}`}
        aria-label={`View ${property.title}`}
        title="View details"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Eye className="h-4 w-4" aria-hidden="true" />
      </Link>
      <Link
        href={`/landlord/listings/${property.id}/edit`}
        aria-label={`Edit ${property.title}`}
        title="Edit listing"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`More options for ${property.title}`}
            title="More options"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 rounded-xl border-slate-200 bg-white shadow-lg">
          <DropdownMenuItem
            disabled={deleting}
            onSelect={event => { event.preventDefault(); onDelete() }}
            className="cursor-pointer rounded-lg text-red-600 focus:bg-red-50 focus:text-red-700"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete listing
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function ListingSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <div className="flex animate-pulse items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="h-[76px] w-[120px] shrink-0 rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-slate-100" />
          <div className="h-3 w-1/4 rounded bg-slate-100" />
          <div className="h-3 w-1/5 rounded bg-slate-100" />
        </div>
      </div>
    )
  }
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="aspect-[16/10] bg-slate-100" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 rounded bg-slate-100" />
        <div className="h-3 w-1/2 rounded bg-slate-100" />
        <div className="h-3 w-1/3 rounded bg-slate-100" />
      </div>
    </div>
  )
}

function ReviewTimeline({
  property, events, error,
}: {
  property: Listing
  events: PropertyReviewEvent[]
  error: string
}) {
  return (
    <details className="group mt-2.5 min-w-0">
      <summary className="flex min-h-8 w-fit max-w-full cursor-pointer list-none items-center gap-1.5 rounded-md text-xs font-medium text-slate-500 marker:hidden transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <History className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
        <span className="truncate">{error ? 'Review history unavailable' : 'Review history'}</span>
        <span className="shrink-0 text-[10px] text-slate-400">· {events.length + 1}</span>
      </summary>
      <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-3">
        {error ? (
          <p className="text-xs leading-5 text-amber-700">{error}</p>
        ) : (
          <ol className="space-y-3">
            <li className="relative border-l border-slate-200 pl-3">
              <span className="absolute -left-[4px] top-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
              <p className="text-[11px] font-semibold text-slate-700">Listing submitted</p>
              <time className="mt-0.5 block text-[10px] text-slate-400" dateTime={property.created_at}>
                {new Date(property.created_at).toLocaleString()}
              </time>
            </li>
            {events.map((event, index) => (
              <li key={`${event.property_id}-${event.action}-${event.created_at}-${index}`} className="relative border-l border-slate-200 pl-3 last:border-transparent">
                <span className={`absolute -left-[4px] top-1 h-1.5 w-1.5 rounded-full ${index === events.length - 1 ? 'bg-blue-500' : 'bg-slate-300'}`} />
                <p className="text-[11px] font-semibold text-slate-700">{REVIEW_EVENT_LABEL[event.action]}</p>
                <time className="mt-0.5 block text-[10px] text-slate-400" dateTime={event.created_at}>
                  {new Date(event.created_at).toLocaleString()}
                </time>
                {event.reason && (
                  <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-4 text-slate-600">{event.reason}</p>
                )}
              </li>
            ))}
            {property.status === 'pending_review' && (
              <li className="relative border-l border-transparent pl-3">
                <span className="absolute -left-[4px] top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                <p className="text-[11px] font-semibold text-amber-700">
                  {events[events.length - 1]?.action === 'review_started' ? 'Admin review in progress' : 'Awaiting admin review'}
                </p>
              </li>
            )}
          </ol>
        )}
      </div>
    </details>
  )
}
