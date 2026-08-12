
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from '@/lib/navigation'
import {
  TrendingUp, TrendingDown, Building2, Users,
  CheckCircle, MessageSquare, MapPin, ArrowRight, Clock, ShieldCheck,
  Activity, Eye, Percent,
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
  'from-emerald-400 to-teal-600', 'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500', 'from-indigo-400 to-indigo-600',
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
  const [recentEnquiries, setRecentEnquiries] = useState<any[]>([])
  const [recentLandlords, setRecentLandlords] = useState<any[]>([])
  const [recentListings, setRecentListings] = useState<any[]>([])
  const [cityStats, setCityStats] = useState<{ city: string; count: number }[]>([])
  const [typeStats, setTypeStats] = useState<{ name: string; value: number }[]>([])
  const [areaData, setAreaData] = useState<{ month: string; listings: number; enquiries: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

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
      supabase.from('properties').select('created_at')
        .gte('created_at', `${year}-01-01`).lte('created_at', `${year}-12-31`),
      supabase.from('enquiries').select('created_at')
        .gte('created_at', `${year}-01-01`).lte('created_at', `${year}-12-31`),
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

    const listingsByMonth = new Array(12).fill(0)
    const enquiriesByMonth = new Array(12).fill(0)
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'landlords' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' }, debouncedLoad)
      .subscribe()
    return () => {
      clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [loadData])

  const rawName = user?.email ? user.email.split('@')[0] : 'Admin'
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const occupancyRate = stats.properties > 0 ? Math.round((stats.occupied / stats.properties) * 100) : 0
  const engagementRate = stats.properties > 0 ? (stats.enquiries / stats.properties).toFixed(1) : '0'

  const PROPERTY_STATUS: Record<string, { label: string; cls: string }> = {
    available:         { label: 'Available',  cls: 'bg-emerald-100 text-emerald-700' },
    taken:             { label: 'Taken',       cls: 'bg-red-100 text-red-700' },
    under_negotiation: { label: 'Negotiating', cls: 'bg-amber-100 text-amber-700' },
    coming_soon:       { label: 'Coming Soon', cls: 'bg-blue-100 text-blue-700' },
  }

  // KPI cards — left border color identifies the metric at a glance
  const KPI_CARDS = [
    {
      label: 'Total Listings',
      value: stats.properties,
      icon: Building2,
      border: 'border-l-blue-500',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      trend: '+8%',
      up: true,
      href: '/admin/properties',
    },
    {
      label: 'Active Listings',
      value: stats.active,
      icon: CheckCircle,
      border: 'border-l-emerald-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      trend: '+5%',
      up: true,
      href: '/admin/properties',
    },
    {
      label: 'Landlords',
      value: stats.landlords,
      icon: Users,
      border: 'border-l-violet-500',
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      trend: '+12%',
      up: true,
      badge: stats.pendingLandlords > 0 ? `${stats.pendingLandlords} pending` : null,
      href: '/admin/landlords',
    },
    {
      label: 'Tenants',
      value: stats.tenants,
      icon: Users,
      border: 'border-l-indigo-500',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      trend: '+3%',
      up: true,
      href: '/admin/users',
    },
    {
      label: 'Enquiries',
      value: stats.enquiries,
      icon: MessageSquare,
      border: 'border-l-amber-500',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      trend: '+21%',
      up: true,
      href: '/admin/landlords',
    },
  ]

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title={`${greeting()}, ${displayName} 👋`}
            subtitle="Here's what's happening today"
            pendingCount={stats.pendingLandlords}
          />

          <main className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
                  <p className="text-sm text-gray-400 font-medium">Loading dashboard…</p>
                </div>
              </div>
            ) : (
              <div className="p-4 md:p-6 pb-10 space-y-5">

                {/* ── Top bar: date + live indicator ───────────────────────── */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-medium">
                    {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {refreshing ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-semibold text-blue-600">
                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                      Updating…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-semibold text-emerald-700">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      Live
                      {lastUpdated && (
                        <span className="text-emerald-500 font-normal">
                          · {Math.round((Date.now() - lastUpdated.getTime()) / 1000) < 5
                            ? 'just now'
                            : `updated ${Math.round((Date.now() - lastUpdated.getTime()) / 60000) || 1}m ago`}
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {/* ── Pending landlords alert ───────────────────────────────── */}
                {stats.pendingLandlords > 0 && (
                  <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Clock className="w-4.5 h-4.5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-amber-900">
                          {stats.pendingLandlords} landlord{stats.pendingLandlords > 1 ? 's' : ''} awaiting KYC review
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">Review and approve submissions to activate accounts.</p>
                      </div>
                    </div>
                    <Link href="/admin/kyc"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors shrink-0">
                      <ShieldCheck className="w-4 h-4" /> Review KYC
                    </Link>
                  </div>
                )}

                {/* ── KPI strip ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                  {KPI_CARDS.map(k => {
                    const Icon = k.icon
                    return (
                      <Link key={k.label} href={k.href}
                        className={`group bg-white rounded-2xl border border-slate-200 border-l-4 ${k.border} p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`w-9 h-9 rounded-xl ${k.iconBg} flex items-center justify-center`}>
                            <Icon className={`w-4.5 h-4.5 ${k.iconColor}`} strokeWidth={1.8} />
                          </span>
                          <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-lg ${
                            k.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                          }`}>
                            {k.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {k.trend}
                          </span>
                        </div>
                        <p className="text-2xl font-extrabold text-slate-950 leading-none tabular-nums">
                          {k.value.toLocaleString()}
                        </p>
                        <p className="text-xs font-semibold text-slate-400 mt-1.5 uppercase tracking-wide">{k.label}</p>
                        {k.badge && (
                          <p className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md inline-block mt-1.5">
                            {k.badge}
                          </p>
                        )}
                      </Link>
                    )
                  })}
                </div>

                {/* ── Charts row: Area + Donut ───────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Platform Growth — area chart */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">Platform Growth</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Listings &amp; enquiries — {new Date().getFullYear()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                          <span className="text-xs text-slate-500 font-medium">Listings</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" />
                          <span className="text-xs text-slate-500 font-medium">Enquiries</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-56">
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
                            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.10)', fontSize: 12, padding: '8px 14px' }}
                            labelStyle={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}
                          />
                          <Area type="monotone" dataKey="listings"  stroke="#2563eb" strokeWidth={2} fill="url(#gBlue)"   dot={false} />
                          <Area type="monotone" dataKey="enquiries" stroke="#7c3aed" strokeWidth={2} fill="url(#gViolet)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Property Types — donut */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-slate-900">Property Types</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Breakdown by category</p>
                    </div>
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative w-36 h-36">
                        <PieChart width={144} height={144}>
                          <Pie data={typeStats.length ? typeStats : [{ name: 'None', value: 1 }]}
                            cx={68} cy={68} innerRadius={46} outerRadius={66}
                            dataKey="value" paddingAngle={typeStats.length ? 2 : 0} strokeWidth={0}>
                            {(typeStats.length ? typeStats : [{ name: 'None', value: 1 }]).map((_, i) => (
                              <Cell key={i} fill={typeStats.length ? PIE_COLORS[i % PIE_COLORS.length] : '#e2e8f0'} />
                            ))}
                          </Pie>
                        </PieChart>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-2xl font-extrabold text-slate-900">{stats.properties}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">Total</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 flex-1">
                      {typeStats.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">No listings yet</p>
                      ) : typeStats.slice(0, 5).map((t, i) => {
                        const pct = stats.properties > 0 ? Math.round((t.value / stats.properties) * 100) : 0
                        return (
                          <div key={t.name} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-xs text-slate-600 flex-1 capitalize truncate">{t.name}</span>
                            <span className="text-xs font-bold text-slate-800 tabular-nums">{t.value}</span>
                            <span className="text-[10px] text-slate-400 w-7 text-right tabular-nums">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* ── Data row: Enquiries table + sidebar ───────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Recent Enquiries */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">Recent Enquiries</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Latest messages from tenants</p>
                      </div>
                      <Link href="/admin/landlords"
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                        View all <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                    {recentEnquiries.length === 0 ? (
                      <div className="py-16 text-center">
                        <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">No enquiries yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {recentEnquiries.map((e: any) => {
                          const name    = e.tenants?.full_name ?? 'Tenant'
                          const grad    = avatarGradient(name)
                          const initials = name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                          return (
                            <div key={e.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 mt-0.5`}>
                                <span className="text-[10px] font-bold text-white">{initials}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-slate-900">{name}</p>
                                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
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

                  {/* Right sidebar: Top Locations + New Landlords */}
                  <div className="space-y-4">
                    {/* Top Locations */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <h2 className="text-sm font-bold text-slate-900 mb-4">Top Locations</h2>
                      {cityStats.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">No data yet</p>
                      ) : (
                        <div className="space-y-3">
                          {cityStats.map((c, i) => {
                            const max = cityStats[0]?.count ?? 1
                            const pct = Math.round((c.count / max) * 100)
                            return (
                              <div key={c.city}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center text-[10px] font-black text-blue-600">
                                      #{i + 1}
                                    </span>
                                    <span className="text-sm font-medium text-slate-700">{c.city}</span>
                                  </div>
                                  <span className="text-xs font-bold text-slate-900 tabular-nums">{c.count}</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* New Landlords */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-900">New Landlords</h2>
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
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0`}>
                                  <span className="text-[10px] font-bold text-white">{initials}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate leading-tight">{l.full_name}</p>
                                  <p className="text-xs text-slate-400">
                                    Joined {new Date(l.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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

                {/* ── Recent Listings ───────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Recent Listings</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Latest properties added to the platform</p>
                    </div>
                    <Link href="/admin/properties"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                      View all <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  {recentListings.length === 0 ? (
                    <div className="py-12 text-center">
                      <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No recent listings available</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {recentListings.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                            <Building2 className="w-4.5 h-4.5 text-blue-600" strokeWidth={1.8} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{p.title}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <p className="text-xs text-slate-500">{p.city}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-slate-900">₦{Number(p.price).toLocaleString()}</p>
                            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              PROPERTY_STATUS[p.status]?.cls ?? 'bg-slate-100 text-slate-600'
                            }`}>
                              {PROPERTY_STATUS[p.status]?.label ?? 'Unknown'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Performance summary strip ─────────────────────────────── */}
                <div className="bg-slate-900 rounded-2xl p-5 md:p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-transparent to-violet-900/20 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="text-sm font-bold text-white">Performance Overview</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Live platform snapshot</p>
                      </div>
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {
                          icon: Percent,
                          label: 'Occupancy Rate',
                          value: `${occupancyRate}%`,
                          sub: `${stats.occupied} of ${stats.properties} taken`,
                          color: 'text-emerald-400',
                        },
                        {
                          icon: Activity,
                          label: 'Enquiries / Listing',
                          value: engagementRate,
                          sub: 'avg engagement rate',
                          color: 'text-blue-400',
                        },
                        {
                          icon: Eye,
                          label: 'Active Rate',
                          value: stats.properties > 0 ? `${Math.round((stats.active / stats.properties) * 100)}%` : '0%',
                          sub: `${stats.active} listings live`,
                          color: 'text-violet-400',
                        },
                        {
                          icon: Clock,
                          label: 'Pending Approvals',
                          value: String(stats.pendingLandlords),
                          sub: 'landlords awaiting KYC',
                          color: stats.pendingLandlords > 0 ? 'text-amber-400' : 'text-slate-400',
                        },
                      ].map(k => {
                        const Icon = k.icon
                        return (
                          <div key={k.label} className="bg-white/5 rounded-xl p-4 border border-white/8">
                            <Icon className={`w-4 h-4 ${k.color} mb-2`} strokeWidth={1.8} />
                            <p className={`text-2xl font-extrabold ${k.color} tabular-nums`}>{k.value}</p>
                            <p className="text-xs font-semibold text-white mt-1">{k.label}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{k.sub}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
