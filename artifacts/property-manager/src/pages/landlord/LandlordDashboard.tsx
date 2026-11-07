import { useCallback, useEffect, useState } from 'react'
import { Link } from '@/lib/navigation'
import {
  AlertCircle, ArrowRight, Bell, Building2, CheckCircle, Clock,
  MessageSquare, Plus, Search, TrendingUp,
} from 'lucide-react'
import LandlordSidebar from '../../components/layout/LandlordSidebar'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Landlord } from '@/types'

type PropertySummary = {
  id: string
  title: string
  status: string
  city: string | null
  price: number | null
  type: string | null
  created_at: string
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
  coming_soon: { label: 'Coming soon', className: 'bg-blue-50 text-blue-700' },
  under_negotiation: { label: 'Negotiating', className: 'bg-blue-50 text-blue-700' },
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
          .select('id, title, status, city, price, type, created_at')
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
  const statCards = [
    { label: 'Total properties', value: stats.total, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Available', value: stats.available, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Awaiting approval', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Enquiries', value: stats.enquiries, icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-50' },
  ]

  return (
    <AuthGuard require="landlord">
      <div className="flex h-dvh overflow-hidden bg-[#F4F6FB]">
        <LandlordSidebar userName={landlord?.full_name} userEmail={userEmail} isVerified={landlord?.is_verified} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white py-4 pl-14 pr-4 md:px-8">
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-gray-900">Dashboard</h1>
              <p className="mt-0.5 text-xs text-gray-400">Your property portfolio at a glance</p>
            </div>
            <Link href="/landlord/listings/new"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-4">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Listing</span>
            </Link>
          </header>

          <main className="flex-1 overflow-y-auto px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-8">
            {loading ? (
              <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading dashboard">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : loadError ? (
              <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
                <h2 className="mt-3 font-bold text-gray-900">Dashboard unavailable</h2>
                <p className="mt-1 text-sm text-gray-500">{loadError}</p>
                <button type="button" onClick={() => void loadDashboard()}
                  className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                  Try again
                </button>
              </div>
            ) : (
              <div className="mx-auto max-w-[1440px] space-y-6">
                <section className="relative isolate flex flex-col justify-between gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#102b5c] via-[#17458d] to-[#2563eb] p-6 text-white sm:flex-row sm:items-center sm:p-8">
                  <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-24 -z-10 h-72 w-72 rounded-full border-[36px] border-white/[0.06]" />
                  <div aria-hidden="true" className="pointer-events-none absolute right-40 -bottom-36 -z-10 h-72 w-72 rounded-full border-[1px] border-white/[0.1]" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">Landlord overview</p>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Welcome back, {displayName}</h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100">A clear view of your properties, approvals, and tenant activity.</p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <Link href="/landlord/browse-properties"
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-800">
                      <Search className="h-4 w-4" /> Browse properties
                    </Link>
                    <Link href="/landlord/listings"
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-800 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-800">
                      My properties <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </section>

                <section aria-label="Portfolio summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {statCards.map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="flex min-h-28 items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-5 transition-colors hover:border-slate-300 sm:px-5">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${bg}`}>
                        <Icon className={`h-5 w-5 ${color}`} strokeWidth={1.8} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
                        <p className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-slate-900">{value}</p>
                      </div>
                    </div>
                  ))}
                </section>

                <section className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
                  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">Recent properties</h2>
                        <p className="mt-1 text-sm text-slate-500">Your latest listing activity</p>
                      </div>
                      <Link href="/landlord/listings" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                        View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                    {properties.length ? (
                      <div className="divide-y divide-slate-100">
                        {properties.map(property => {
                          const status = STATUS_STYLE[property.status] ?? { label: property.status, className: 'bg-gray-100 text-gray-600' }
                          return (
                            <div key={property.id} className="flex items-center gap-4 px-5 py-4.5 transition-colors hover:bg-slate-50/70 sm:px-6">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                                <Building2 className="h-5 w-5 text-blue-700" aria-hidden="true" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900">{property.title}</p>
                                <p className="mt-1 truncate text-sm text-slate-500">
                                  {[property.city, property.price != null ? `₦${Number(property.price).toLocaleString()}` : null]
                                    .filter(Boolean).join(' · ') || 'Listing'}
                                </p>
                              </div>
                              <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}>
                                {status.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="px-5 py-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                          <Building2 className="h-6 w-6 text-slate-400" aria-hidden="true" />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-800">No properties listed yet</p>
                        <p className="mt-1 text-sm text-slate-500">Add your first property to start building your portfolio.</p>
                        <Link href="/landlord/listings/new" className="mt-4 inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800">
                          Create your first listing <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-bold text-slate-900">Occupancy</h2>
                          <p className="mt-1 text-sm text-slate-500">Portfolio status at a glance</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                          <TrendingUp className="h-5 w-5 text-amber-600" aria-hidden="true" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-end justify-between">
                        <p className="text-4xl font-extrabold tracking-tight text-slate-900">{occupancy}<span className="text-2xl text-slate-400">%</span></p>
                        <p className="pb-1 text-sm text-slate-500">{stats.taken} of {stats.total} taken</p>
                      </div>
                      <div
                        className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"
                        role="progressbar"
                        aria-label="Property occupancy"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={occupancy}
                      >
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all" style={{ width: `${occupancy}%` }} />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />{stats.available} available</span>
                        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-400" />{stats.taken} taken</span>
                      </div>
                      {stats.pending > 0 && (
                        <Link href="/landlord/listings" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-sm text-amber-800 transition-colors hover:bg-amber-50">
                          <Bell className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{stats.pending} {stats.pending === 1 ? 'listing is' : 'listings are'} awaiting approval</span>
                          <ArrowRight className="ml-auto mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        </Link>
                      )}
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
                        <div>
                          <h2 className="text-base font-bold text-slate-900">Recent enquiries</h2>
                          <p className="mt-1 text-sm text-slate-500">Latest tenant messages</p>
                        </div>
                        <Link href="/landlord/inbox" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800">
                          Open inbox <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </div>
                      {enquiries.length ? (
                        <div className="divide-y divide-slate-100">
                          {enquiries.map(enquiry => {
                            const tenantName = Array.isArray(enquiry.tenants) ? enquiry.tenants[0]?.full_name : enquiry.tenants?.full_name
                            const propertyTitle = Array.isArray(enquiry.properties) ? enquiry.properties[0]?.title : enquiry.properties?.title
                            return (
                            <div key={enquiry.id} className="flex items-start gap-3 px-5 py-4">
                              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                                <MessageSquare className="h-4 w-4 text-violet-700" aria-hidden="true" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {tenantName || 'Tenant'} <span className="font-normal text-slate-400">about</span> {propertyTitle || 'Property'}
                                </p>
                                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">{enquiry.message || 'New enquiry'}</p>
                              </div>
                              <span className="shrink-0 pt-0.5 text-xs text-slate-500">{timeAgo(enquiry.created_at)}</span>
                            </div>
                          )})}
                        </div>
                      ) : (
                        <div className="px-5 py-9 text-center">
                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                            <MessageSquare className="h-5 w-5 text-slate-400" aria-hidden="true" />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-slate-700">No enquiries yet</p>
                          <p className="mt-1 text-sm text-slate-500">Tenant messages will appear here.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
