import { useCallback, useEffect, useState } from 'react'
import { Link } from '@/lib/navigation'
import {
  AlertCircle, ArrowRight, Bell, BedDouble, Building2, Bath,
  Eye, ImagePlus, MapPin, MessageSquare, Plus, Search, TrendingUp,
} from 'lucide-react'
import LandlordSidebar from '../../components/layout/LandlordSidebar'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient, getSupabaseImageUrl } from '../../lib/supabase'
import type { Landlord } from '@/types'

type PropertySummary = {
  id: string
  title: string
  status: string
  city: string | null
  price: number | null
  type: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  created_at: string
  property_images?: { storage_path: string; is_cover: boolean; sort_order: number }[]
}

type EnquirySummary = {
  id: string
  status: string
  message: string | null
  created_at: string
  properties: { title: string } | { title: string }[] | null
  tenants: { full_name: string | null } | { full_name: string | null }[] | null
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  available: { label: 'Available', className: 'bg-emerald-50 text-emerald-700' },
  taken: { label: 'Taken', className: 'bg-slate-100 text-slate-600' },
  pending_review: { label: 'Pending review', className: 'bg-amber-50 text-amber-700' },
  changes_requested: { label: 'Changes requested', className: 'bg-blue-50 text-blue-700' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
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
  const [enquiries, setEnquiries] = useState<EnquirySummary[]>([])
  const [stats, setStats] = useState({ total: 0, available: 0, pending: 0, taken: 0, enquiries: 0 })
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
      const [
        totalResult, availableResult, pendingResult, takenResult, enquiriesCountResult,
        propertiesResult, enquiriesResult,
      ] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('landlord_id', landlordId),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('landlord_id', landlordId).eq('status', 'available'),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('landlord_id', landlordId).in('status', ['pending_review', 'changes_requested']),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('landlord_id', landlordId).eq('status', 'taken'),
        supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('landlord_id', landlordId),
        supabase.from('properties')
          .select('id, title, status, city, price, type, bedrooms, bathrooms, created_at, property_images(storage_path, is_cover, sort_order)')
          .eq('landlord_id', landlordId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('enquiries')
          .select('id, status, message, created_at, properties(title), tenants(full_name)')
          .eq('landlord_id', landlordId)
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      const queryError = [
        totalResult.error, availableResult.error, pendingResult.error, takenResult.error,
        enquiriesCountResult.error, propertiesResult.error, enquiriesResult.error,
      ].find(Boolean)
      if (queryError) throw queryError

      setStats({
        total: totalResult.count ?? 0,
        available: availableResult.count ?? 0,
        pending: pendingResult.count ?? 0,
        taken: takenResult.count ?? 0,
        enquiries: enquiriesCountResult.count ?? 0,
      })
      setProperties((propertiesResult.data ?? []) as PropertySummary[])
      setEnquiries((enquiriesResult.data ?? []) as EnquirySummary[])
    } catch (error) {
      console.error('[landlord-dashboard] Failed to load dashboard:', error)
      setLoadError(error instanceof Error ? error.message : 'Could not load your dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadDashboard() }, [loadDashboard])

  const displayName = landlord?.full_name || userEmail?.split('@')[0] || 'Landlord'
  const occupancy = stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 0

  return (
    <AuthGuard require="landlord">
      <div className="flex h-dvh overflow-hidden bg-[#f7f8fa]">
        <LandlordSidebar userName={landlord?.full_name} userEmail={userEmail} isVerified={landlord?.is_verified} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white py-3 pl-14 pr-4 md:px-8">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="font-semibold text-slate-900">Landlord workspace</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500">Overview</span>
            </div>
            <Link href="/landlord/listings/new"
              className="inline-flex min-h-9 items-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-3.5">
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Add property</span>
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
                <section className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">Portfolio overview</p>
                    <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.035em] text-[#142039] sm:text-[32px]">
                      Welcome back, {displayName}
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">A considered view of your properties and tenant activity.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/landlord/browse-properties"
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                      <Search className="h-3.5 w-3.5" aria-hidden="true" /> Browse
                    </Link>
                    <Link href="/landlord/listings"
                      className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                      Manage properties <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </section>

                <section aria-label="Portfolio summary" className="grid grid-cols-2 border-b border-slate-200 md:grid-cols-4">
                  {[
                    { label: 'Properties', value: stats.total },
                    { label: 'Available', value: stats.available },
                    { label: 'Under review', value: stats.pending },
                    { label: 'Enquiries', value: stats.enquiries },
                  ].map((metric, index) => (
                    <div key={metric.label} className={`min-w-0 py-4 pr-3 ${index > 0 ? 'border-l border-slate-200 pl-4 sm:pl-6' : ''} ${index > 1 ? 'border-t border-slate-200 md:border-t-0' : ''}`}>
                      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">{metric.label}</p>
                      <p className="mt-1.5 text-2xl font-semibold leading-none tracking-tight tabular-nums text-[#142039]">{metric.value}</p>
                    </div>
                  ))}
                </section>

                <section className="grid items-start gap-8 pt-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.75fr)]">
                  <div className="min-w-0">
                    <div className="flex items-end justify-between gap-4 border-b border-slate-300 pb-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">Your portfolio</p>
                        <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#142039]">Recent properties</h2>
                      </div>
                      <Link href="/landlord/listings" className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-blue-800 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                        All properties <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                    {properties.length ? (
                      <div className="divide-y divide-slate-200">
                        {properties.map(property => {
                          const status = STATUS_STYLE[property.status] ?? { label: property.status, className: 'bg-gray-100 text-gray-600' }
                          const cover = property.property_images?.find(image => image.is_cover) ?? property.property_images?.[0]
                          return (
                            <article key={property.id} className="group grid min-w-0 grid-cols-[76px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 py-3 transition-colors hover:bg-white/70 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:gap-x-4">
                              <Link href={`/listings/${property.id}`} aria-label={`View ${property.title}`} className="relative h-[58px] overflow-hidden bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-[64px]">
                                {cover ? (
                                  <img src={getSupabaseImageUrl(cover.storage_path)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                                ) : (
                                  <span className="flex h-full items-center justify-center text-slate-400"><ImagePlus className="h-5 w-5" aria-hidden="true" /></span>
                                )}
                              </Link>
                              <div className="min-w-0">
                                <Link href={`/listings/${property.id}`} className="block truncate text-[13px] font-semibold text-slate-900 transition-colors hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                  {property.title}
                                </Link>
                                <p className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-slate-500">
                                  <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{property.city || 'Location not set'}</span>
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-500">
                                  <span className="font-medium text-slate-600">{property.type === 'rent' ? 'For rent' : property.type === 'sale' ? 'For sale' : property.type ?? 'Property'}</span>
                                  {property.bedrooms != null && <span className="inline-flex items-center gap-1"><BedDouble className="h-3 w-3" aria-hidden="true" />{property.bedrooms}</span>}
                                  {property.bathrooms != null && <span className="inline-flex items-center gap-1"><Bath className="h-3 w-3" aria-hidden="true" />{property.bathrooms}</span>}
                                  <span className="font-semibold tabular-nums text-slate-800 sm:hidden">{property.price != null ? `₦${Number(property.price).toLocaleString('en-NG')}` : ''}</span>
                                </div>
                              </div>
                              <div className="col-span-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 sm:col-span-1 sm:border-0 sm:pt-0">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ${status.className}`}>
                                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
                                    {status.label}
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
                      <div className="border-b border-slate-200 bg-white px-5 py-10 text-center">
                        <Building2 className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
                        <p className="mt-3 text-sm font-semibold text-slate-800">Your portfolio starts here</p>
                        <p className="mt-1 text-xs text-slate-500">Add a property to begin managing your listings.</p>
                        <Link href="/landlord/listings/new" className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add a property
                        </Link>
                      </div>
                    )}
                  </div>

                  <aside className="min-w-0 border-t border-slate-200 pt-5 xl:border-l xl:border-t-0 xl:pl-7 xl:pt-0">
                    <section>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">Portfolio health</p>
                          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#142039]">Occupancy</h2>
                        </div>
                        <TrendingUp className="mt-1 h-4 w-4 text-slate-400" aria-hidden="true" />
                      </div>
                      <div className="mt-5 flex items-end justify-between gap-3">
                        <p className="text-[42px] font-semibold leading-none tracking-[-0.05em] text-[#142039]">{occupancy}<span className="text-2xl font-normal text-slate-400">%</span></p>
                        <p className="pb-1 text-xs text-slate-500">{stats.taken} of {stats.total} properties occupied</p>
                      </div>
                      <div
                        className="mt-4 h-1.5 overflow-hidden bg-slate-200"
                        role="progressbar"
                        aria-label="Property occupancy"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={occupancy}
                      >
                        <div className="h-full bg-blue-700 transition-all" style={{ width: `${occupancy}%` }} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{stats.available} available</span>
                        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />{stats.taken} taken</span>
                      </div>
                      {stats.pending > 0 && (
                        <Link href="/landlord/listings" className="mt-4 flex items-center gap-2 border-y border-amber-200 py-2.5 text-xs text-amber-800 transition-colors hover:bg-amber-50/70">
                          <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{stats.pending} {stats.pending === 1 ? 'listing awaits' : 'listings await'} review</span>
                          <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        </Link>
                      )}
                    </section>

                    <section className="mt-7 border-t border-slate-200 pt-5">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">Tenant activity</p>
                          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#142039]">Recent enquiries</h2>
                        </div>
                        <Link href="/landlord/inbox" className="inline-flex min-h-8 items-center gap-1 text-[11px] font-semibold text-blue-800 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                          Inbox <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      </div>
                      {enquiries.length ? (
                        <div className="mt-2 divide-y divide-slate-200">
                          {enquiries.map(enquiry => {
                            const tenantName = Array.isArray(enquiry.tenants) ? enquiry.tenants[0]?.full_name : enquiry.tenants?.full_name
                            const propertyTitle = Array.isArray(enquiry.properties) ? enquiry.properties[0]?.title : enquiry.properties?.title
                            return (
                            <article key={enquiry.id} className="flex min-w-0 items-start gap-2.5 py-3">
                              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-slate-900">
                                  {tenantName || 'Tenant'} <span className="font-normal text-slate-400">·</span> <span className="font-medium text-slate-600">{propertyTitle || 'Property'}</span>
                                </p>
                                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-600">{enquiry.message || 'New enquiry'}</p>
                                <p className="mt-1 text-[10px] text-slate-400">{timeAgo(enquiry.created_at)}</p>
                              </div>
                            </article>
                          )})}
                        </div>
                      ) : (
                        <div className="py-7 text-center">
                          <MessageSquare className="mx-auto h-5 w-5 text-slate-300" aria-hidden="true" />
                          <p className="mt-2 text-xs font-semibold text-slate-700">No enquiries yet</p>
                          <p className="mt-1 text-[11px] text-slate-500">New tenant messages will appear here.</p>
                        </div>
                      )}
                    </section>
                  </aside>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
