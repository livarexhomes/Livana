
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from '@/lib/navigation'
import {
  TrendingUp, TrendingDown, Building2, Users,
  CheckCircle, MessageSquare, MapPin, ArrowRight, Clock, ShieldCheck,
} from 'lucide-react'
import AdminHeader from '../../components/layout/AdminHeader'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import AdminSidebar from '../../components/layout/AdminSidebar'
import AuthGuard from '../../components/auth/AuthGuard'
import { createClient } from '../../lib/supabase'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600', 'from-blue-500 to-blue-700',
  'from-emerald-400 to-teal-600',  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',  'from-indigo-400 to-indigo-600',
]
function avatarGradient(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

const PIE_COLORS = ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#6366f1']

export default function AdminDashboard() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [stats, setStats] = useState({
    properties: 0, active: 0, occupied: 0,
    landlords: 0, pendingLandlords: 0, tenants: 0, enquiries: 0,
  })
  const [recentEnquiries, setRecentEnquiries]   = useState<any[]>([])
  const [recentLandlords, setRecentLandlords]   = useState<any[]>([])
  const [recentListings, setRecentListings]     = useState<any[]>([])
  const [cityStats, setCityStats]               = useState<{ city: string; count: number }[]>([])
  const [typeStats, setTypeStats]               = useState<{ name: string; value: number }[]>([])
  const [areaData, setAreaData]                 = useState<{ month: string; listings: number; enquiries: number }[]>([])
  const [loading, setLoading]                   = useState(true)
  const [refreshing, setRefreshing]             = useState(false)
  const [lastUpdated, setLastUpdated]           = useState<Date | null>(null)
  const debounceRef                             = useRef<ReturnType<typeof setTimeout>>()

  const loadData = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)

    const supabase = createClient()
    const year = new Date().getFullYear()

    const [
      { count: propCount },
      { count: activeCount },
      { count: occupiedCount },
      { count: landlordCount },
      { count: pendingCount },
      { count: tenantCount },
      { count: enqCount },
      { data: enqData },
      { data: llData },
      { data: recentProps },
      { data: cityData },
      { data: typeData },
      { data: propMonthly },
      { data: enqMonthly },
    ] = await Promise.all([
      supabase.from('properties').select('id', { count: 'exact', head: true }),
      supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'available'),
      supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'taken'),
      supabase.from('landlords').select('id', { count: 'exact', head: true }),
      supabase.from('landlords').select('id', { count: 'exact', head: true }).in('status', ['pending', 'not_submitted']),
      supabase.from('tenants').select('id', { count: 'exact', head: true }),
      supabase.from('enquiries').select('id', { count: 'exact', head: true }),
      supabase.from('enquiries').select('*, properties(title, city), tenants(full_name)').order('created_at', { ascending: false }).limit(6),
      supabase.from('landlords').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('properties').select('id, title, city, price, status').order('created_at', { ascending: false }).limit(5),
      supabase.from('properties').select('city').limit(500),
      supabase.from('properties').select('property_type').limit(500),
      supabase.from('properties').select('created_at').gte('created_at', `${year}-01-01`).lte('created_at', `${year}-12-31`),
      supabase.from('enquiries').select('created_at').gte('created_at', `${year}-01-01`).lte('created_at', `${year}-12-31`),
    ])

    setStats({
      properties: propCount ?? 0, active: activeCount ?? 0, occupied: occupiedCount ?? 0,
      landlords: landlordCount ?? 0, pendingLandlords: pendingCount ?? 0,
      tenants: tenantCount ?? 0, enquiries: enqCount ?? 0,
    })
    setRecentEnquiries(enqData ?? [])
    setRecentLandlords(llData ?? [])
    setRecentListings(recentProps ?? [])

    const cityMap: Record<string, number> = {}
    for (const p of cityData ?? []) if (p.city) cityMap[p.city] = (cityMap[p.city] ?? 0) + 1
    setCityStats(Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, count]) => ({ city, count })))

    const typeMap: Record<string, number> = {}
    for (const p of typeData ?? []) if (p.property_type) typeMap[p.property_type] = (typeMap[p.property_type] ?? 0) + 1
    setTypeStats(Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value })))

    const listingsByMonth   = new Array(12).fill(0)
    const enquiriesByMonth  = new Array(12).fill(0)
    for (const p of propMonthly ?? []) listingsByMonth[new Date(p.created_at).getMonth()]++
    for (const e of enqMonthly ?? []) enquiriesByMonth[new Date(e.created_at).getMonth()]++
    setAreaData(MONTHS.map((month, i) => ({ month, listings: listingsByMonth[i], enquiries: enquiriesByMonth[i] })))

    setLastUpdated(new Date())
    if (initial) setLoading(false)
    else setRefreshing(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })
      window.__livarexUserId = user.id
      loadData(true)
    })
  }, [loadData])

  useEffect(() => {
    const supabase = createClient()
    const debouncedLoad = () => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => loadData(false), 1500)
    }
    const channel = supabase.channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'landlords' },  debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' },    debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' },  debouncedLoad)
      .subscribe()
    return () => { clearTimeout(debounceRef.current); supabase.removeChannel(channel) }
  }, [loadData])

  const rawName        = user?.email ? user.email.split('@')[0] : 'Admin'
  const displayName    = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const occupancyRate  = stats.properties > 0 ? Math.round((stats.occupied / stats.properties) * 100) : 0
  const engagementRate = stats.properties > 0 ? (stats.enquiries / stats.properties).toFixed(1) : '0'

  const PROPERTY_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
    available:         { label: 'Available',  cls: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' },
    taken:             { label: 'Taken',       cls: 'text-red-500 bg-red-50',         dot: 'bg-red-500'     },
    under_negotiation: { label: 'Negotiating', cls: 'text-amber-600 bg-amber-50',     dot: 'bg-amber-500'   },
    coming_soon:       { label: 'Coming Soon', cls: 'text-blue-600 bg-blue-50',       dot: 'bg-blue-500'    },
  }

  const QUICK_ACTIONS = [
    { label: 'Listings',   href: '/admin/properties', icon: Building2  },
    { label: 'Landlords',  href: '/admin/landlords',  icon: Users       },
    { label: 'KYC Review', href: '/admin/kyc',        icon: ShieldCheck },
  ]

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title={`${greeting()}, ${displayName} 👋`}
            subtitle="Here's what's happening across your platform"
            pendingCount={stats.pendingLandlords}
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10 space-y-5">
            {loading ? (
              <div className="flex items-center justify-center h-full py-40">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
                  <p className="text-sm text-slate-400 font-medium">Loading dashboard…</p>
                </div>
              </div>
            ) : (
              <>
                {/* ── Hero overview card ─────────────────────────────────────── */}
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_80px_-40px_rgba(15,23,42,0.18)]">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Admin analytics</p>
                      <h2 className="mt-3 text-3xl font-extrabold text-slate-950">Platform at a glance</h2>
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        Monitor listings, landlords, KYC, and enquiries from one central dashboard.
                      </p>
                    </div>

                    {/* Live pill */}
                    <div className="flex items-center gap-3 xl:flex-col xl:items-end shrink-0">
                      {refreshing ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-semibold text-blue-600">
                          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 12a9 9 0 11-6.219-8.56"/>
                          </svg>
                          Updating…
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          </span>
                          Live
                          {lastUpdated && (
                            <span className="text-emerald-500 font-normal">
                              · {Math.round((Date.now() - lastUpdated.getTime()) / 1000) < 5
                                ? 'just now'
                                : `${Math.round((Date.now() - lastUpdated.getTime()) / 60000) || 1}m ago`}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Metrics grid ── */}
                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                      { label: 'Total Listings', value: stats.properties, accent: 'text-blue-700 bg-blue-500/10',    trend: '+8%',  up: true  },
                      { label: 'Active',         value: stats.active,      accent: 'text-emerald-700 bg-emerald-500/10', trend: '+5%',  up: true  },
                      { label: 'Landlords',      value: stats.landlords,   accent: 'text-violet-700 bg-violet-500/10', trend: '+12%', up: true,
                        badge: stats.pendingLandlords > 0 ? `${stats.pendingLandlords} pending` : null },
                      { label: 'Tenants',        value: stats.tenants,     accent: 'text-indigo-700 bg-indigo-500/10', trend: '+3%',  up: true  },
                      { label: 'Enquiries',      value: stats.enquiries,   accent: 'text-amber-700 bg-amber-500/10',  trend: '+21%', up: true  },
                    ].map(item => (
                      <div key={item.label} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                        <p className={`text-3xl font-extrabold ${item.accent}`}>{item.value.toLocaleString()}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{item.label}</p>
                        {item.badge && (
                          <span className="mt-2 inline-block text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                            {item.badge}
                          </span>
                        )}
                        {!item.badge && (
                          <span className={`mt-2 inline-flex items-center gap-0.5 text-[10px] font-bold ${item.up ? 'text-emerald-600' : 'text-red-500'}`}>
                            {item.up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            {item.trend}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* ── KPI pills ── */}
                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Occupancy rate', value: `${occupancyRate}%`,   sub: `${stats.occupied}/${stats.properties} taken` },
                      { label: 'Avg enquiries',  value: engagementRate,         sub: 'per listing'                                },
                      { label: 'Active rate',    value: stats.properties > 0 ? `${Math.round((stats.active / stats.properties) * 100)}%` : '0%', sub: 'of all listings live' },
                      { label: 'Pending KYC',    value: String(stats.pendingLandlords), sub: 'landlords awaiting review'          },
                    ].map(k => (
                      <div key={k.label} className="rounded-3xl bg-slate-900 px-4 py-3.5 text-white">
                        <p className="text-2xl font-extrabold tabular-nums">{k.value}</p>
                        <p className="mt-1 text-[11px] font-semibold text-white">{k.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* ── Quick action links ── */}
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    {QUICK_ACTIONS.map(a => {
                      const Icon = a.icon
                      return (
                        <Link key={a.label} href={a.href}
                          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition bg-slate-100 text-slate-600 hover:bg-slate-950 hover:text-white">
                          <Icon className="w-3.5 h-3.5" />{a.label}
                        </Link>
                      )
                    })}
                    {stats.pendingLandlords > 0 && (
                      <Link href="/admin/kyc"
                        className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition ml-auto">
                        <Clock className="w-3.5 h-3.5" />
                        {stats.pendingLandlords} pending review
                      </Link>
                    )}
                  </div>
                </div>

                {/* ── Charts row ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Area chart — Platform Growth */}
                  <div className="lg:col-span-2 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Year overview</p>
                        <h3 className="mt-2 text-xl font-extrabold text-slate-950">Platform Growth</h3>
                        <p className="mt-1 text-sm text-slate-500">Listings &amp; enquiries month by month</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                          <span className="text-xs font-medium text-slate-500">Listings</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                          <span className="text-xs font-medium text-slate-500">Enquiries</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={areaData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                          <defs>
                            <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.18} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gViolet" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.14} />
                              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.10)', fontSize: 12, padding: '10px 16px' }}
                            labelStyle={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}
                          />
                          <Area type="monotone" dataKey="listings"  stroke="#2563eb" strokeWidth={2.5} fill="url(#gBlue)"   dot={false} />
                          <Area type="monotone" dataKey="enquiries" stroke="#7c3aed" strokeWidth={2.5} fill="url(#gViolet)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Property Types donut */}
                  <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Breakdown</p>
                      <h3 className="mt-2 text-xl font-extrabold text-slate-950">Property Types</h3>
                    </div>
                    <div className="flex items-center justify-center mb-5">
                      <div className="relative w-36 h-36">
                        <PieChart width={144} height={144}>
                          <Pie
                            data={typeStats.length ? typeStats : [{ name: 'None', value: 1 }]}
                            cx={68} cy={68} innerRadius={46} outerRadius={66}
                            dataKey="value" paddingAngle={typeStats.length ? 3 : 0} strokeWidth={0}>
                            {(typeStats.length ? typeStats : [{ name: 'None', value: 1 }]).map((_, i) => (
                              <Cell key={i} fill={typeStats.length ? PIE_COLORS[i % PIE_COLORS.length] : '#e2e8f0'} />
                            ))}
                          </Pie>
                        </PieChart>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-2xl font-extrabold text-slate-900">{stats.properties}</p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Total</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 flex-1">
                      {typeStats.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">No listings yet</p>
                      ) : typeStats.slice(0, 5).map((t, i) => {
                        const pct = stats.properties > 0 ? Math.round((t.value / stats.properties) * 100) : 0
                        return (
                          <div key={t.name} className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-xs text-slate-600 flex-1 capitalize truncate">{t.name}</span>
                            <span className="text-xs font-bold text-slate-800 tabular-nums">{t.value}</span>
                            <span className="text-[10px] text-slate-400 w-8 text-right tabular-nums">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* ── Data row: Enquiries + sidebar ──────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                  {/* Recent Enquiries */}
                  <div className="lg:col-span-2 rounded-[32px] border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Messages</p>
                        <h3 className="mt-1 text-lg font-extrabold text-slate-950">Recent Enquiries</h3>
                      </div>
                      <Link href="/admin/landlords"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                        View all <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                    {recentEnquiries.length === 0 ? (
                      <div className="py-20 text-center">
                        <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-slate-500">No enquiries yet</p>
                        <p className="text-xs text-slate-400 mt-1">Tenant messages will appear here.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {recentEnquiries.map((e: any) => {
                          const name     = e.tenants?.full_name ?? 'Tenant'
                          const grad     = avatarGradient(name)
                          const initials = name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                          return (
                            <div key={e.id} className="flex items-start gap-3.5 px-6 py-4 hover:bg-slate-50/60 transition-colors">
                              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0`}>
                                <span className="text-[10px] font-bold text-white">{initials}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-slate-900">{name}</p>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    e.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                  }`}>{e.status}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{e.properties?.title ?? 'Property enquiry'}</p>
                                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{e.message}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-[10px] text-slate-400">
                                  {new Date(e.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </p>
                                {e.properties?.city && (
                                  <div className="flex items-center gap-0.5 text-[10px] text-slate-400 justify-end mt-0.5">
                                    <MapPin className="w-2.5 h-2.5" />{e.properties.city}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right sidebar */}
                  <div className="space-y-5">
                    {/* Top Locations */}
                    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">By area</p>
                      <h3 className="mt-2 text-lg font-extrabold text-slate-950">Top Locations</h3>
                      {cityStats.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center mt-3">No data yet</p>
                      ) : (
                        <div className="mt-4 space-y-3.5">
                          {cityStats.map((c, i) => {
                            const max = cityStats[0]?.count ?? 1
                            const pct = Math.round((c.count / max) * 100)
                            return (
                              <div key={c.city}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-lg bg-blue-50 flex items-center justify-center text-[10px] font-black text-blue-600">
                                      #{i + 1}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-700">{c.city}</span>
                                  </div>
                                  <span className="text-sm font-bold text-slate-900 tabular-nums">{c.count}</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* New Landlords */}
                    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">New clients</p>
                          <h3 className="mt-1 text-lg font-extrabold text-slate-950">Landlords</h3>
                        </div>
                        <Link href="/admin/landlords"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                          View all
                        </Link>
                      </div>
                      {recentLandlords.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3 text-center">No landlords yet</p>
                      ) : (
                        <div className="space-y-3">
                          {recentLandlords.map((l: any) => {
                            const grad     = avatarGradient(l.full_name)
                            const initials = l.full_name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                            return (
                              <div key={l.id} className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0`}>
                                  <span className="text-[10px] font-bold text-white">{initials}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate">{l.full_name}</p>
                                  <p className="text-xs text-slate-400">
                                    {new Date(l.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Recent Listings ─────────────────────────────────────────── */}
                <div className="rounded-[32px] border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Latest additions</p>
                      <h3 className="mt-1 text-lg font-extrabold text-slate-950">Recent Listings</h3>
                    </div>
                    <Link href="/admin/properties"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                      View all <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  {recentListings.length === 0 ? (
                    <div className="py-16 text-center">
                      <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-slate-500">No listings yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {recentListings.map((p: any) => {
                        const s = PROPERTY_STATUS[p.status] ?? PROPERTY_STATUS.available
                        return (
                          <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                              <Building2 className="w-5 h-5 text-blue-600" strokeWidth={1.8} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{p.title}</p>
                              <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                                <MapPin className="w-3 h-3" />{p.city}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-slate-900">₦{Number(p.price).toLocaleString()}</p>
                              <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
