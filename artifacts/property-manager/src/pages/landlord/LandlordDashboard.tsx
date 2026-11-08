import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from '@/lib/navigation'
import {
  Activity, AlertCircle, ArrowRight, BedDouble, Building2, Bath,
  CheckCircle2, Clock3, Eye, FilePenLine, ImagePlus, MapPin, MessageSquare,
  Plus, ShieldAlert, TrendingUp,
} from 'lucide-react'
import LandlordSidebar from '../../components/layout/LandlordSidebar'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient, getSupabaseImageUrl } from '../../lib/supabase'
import { getListingSettings, type ListingSettings } from '../../lib/platform-settings'
import type { Landlord } from '@/types'

type PropertySummary = {
  id: string
  title: string
  status: string
  city: string | null
  address: string | null
  price: number | null
  type: string | null
  bedrooms: number | null
  bathrooms: number | null
  description: string | null
  created_at: string
  updated_at: string
  property_images?: { storage_path: string; is_cover: boolean; sort_order: number }[]
}

type ReviewEvent = {
  id: string
  property_id: string | null
  property_title: string
  action: 'approved' | 'rejected' | 'changes_requested' | 'review_started' | 'resubmitted'
  reason: string | null
  created_at: string
}

type SupportTicketSummary = {
  id: string
  subject: string
  status: string
  created_at: string
  updated_at: string
}

type AdminMessageSummary = {
  id: string
  ticket_id: string
  body: string
  sender_role: 'admin'
  created_at: string
}

type DashboardActivity = {
  id: string
  label: string
  detail: string
  created_at: string
  href: string
  kind: 'submitted' | 'approved' | 'rejected' | 'review' | 'updated' | 'admin'
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  available: { label: 'Available', className: 'bg-emerald-50 text-emerald-700' },
  taken: { label: 'Taken', className: 'bg-slate-100 text-slate-600' },
  pending_review: { label: 'Pending review', className: 'bg-amber-50 text-amber-700' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
  changes_requested: { label: 'Changes requested', className: 'bg-blue-50 text-blue-700' },
  coming_soon: { label: 'Coming soon', className: 'bg-sky-50 text-sky-700' },
  under_negotiation: { label: 'Negotiating', className: 'bg-amber-50 text-amber-700' },
  sold: { label: 'Sold', className: 'bg-slate-100 text-slate-600' },
}

function timeAgo(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function LandlordDashboard() {
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [userEmail, setUserEmail] = useState<string>()
  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [reviewEvents, setReviewEvents] = useState<ReviewEvent[]>([])
  const [supportTickets, setSupportTickets] = useState<SupportTicketSummary[]>([])
  const [adminMessages, setAdminMessages] = useState<AdminMessageSummary[]>([])
  const [listingRules, setListingRules] = useState<ListingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error('Your session could not be verified. Please sign in again.')
      setUserEmail(user.email ?? undefined)

      const { data: landlordRow, error: landlordError } = await supabase
        .from('landlords')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (landlordError) throw landlordError
      if (!landlordRow) throw new Error('Your landlord profile could not be found.')
      setLandlord(landlordRow as Landlord)

      const landlordId = landlordRow.id
      const [propertiesResult, ticketsResult, rules] = await Promise.all([
        supabase.from('properties')
          .select('id, title, status, city, address, price, type, bedrooms, bathrooms, description, created_at, updated_at, property_images(storage_path, is_cover, sort_order)')
          .eq('landlord_id', landlordId)
          .order('created_at', { ascending: false }),
        supabase.from('support_tickets')
          .select('id, subject, status, created_at, updated_at')
          .eq('landlord_id', landlordId)
          .order('updated_at', { ascending: false })
          .limit(20),
        getListingSettings(),
      ])
      if (propertiesResult.error) throw propertiesResult.error
      if (ticketsResult.error) throw ticketsResult.error

      const propertyRows = (propertiesResult.data ?? []) as PropertySummary[]
      const ticketRows = (ticketsResult.data ?? []) as SupportTicketSummary[]
      setProperties(propertyRows)
      setSupportTickets(ticketRows)
      setListingRules(rules)

      const propertyIds = propertyRows.map(property => property.id)
      const ticketIds = ticketRows.map(ticket => ticket.id)
      const [reviewsResult, adminMessagesResult] = await Promise.all([
        propertyIds.length
          ? supabase.from('property_review_events')
            .select('id, property_id, property_title, action, reason, created_at')
            .in('property_id', propertyIds)
            .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        ticketIds.length
          ? supabase.from('support_messages')
            .select('id, ticket_id, body, sender_role, created_at')
            .in('ticket_id', ticketIds)
            .eq('sender_role', 'admin')
            .order('created_at', { ascending: false })
            .limit(10)
          : Promise.resolve({ data: [], error: null }),
      ])
      if (reviewsResult.error) throw reviewsResult.error
      if (adminMessagesResult.error) throw adminMessagesResult.error
      setReviewEvents((reviewsResult.data ?? []) as ReviewEvent[])
      setAdminMessages((adminMessagesResult.data ?? []) as AdminMessageSummary[])
    } catch (error) {
      console.error('[landlord-dashboard] Failed to load dashboard:', error)
      setLoadError(error instanceof Error ? error.message : 'Could not load your dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadDashboard() }, [loadDashboard])

  const counts = useMemo(() => ({
    total: properties.length,
    available: properties.filter(property => property.status === 'available').length,
    underReview: properties.filter(property => property.status === 'pending_review').length,
    taken: properties.filter(property => property.status === 'taken').length,
  }), [properties])

  const approvedProperties = useMemo(
    () => properties.filter(property => ['available', 'taken', 'coming_soon', 'under_negotiation', 'sold'].includes(property.status)),
    [properties],
  )
  const occupancyInventory = counts.available + counts.taken
  const occupancy = occupancyInventory > 0 ? Math.round((counts.taken / occupancyInventory) * 100) : null

  const incompleteProperties = useMemo(() => {
    if (!listingRules) return []
    return properties.flatMap(property => {
      if (['rejected', 'changes_requested'].includes(property.status)) return []
      const missing = [
        !property.title?.trim() && 'title',
        !property.city?.trim() && 'location',
        !property.address?.trim() && 'address',
        (!property.price || property.price <= 0) && 'price',
        listingRules.requireDescription && !property.description?.trim() && 'description',
        listingRules.requireImages && !property.property_images?.length && 'photos',
      ].filter((value): value is string => Boolean(value))
      return missing.length ? [{ property, missing }] : []
    })
  }, [listingRules, properties])

  const needsAttention = useMemo(() => {
    const items: { id: string; label: string; detail: string; href: string; tone: 'amber' | 'red' | 'blue' }[] = []
    properties.forEach(property => {
      if (property.status === 'pending_review') {
        items.push({
          id: `pending-${property.id}`,
          label: 'Awaiting admin approval',
          detail: property.title,
          href: '/landlord/listings',
          tone: 'amber',
        })
      } else if (property.status === 'changes_requested') {
        items.push({
          id: `changes-${property.id}`,
          label: 'Admin requested changes',
          detail: property.title,
          href: `/landlord/listings/${property.id}/edit`,
          tone: 'blue',
        })
      } else if (property.status === 'rejected') {
        items.push({
          id: `rejected-${property.id}`,
          label: 'Review rejected listing',
          detail: property.title,
          href: `/landlord/listings/${property.id}/edit`,
          tone: 'red',
        })
      }
    })
    incompleteProperties.forEach(({ property, missing }) => {
      items.push({
        id: `incomplete-${property.id}`,
        label: 'Complete listing details',
        detail: `${property.title} · missing ${missing.join(', ')}`,
        href: `/landlord/listings/${property.id}/edit`,
        tone: 'blue',
      })
    })
    const seenAdminTickets = new Set<string>()
    adminMessages.forEach(message => {
      const ticket = supportTickets.find(item => item.id === message.ticket_id)
      if (ticket && !seenAdminTickets.has(ticket.id) && ['open', 'in_progress'].includes(ticket.status)) {
        seenAdminTickets.add(ticket.id)
        items.push({
          id: `admin-${message.id}`,
          label: 'Livarex admin replied',
          detail: ticket.subject,
          href: '/landlord/inbox',
          tone: 'blue',
        })
      }
    })
    return items.slice(0, 6)
  }, [adminMessages, incompleteProperties, properties, supportTickets])

  const activity = useMemo(() => {
    const events: DashboardActivity[] = properties.map(property => ({
      id: `submitted-${property.id}`,
      label: 'Property submitted',
      detail: property.title,
      created_at: property.created_at,
      href: '/landlord/listings',
      kind: 'submitted',
    }))

    properties.forEach(property => {
      const reviewAfterCreate = reviewEvents.some(event =>
        event.property_id === property.id && new Date(event.created_at).getTime() >= new Date(property.updated_at).getTime() - 60_000,
      )
      if (new Date(property.updated_at).getTime() > new Date(property.created_at).getTime() + 60_000 && !reviewAfterCreate) {
        events.push({
          id: `updated-${property.id}-${property.updated_at}`,
          label: 'Property updated',
          detail: property.title,
          created_at: property.updated_at,
          href: `/landlord/listings/${property.id}/edit`,
          kind: 'updated',
        })
      }
    })

    reviewEvents.forEach(event => {
      const property = properties.find(item => item.id === event.property_id)
      const label = {
        approved: 'Property approved',
        rejected: 'Property rejected',
        changes_requested: 'Changes requested',
        review_started: 'Admin started review',
        resubmitted: 'Property resubmitted',
      }[event.action]
      events.push({
        id: `review-${event.id}`,
        label,
        detail: property?.title ?? event.property_title,
        created_at: event.created_at,
        href: event.action === 'rejected' || event.action === 'changes_requested'
          ? event.property_id ? `/landlord/listings/${event.property_id}/edit` : '/landlord/listings'
          : '/landlord/listings',
        kind: event.action === 'approved' ? 'approved' : event.action === 'rejected' ? 'rejected' : 'review',
      })
    })

    adminMessages.forEach(message => {
      const ticket = supportTickets.find(item => item.id === message.ticket_id)
      if (!ticket) return
      events.push({
        id: `admin-message-${message.id}`,
        label: 'Message from Livarex admin',
        detail: `${ticket.subject}: ${message.body}`,
        created_at: message.created_at,
        href: '/landlord/inbox',
        kind: 'admin',
      })
    })
    return events
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 6)
  }, [adminMessages, properties, reviewEvents, supportTickets])

  const recentProperties = properties.slice(0, 5)
  const recentAdminMessages = adminMessages.slice(0, 3)

  return (
    <AuthGuard require="landlord">
      <div className="flex h-dvh overflow-hidden bg-[#f7f8fa]">
        <LandlordSidebar userName={landlord?.full_name} userEmail={userEmail} isVerified={landlord?.is_verified} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white py-3 pl-14 pr-4 md:px-8">
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight text-slate-900">Overview</h1>
              <p className="mt-0.5 text-[11px] text-slate-500">Your property workspace.</p>
            </div>
            <Link href="/landlord/listings/new"
              className="inline-flex min-h-9 items-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-3.5">
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Add Listing</span>
              <span className="sm:hidden">Add</span>
            </Link>
          </header>

          <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6 sm:px-6 md:px-8 md:pb-8">
            {loading ? (
              <div className="mx-auto max-w-[1440px] animate-pulse" role="status" aria-label="Loading dashboard">
                <div className="h-7 w-52 rounded-sm bg-slate-200" />
                <div className="mt-3 h-4 w-72 max-w-full rounded-sm bg-slate-100" />
                <div className="mt-8 grid grid-cols-2 border-y border-slate-200 md:grid-cols-4">
                  {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-20 border-r border-slate-200 p-4 last:border-r-0"><div className="h-3 w-20 rounded-sm bg-slate-100" /><div className="mt-3 h-6 w-12 rounded-sm bg-slate-200" /></div>)}
                </div>
                <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
                  <div className="space-y-3">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-[88px] border-b border-slate-200 bg-white/70" />)}</div>
                  <div className="h-72 bg-white/70" />
                </div>
              </div>
            ) : loadError ? (
              <div className="mx-auto mt-12 max-w-xl border-y border-red-200 bg-white p-8 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
                <h2 className="mt-3 font-bold text-gray-900">Dashboard unavailable</h2>
                <p className="mt-1 text-sm text-gray-500">{loadError}</p>
                <button type="button" onClick={() => void loadDashboard()}
                  className="mt-5 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                  Try again
                </button>
              </div>
            ) : (
              <div className="mx-auto max-w-[1440px]">
                <section aria-label="Portfolio metrics" className="grid grid-cols-2 border-y border-slate-200 bg-white sm:grid-cols-4">
                  {[
                    { label: 'Total Properties', value: counts.total },
                    { label: 'Available Properties', value: counts.available },
                    { label: 'Under Review', value: counts.underReview },
                    { label: 'Taken Properties', value: counts.taken },
                  ].map((metric, index) => (
                    <div key={metric.label} className={`min-w-0 px-3 py-3.5 sm:px-5 ${index % 2 ? 'border-l border-slate-200' : ''} ${index > 1 ? 'border-t border-slate-200 sm:border-t-0' : ''} ${index > 0 && index % 2 === 0 ? 'sm:border-l' : ''}`}>
                      <p className="text-[10px] font-medium leading-4 text-slate-500 sm:text-[11px]">{metric.label}</p>
                      <p className="mt-1 text-xl font-semibold leading-none tracking-tight tabular-nums text-[#142039]">{metric.value}</p>
                    </div>
                  ))}
                </section>

                <div className="grid items-start gap-8 pt-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.8fr)] xl:gap-10">
                  <section aria-labelledby="recent-properties-heading" className="min-w-0">
                    <div className="flex items-end justify-between gap-3 border-b border-slate-300 pb-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700">Portfolio</p>
                        <h2 id="recent-properties-heading" className="mt-1 text-base font-semibold tracking-tight text-[#142039]">Recent properties</h2>
                      </div>
                      <Link href="/landlord/listings" className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-blue-800 transition-colors hover:text-blue-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                        View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>

                    {recentProperties.length ? (
                      <div className="divide-y divide-slate-200">
                        {recentProperties.map(property => {
                          const status = STATUS_STYLE[property.status] ?? { label: property.status, className: 'bg-slate-100 text-slate-600' }
                          const cover = property.property_images?.find(image => image.is_cover) ?? property.property_images?.[0]
                          return (
                            <article key={property.id} className="group grid min-w-0 grid-cols-[72px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 py-3 transition-colors hover:bg-white/70 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:gap-x-4">
                              <Link href={`/listings/${property.id}`} aria-label={`View ${property.title}`} className="relative h-[56px] overflow-hidden bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-[64px]">
                                {cover
                                  ? <img src={getSupabaseImageUrl(cover.storage_path)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                                  : <span className="flex h-full items-center justify-center text-slate-400"><ImagePlus className="h-5 w-5" aria-hidden="true" /></span>}
                              </Link>
                              <div className="min-w-0">
                                <Link href={`/listings/${property.id}`} className="block truncate text-[13px] font-semibold text-slate-900 transition-colors hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                  {property.title}
                                </Link>
                                <p className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-slate-500">
                                  <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{property.city || 'Location not set'}</span>
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-500">
                                  <span className="font-medium text-slate-600">{property.type === 'rent' ? 'For rent' : property.type === 'sale' ? 'For sale' : property.type ?? 'Property'}</span>
                                  {property.bedrooms != null && <span className="inline-flex items-center gap-1"><BedDouble className="h-3 w-3" aria-hidden="true" />{property.bedrooms}</span>}
                                  {property.bathrooms != null && <span className="inline-flex items-center gap-1"><Bath className="h-3 w-3" aria-hidden="true" />{property.bathrooms}</span>}
                                  <span className="font-semibold tabular-nums text-slate-800 sm:hidden">{property.price != null ? `₦${Number(property.price).toLocaleString('en-NG')}` : '—'}</span>
                                </div>
                              </div>
                              <div className="col-span-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 sm:col-span-1 sm:border-0 sm:pt-0">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ${status.className}`}>
                                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />{status.label}
                                  </span>
                                  <span className="hidden whitespace-nowrap text-xs font-semibold tabular-nums text-slate-900 sm:inline">
                                    {property.price != null ? `₦${Number(property.price).toLocaleString('en-NG')}` : '—'}
                                  </span>
                                </div>
                                <Link href={`/listings/${property.id}`} aria-label={`View ${property.title}`} title="View property" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                  <Eye className="h-4 w-4" aria-hidden="true" />
                                </Link>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="border-b border-slate-200 bg-white px-4 py-8 text-center">
                        <Building2 className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
                        <p className="mt-2 text-sm font-semibold text-slate-800">Your portfolio starts here</p>
                        <p className="mt-1 text-xs text-slate-500">Add your first property to begin managing your listings.</p>
                        <Link href="/landlord/listings/new" className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add a property
                        </Link>
                      </div>
                    )}
                  </section>

                  <aside className="min-w-0 space-y-7 border-t border-slate-200 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 xl:pl-8">
                    <section aria-labelledby="attention-heading">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-300 pb-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700">Action center</p>
                          <h2 id="attention-heading" className="mt-1 text-base font-semibold tracking-tight text-[#142039]">Needs attention</h2>
                        </div>
                        {needsAttention.length > 0 && <span className="text-xs font-semibold tabular-nums text-slate-500">{needsAttention.length}</span>}
                      </div>
                      {needsAttention.length ? (
                        <ul className="divide-y divide-slate-200">
                          {needsAttention.map(item => {
                            const Icon = item.tone === 'red' ? ShieldAlert : item.tone === 'amber' ? Clock3 : item.id.startsWith('admin-') ? MessageSquare : FilePenLine
                            const iconTone = item.tone === 'red' ? 'text-red-600' : item.tone === 'amber' ? 'text-amber-600' : 'text-blue-700'
                            return (
                              <li key={item.id}>
                                <Link href={item.href} className="group/attention flex min-w-0 items-start gap-2.5 py-3 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconTone}`} aria-hidden="true" />
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-xs font-semibold text-slate-800">{item.label}</span>
                                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">{item.detail}</span>
                                  </span>
                                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover/attention:translate-x-0.5 group-hover/attention:text-blue-700" aria-hidden="true" />
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <div className="flex items-center gap-2.5 py-4">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                          <div>
                            <p className="text-xs font-semibold text-slate-800">You’re all caught up</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">No listings or admin updates need action.</p>
                          </div>
                        </div>
                      )}
                    </section>

                    <section aria-labelledby="occupancy-heading" className="border-t border-slate-200 pt-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Portfolio performance</p>
                          <h2 id="occupancy-heading" className="mt-1 text-sm font-semibold text-[#142039]">Occupancy</h2>
                        </div>
                        <TrendingUp className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      </div>
                      {approvedProperties.length === 0 ? (
                        <p className="mt-3 text-xs leading-5 text-slate-500">Occupancy insights will be available after a property is approved.</p>
                      ) : occupancy === null ? (
                        <p className="mt-3 text-xs leading-5 text-slate-500">No available or taken properties yet. Occupancy will be measured when a property enters either status.</p>
                      ) : (
                        <>
                          <div className="mt-4 flex items-end justify-between gap-3">
                            <p className="text-3xl font-semibold leading-none tracking-tight tabular-nums text-[#142039]">{occupancy}<span className="text-lg font-normal text-slate-400">%</span></p>
                            <p className="pb-0.5 text-[11px] text-slate-500">{counts.taken} of {occupancyInventory} occupied</p>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden bg-slate-200" role="progressbar" aria-label="Property occupancy" aria-valuemin={0} aria-valuemax={100} aria-valuenow={occupancy}>
                            <div className="h-full bg-blue-700 transition-[width] duration-500" style={{ width: `${occupancy}%` }} />
                          </div>
                        </>
                      )}
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{counts.available} available</span>
                        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />{counts.taken} taken</span>
                      </div>
                    </section>

                    <section aria-labelledby="activity-heading" className="border-t border-slate-200 pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <h2 id="activity-heading" className="text-sm font-semibold text-[#142039]">Recent activity</h2>
                        <Activity className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      </div>
                      {activity.length ? (
                        <ol className="mt-2 divide-y divide-slate-200">
                          {activity.slice(0, 5).map(event => {
                            const Icon = event.kind === 'approved' ? CheckCircle2 : event.kind === 'rejected' ? ShieldAlert : event.kind === 'admin' ? MessageSquare : event.kind === 'updated' ? FilePenLine : event.kind === 'submitted' ? Plus : Clock3
                            const iconTone = event.kind === 'approved' ? 'text-emerald-600' : event.kind === 'rejected' ? 'text-red-600' : event.kind === 'admin' ? 'text-blue-700' : 'text-slate-400'
                            return (
                              <li key={event.id}>
                                <Link href={event.href} className="flex min-w-0 items-start gap-2.5 py-2.5 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                  <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${iconTone}`} aria-hidden="true" />
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[11px] font-medium text-slate-800">{event.label}</span>
                                    <span className="mt-0.5 block truncate text-[10px] text-slate-500">{event.detail}</span>
                                  </span>
                                  <time className="shrink-0 pt-0.5 text-[10px] text-slate-400" dateTime={event.created_at}>{timeAgo(event.created_at)}</time>
                                </Link>
                              </li>
                            )
                          })}
                        </ol>
                      ) : (
                        <p className="py-3 text-[11px] text-slate-500">Property and review activity will appear here.</p>
                      )}
                    </section>

                    <section aria-labelledby="inbox-heading" className="border-t border-slate-200 pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Livarex support</p>
                          <h2 id="inbox-heading" className="mt-1 text-sm font-semibold text-[#142039]">Administrator inbox</h2>
                        </div>
                        <Link href="/landlord/inbox" aria-label="Open administrator inbox" className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">Messages with the Livarex admin team.</p>
                      {recentAdminMessages.length ? (
                        <ul className="mt-2 divide-y divide-slate-200">
                          {recentAdminMessages.map(message => {
                            const ticket = supportTickets.find(item => item.id === message.ticket_id)
                            if (!ticket) return null
                            return (
                              <li key={message.id}>
                                <Link href="/landlord/inbox" className="block py-2.5 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                  <span className="flex items-center justify-between gap-3">
                                    <span className="truncate text-[11px] font-semibold text-slate-800">{ticket.subject}</span>
                                    <time className="shrink-0 text-[10px] text-slate-400" dateTime={message.created_at}>{timeAgo(message.created_at)}</time>
                                  </span>
                                  <span className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{message.body}</span>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <p className="mt-2 py-2 text-[11px] leading-5 text-slate-500">
                          {supportTickets.length ? 'No administrator replies yet. Updates to your support requests will appear here.' : 'No support updates yet. Contact the Livarex team through your inbox.'}
                        </p>
                      )}
                    </section>
                  </aside>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
