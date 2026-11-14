import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from '@/lib/navigation'
import { motion } from 'framer-motion'
import {
  Activity, AlertCircle, ArrowRight, BedDouble, Building2, Bath,
  CheckCircle2, Clock3, Eye, FilePenLine, ImagePlus, KeyRound, MapPin, MessageSquare,
  Plus, ShieldAlert, TrendingUp,
} from 'lucide-react'
import LandlordSidebar from '../../components/layout/LandlordSidebar'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient, getSupabaseImageUrl } from '../../lib/supabase'
import { getListingSettings, type ListingSettings } from '../../lib/platform-settings'
import type { Landlord } from '@/types'
import { getLandlordAnalytics, type LandlordAnalytics } from '../../lib/property-analytics'

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

const CARD = 'rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-sm'
const EYEBROW = 'text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700'

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
  const [performance, setPerformance] = useState<LandlordAnalytics | null>(null)
  const [performanceError, setPerformanceError] = useState('')

  useEffect(() => {
    let active = true
    getLandlordAnalytics(7).then(result => {
      if (active) setPerformance(result)
    }).catch(error => {
      if (!active) return
      console.warn('[landlord-dashboard] property preview unavailable:', error)
      setPerformanceError(error instanceof Error ? error.message : 'Property performance is unavailable.')
    })
    return () => { active = false }
  }, [])

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

  // Presentational only: share-of-portfolio for metric cards
  const shareOfTotal = (value: number) => counts.total > 0 ? Math.round((value / counts.total) * 100) : 0

  return (
    <AuthGuard require="landlord">
      <div className="flex h-dvh overflow-hidden bg-[#f7f8fa]">
        <LandlordSidebar userName={landlord?.full_name} userEmail={userEmail} isVerified={landlord?.is_verified} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 py-3 pl-14 pr-4 backdrop-blur md:px-8">
            <div className="min-w-0">
              <h1 className="text-[15px] font-bold tracking-tight text-slate-900">Overview</h1>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                Welcome back{landlord?.full_name ? `, ${landlord.full_name.split(' ')[0]}` : ''} — here's your portfolio at a glance.
              </p>
            </div>
            <Link href="/landlord/listings/new"
              className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-700/25 transition-all hover:bg-blue-800 hover:shadow-lg hover:shadow-blue-700/30 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Add Listing</span>
              <span className="sm:hidden">Add</span>
            </Link>
          </header>

          <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6 sm:px-6 md:px-8 md:pb-8">
            {loading ? (
              <div className="mx-auto max-w-[1440px] animate-pulse" role="status" aria-label="Loading dashboard">
                <div className="h-6 w-56 rounded-lg bg-slate-200" />
                <div className="mt-3 h-4 w-72 max-w-full rounded bg-slate-100" />
                <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
                      <div className="h-9 w-9 rounded-xl bg-slate-100" />
                      <div className="mt-3 h-3 w-24 rounded bg-slate-100" />
                      <div className="mt-2 h-6 w-12 rounded bg-slate-200" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-24 rounded-2xl bg-white ring-1 ring-slate-200/70" />
                <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.8fr)]">
                  <div className="space-y-2.5">
                    {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[92px] rounded-2xl bg-white ring-1 ring-slate-200/60" />)}
                  </div>
                  <div className="h-80 rounded-2xl bg-white ring-1 ring-slate-200/60" />
                </div>
              </div>
            ) : loadError ? (
              <div className="mx-auto mt-12 max-w-xl rounded-3xl bg-white p-8 text-center ring-1 ring-red-100 shadow-xl shadow-red-900/5">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 ring-1 ring-red-100">
                  <AlertCircle className="h-6 w-6 text-red-500" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900">Dashboard unavailable</h2>
                <p className="mt-1 text-sm text-slate-500">{loadError}</p>
                <button type="button" onClick={() => void loadDashboard()}
                  className="mt-5 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-700/25 transition-all hover:bg-blue-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                  Try again
                </button>
              </div>
            ) : (
              <div className="mx-auto max-w-[1440px]">

                {/* ── METRIC CARDS ── */}
                <section aria-label="Portfolio metrics" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  {[
                    { label: 'Total Properties', value: counts.total, icon: Building2, chip: 'bg-blue-50 text-blue-700 ring-blue-100', share: 100 },
                    { label: 'Available Properties', value: counts.available, icon: CheckCircle2, chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100', share: shareOfTotal(counts.available) },
                    { label: 'Under Review', value: counts.underReview, icon: Clock3, chip: 'bg-amber-50 text-amber-700 ring-amber-100', share: shareOfTotal(counts.underReview) },
                    { label: 'Taken Properties', value: counts.taken, icon: KeyRound, chip: 'bg-slate-100 text-slate-700 ring-slate-200', share: shareOfTotal(counts.taken) },
                  ].map((metric, index) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06, duration: 0.35, ease: 'easeOut' }}
                      className="group relative overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 shadow-sm transition-all hover:shadow-md hover:shadow-slate-900/5 hover:ring-slate-300 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${metric.chip}`}>
                          <metric.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                        </span>
                        <span className="text-[10px] font-semibold tabular-nums text-slate-400">{metric.share}%</span>
                      </div>
                      <p className="mt-3 text-[11px] font-medium leading-4 text-slate-500">{metric.label}</p>
                      <p className="mt-1 text-2xl font-bold leading-none tracking-tight tabular-nums text-[#142039]">{metric.value}</p>
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-600 to-sky-400 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                    </motion.div>
                  ))}
                </section>

                {/* ── PERFORMANCE PREVIEW ── */}
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.35, ease: 'easeOut' }}
                  aria-label="Property performance preview"
                  className="mt-4 flex flex-col gap-4 rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200/80 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="grid flex-1 grid-cols-3 gap-3 sm:max-w-[480px]">
                    {[
                      { label: 'Views · 7 days', value: performance?.metrics.views },
                      { label: 'Unique visitors', value: performance?.metrics.uniqueVisitors },
                      { label: 'Enquiries', value: performance?.metrics.enquiries },
                    ].map(metric => (
                      <div key={metric.label} className="min-w-0">
                        <p className="truncate text-[10px] font-medium text-slate-500">{metric.label}</p>
                        <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-[#142039]">
                          {metric.value == null ? (performanceError ? '—' : '…') : metric.value.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 sm:min-w-[280px] sm:justify-end sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                    <div className="min-w-0 flex-1 sm:max-w-[150px]">
                      <p className="text-[10px] font-medium text-slate-500">Top property</p>
                      <p className="mt-1 truncate text-xs font-bold text-slate-800">
                        {performance?.topProperty?.title ?? (performanceError ? 'Unavailable' : 'No views yet')}
                      </p>
                    </div>
                    <div className="flex h-9 w-20 shrink-0 items-end gap-1" aria-label="Property views over the last 7 days">
                      {(performance?.timeseries.slice(-7) ?? []).map(day => {
                        const maxViews = Math.max(1, ...(performance?.timeseries.slice(-7).map(row => row.views) ?? []))
                        return <span key={day.date} title={`${day.views} views`} className="flex-1 rounded-t-md bg-gradient-to-t from-blue-600/90 to-sky-400/90 transition-colors hover:from-blue-700" style={{ height: `${Math.max(4, day.views / maxViews * 30)}px` }} />
                      })}
                      {!performance?.timeseries.length && <span className="h-px w-full bg-slate-200" />}
                    </div>
                    <Link href="/landlord/insights" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-2 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                      Full insights <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                </motion.section>
                {performanceError && <p role="status" className="mt-2 text-right text-[11px] font-medium text-amber-600">Property performance is temporarily unavailable.</p>}

                <div className="grid items-start gap-8 pt-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.8fr)] xl:gap-10">

                  {/* ── RECENT PROPERTIES ── */}
                  <section aria-labelledby="recent-properties-heading" className="min-w-0">
                    <div className="flex items-end justify-between gap-3 pb-3">
                      <div>
                        <p className={EYEBROW}>Portfolio</p>
                        <h2 id="recent-properties-heading" className="mt-1 text-base font-bold tracking-tight text-[#142039]">Recent properties</h2>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold tabular-nums text-slate-500 ring-1 ring-slate-200">{counts.total}</span>
                        <Link href="/landlord/listings" className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-blue-800 transition-colors hover:text-blue-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                          View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>

                    {recentProperties.length ? (
                      <div className="space-y-2.5">
                        {recentProperties.map(property => {
                          const status = STATUS_STYLE[property.status] ?? { label: property.status, className: 'bg-slate-100 text-slate-600' }
                          const cover = property.property_images?.find(image => image.is_cover) ?? property.property_images?.[0]
                          return (
                            <article key={property.id} className="group grid min-w-0 grid-cols-[72px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200/70 shadow-sm transition-all hover:shadow-md hover:shadow-slate-900/5 hover:ring-slate-300 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:gap-x-4 sm:p-3.5">
                              <Link href={`/listings/${property.id}`} aria-label={`View ${property.title}`} className="relative h-[56px] overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-[64px]">
                                {cover
                                  ? <img src={getSupabaseImageUrl(cover.storage_path)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]" />
                                  : <span className="flex h-full items-center justify-center text-slate-400"><ImagePlus className="h-5 w-5" aria-hidden="true" /></span>}
                              </Link>
                              <div className="min-w-0">
                                <Link href={`/listings/${property.id}`} className="block truncate text-[13px] font-bold text-slate-900 transition-colors hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
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
                                  <span className="font-bold tabular-nums text-slate-800 sm:hidden">{property.price != null ? `₦${Number(property.price).toLocaleString('en-NG')}` : '—'}</span>
                                </div>
                              </div>
                              <div className="col-span-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 sm:col-span-1 sm:border-0 sm:pt-0">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm ${status.className}`}>
                                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />{status.label}
                                  </span>
                                  <span className="hidden whitespace-nowrap text-xs font-bold tabular-nums text-slate-900 sm:inline">
                                    {property.price != null ? `₦${Number(property.price).toLocaleString('en-NG')}` : '—'}
                                  </span>
                                </div>
                                <Link href={`/listings/${property.id}`} aria-label={`View ${property.title}`} title="View property" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                  <Eye className="h-4 w-4" aria-hidden="true" />
                                </Link>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 ring-1 ring-blue-100">
                          <Building2 className="h-6 w-6 text-blue-600" aria-hidden="true" />
                        </span>
                        <p className="mt-3 text-sm font-bold text-slate-900">Your portfolio starts here</p>
                        <p className="mt-1 text-xs text-slate-500">Add your first property to begin managing your listings.</p>
                        <Link href="/landlord/listings/new" className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-700/25 transition-all hover:bg-blue-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add a property
                        </Link>
                      </div>
                    )}
                  </section>

                  {/* ── SIDEBAR ── */}
                  <aside className="min-w-0 space-y-4">

                    {/* Needs Attention */}
                    <section aria-labelledby="attention-heading" className={`${CARD} p-4 sm:p-5`}>
                      <div className="flex items-center justify-between gap-3 pb-3">
                        <div>
                          <p className={EYEBROW}>Action center</p>
                          <h2 id="attention-heading" className="mt-1 text-sm font-bold tracking-tight text-[#142039]">Needs attention</h2>
                        </div>
                        {needsAttention.length > 0 && (
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-100 px-2 text-[11px] font-bold tabular-nums text-amber-800 ring-1 ring-amber-200">{needsAttention.length}</span>
                        )}
                      </div>
                      {needsAttention.length ? (
                        <ul className="divide-y divide-slate-100">
                          {needsAttention.map(item => {
                            const Icon = item.tone === 'red' ? ShieldAlert : item.tone === 'amber' ? Clock3 : item.id.startsWith('admin-') ? MessageSquare : FilePenLine
                            const chip = item.tone === 'red'
                              ? 'bg-red-50 text-red-600 ring-red-100'
                              : item.tone === 'amber'
                                ? 'bg-amber-50 text-amber-600 ring-amber-100'
                                : item.id.startsWith('admin-')
                                  ? 'bg-blue-50 text-blue-700 ring-blue-100'
                                  : 'bg-slate-50 text-slate-600 ring-slate-200'
                            return (
                              <li key={item.id}>
                                <Link href={item.href} className="group/attention -mx-2 flex min-w-0 items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${chip}`}>
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-xs font-bold text-slate-800">{item.label}</span>
                                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">{item.detail}</span>
                                  </span>
                                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover/attention:translate-x-0.5 group-hover/attention:text-blue-700" aria-hidden="true" />
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <div className="flex items-start gap-3 rounded-xl bg-emerald-50/70 p-3.5 ring-1 ring-emerald-100">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                          <div>
                            <p className="text-xs font-bold text-emerald-900">You're all caught up</p>
                            <p className="mt-0.5 text-[11px] text-emerald-700/80">No listings or admin updates need action.</p>
                          </div>
                        </div>
                      )}
                    </section>

                    {/* Occupancy */}
                    <section aria-labelledby="occupancy-heading" className={`${CARD} p-4 sm:p-5`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Portfolio performance</p>
                          <h2 id="occupancy-heading" className="mt-1 text-sm font-bold tracking-tight text-[#142039]">Occupancy</h2>
                        </div>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200">
                          <TrendingUp className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        </span>
                      </div>
                      {approvedProperties.length === 0 ? (
                        <p className="mt-3 text-xs leading-5 text-slate-500">Occupancy insights will be available after a property is approved.</p>
                      ) : occupancy === null ? (
                        <p className="mt-3 text-xs leading-5 text-slate-500">No available or taken properties yet. Occupancy will be measured when a property enters either status.</p>
                      ) : (
                        <>
                          <div className="mt-4 flex items-end justify-between gap-3">
                            <p className="text-3xl font-bold leading-none tracking-tight tabular-nums text-[#142039]">{occupancy}<span className="text-lg font-medium text-slate-400">%</span></p>
                            <p className="pb-0.5 text-[11px] font-medium text-slate-500">{counts.taken} of {occupancyInventory} occupied</p>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Property occupancy" aria-valuemin={0} aria-valuemax={100} aria-valuenow={occupancy}>
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-sky-400 transition-[width] duration-700" style={{ width: `${occupancy}%` }} />
                          </div>
                        </>
                      )}
                      <div className="mt-3.5 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />{counts.available} available
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden="true" />{counts.taken} taken
                        </span>
                      </div>
                    </section>

                    {/* Recent Activity */}
                    <section aria-labelledby="activity-heading" className={`${CARD} p-4 sm:p-5`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Timeline</p>
                          <h2 id="activity-heading" className="mt-1 text-sm font-bold tracking-tight text-[#142039]">Recent activity</h2>
                        </div>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200">
                          <Activity className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        </span>
                      </div>
                      {activity.length ? (
                        <ol className="mt-2 divide-y divide-slate-100">
                          {activity.slice(0, 5).map(event => {
                            const Icon = event.kind === 'approved' ? CheckCircle2 : event.kind === 'rejected' ? ShieldAlert : event.kind === 'admin' ? MessageSquare : event.kind === 'updated' ? FilePenLine : event.kind === 'submitted' ? Plus : Clock3
                            const chip = event.kind === 'approved'
                              ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
                              : event.kind === 'rejected'
                                ? 'bg-red-50 text-red-600 ring-red-100'
                                : event.kind === 'admin'
                                  ? 'bg-blue-50 text-blue-700 ring-blue-100'
                                  : 'bg-slate-50 text-slate-500 ring-slate-200'
                            return (
                              <li key={event.id}>
                                <Link href={event.href} className="-mx-2 flex min-w-0 items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${chip}`}>
                                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[11px] font-semibold text-slate-800">{event.label}</span>
                                    <span className="mt-0.5 block truncate text-[10px] text-slate-500">{event.detail}</span>
                                  </span>
                                  <time className="shrink-0 pt-0.5 text-[10px] font-medium text-slate-400" dateTime={event.created_at}>{timeAgo(event.created_at)}</time>
                                </Link>
                              </li>
                            )
                          })}
                        </ol>
                      ) : (
                        <p className="py-3 text-[11px] text-slate-500">Property and review activity will appear here.</p>
                      )}
                    </section>

                    {/* Admin Inbox */}
                    <section aria-labelledby="inbox-heading" className={`${CARD} p-4 sm:p-5`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Livarex support</p>
                          <h2 id="inbox-heading" className="mt-1 text-sm font-bold tracking-tight text-[#142039]">Administrator inbox</h2>
                        </div>
                        <Link href="/landlord/inbox" aria-label="Open administrator inbox" className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">Messages with the Livarex admin team.</p>
                      {recentAdminMessages.length ? (
                        <ul className="mt-2 space-y-2">
                          {recentAdminMessages.map(message => {
                            const ticket = supportTickets.find(item => item.id === message.ticket_id)
                            if (!ticket) return null
                            return (
                              <li key={message.id}>
                                <Link href="/landlord/inbox" className="-mx-2 block rounded-xl px-2 py-2.5 ring-1 ring-transparent transition-all hover:bg-slate-50 hover:ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                  <span className="flex items-center justify-between gap-3">
                                    <span className="truncate text-[11px] font-bold text-slate-800">{ticket.subject}</span>
                                    <time className="shrink-0 text-[10px] font-medium text-slate-400" dateTime={message.created_at}>{timeAgo(message.created_at)}</time>
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