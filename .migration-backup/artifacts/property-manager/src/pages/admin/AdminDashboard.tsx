'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/lib/navigation'
import {
  TrendingUp, TrendingDown, Building2, Users,
  CheckCircle, MessageSquare, MapPin, ArrowRight, Clock,
} from 'lucide-react'
import AdminHeader from '../../components/AdminHeader'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
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

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })

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
        supabase.from('enquiries').select('*, properties(title, city), tenants(full_name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('landlords').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(4),
        supabase.from('properties').select('id, title, city, price, status').order('created_at', { ascending: false }).limit(3),
        supabase.from('properties').select('city').limit(500),
        supabase.from('properties').select('property_type').limit(500),
        // Monthly listings for the current year
        supabase.from('properties').select('created_at')
          .gte('created_at', `${new Date().getFullYear()}-01-01`)
          .lte('created_at', `${new Date().getFullYear()}-12-31`),
        // Monthly enquiries for the current year
        supabase.from('enquiries').select('created_at')
          .gte('created_at', `${new Date().getFullYear()}-01-01`)
          .lte('created_at', `${new Date().getFullYear()}-12-31`),
      ])

      setStats({
        properties: propCount ?? 0, active: activeCount ?? 0, occupied: occupiedCount ?? 0,
        landlords: landlordCount ?? 0, pendingLandlords: pendingCount ?? 0,
        tenants: tenantCount ?? 0, enquiries: enqCount ?? 0,
      })
      setRecentEnquiries(enqData ?? [])
      setRecentLandlords(llData ?? [])
      setRecentListings(recentProps ?? [])

      // City breakdown
      const cityMap: Record<string, number> = {}
      for (const p of cityData ?? []) if (p.city) cityMap[p.city] = (cityMap[p.city] ?? 0) + 1
      setCityStats(Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, count]) => ({ city, count })))

      // Property type breakdown
      const typeMap: Record<string, number> = {}
      for (const p of typeData ?? []) if (p.property_type) typeMap[p.property_type] = (typeMap[p.property_type] ?? 0) + 1
      setTypeStats(Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value })))

      // Monthly chart — bucket real rows by month index
      const listingsByMonth = new Array(12).fill(0)
      const enquiriesByMonth = new Array(12).fill(0)
      for (const p of propMonthly ?? []) listingsByMonth[new Date(p.created_at).getMonth()]++
      for (const e of enqMonthly ?? []) enquiriesByMonth[new Date(e.created_at).getMonth()]++
      setAreaData(MONTHS.map((month, i) => ({ month, listings: listingsByMonth[i], enquiries: enquiriesByMonth[i] })))

      setLoading(false)
    })
  }, [])

  const rawName = user?.email ? user.email.split('@')[0] : 'Admin'
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const occupancyRate = stats.properties > 0 ? Math.round((stats.occupied / stats.properties) * 100) : 0

  const PROPERTY_STATUS: Record<string, { label: string; cls: string }> = {
    available: { label: 'Available', cls: 'bg-emerald-100 text-emerald-700' },
    taken: { label: 'Taken', cls: 'bg-red-100 text-red-700' },
    under_negotiation: { label: 'Negotiating', cls: 'bg-amber-100 text-amber-700' },
    coming_soon: { label: 'Coming Soon', cls: 'bg-blue-100 text-blue-700' },
  }

  const STAT_CARDS = [
    {
      label: 'Total Listings',
      value: stats.properties,
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      trend: '+8%',
      up: true,
    },
    {
      label: 'Active',
      value: stats.active,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      trend: '+5%',
      up: true,
    },
    {
      label: 'Landlords',
      value: stats.landlords,
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      trend: '+12%',
      up: true,
      badge: stats.pendingLandlords > 0 ? `${stats.pendingLandlords} need review` : null,
    },
    {
      label: 'Tenants',
      value: stats.tenants,
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      trend: '+3%',
      up: true,
    },
    {
      label: 'Enquiries',
      value: stats.enquiries,
      icon: MessageSquare,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      trend: '+21%',
      up: true,
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

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-5">
            {loading ? (
              <div className="flex items-center justify-center py-40">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
                  <p className="text-sm text-gray-400 font-medium">Loading dashboard…</p>
                </div>
              </div>
            ) : (
              <>
                {/* Pending alert */}
                {stats.pendingLandlords > 0 && (
                  <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-amber-900">{stats.pendingLandlords} landlord{stats.pendingLandlords > 1 ? 's' : ''} awaiting approval</p>
                        <p className="text-xs text-amber-600 mt-0.5">Review and approve to activate their accounts</p>
                      </div>
                    </div>
                    <Link href="/admin/landlords"
                      className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors">
                      Review Now
                    </Link>
                  </div>
                )}

                {/* ── Hero card ── */}
                <div className="relative overflow-hidden rounded-3xl h-52 md:h-60 shadow-xl shadow-black/10">
                  <img
                    src="https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1400&q=80"
                    alt="Platform" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="relative h-full flex flex-col justify-between p-5 md:p-7">
                    <div className="flex items-start justify-between">
                      <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs font-bold px-3 py-1.5 rounded-full">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                        LIVAREX Admin
                      </div>
                      <div className="hidden sm:flex items-center gap-2.5">
                        {[
                          { label: 'Properties', value: stats.properties },
                          { label: 'Landlords', value: stats.landlords },
                          { label: 'Pending', value: stats.pendingLandlords },
                        ].map(s => (
                          <div key={s.label} className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-4 py-2 text-center min-w-[60px]">
                            <p className="text-white text-lg font-extrabold leading-none">{s.value}</p>
                            <p className="text-white/55 text-[10px] font-medium mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-white/60 text-sm font-medium">{greeting()},</p>
                        <h2 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight leading-tight mt-0.5">{displayName}</h2>
                        <p className="text-white/50 text-xs mt-1.5">
                          {stats.pendingLandlords > 0
                            ? `${stats.pendingLandlords} landlord${stats.pendingLandlords > 1 ? 's' : ''} awaiting approval`
                            : `${stats.properties.toLocaleString()} total listings · ${occupancyRate}% occupancy`}
                        </p>
                      </div>
                      <Link href="/admin/landlords"
                        className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-900 text-sm font-bold rounded-2xl transition-colors shadow-lg shadow-black/20">
                        <ArrowRight className="w-4 h-4" />
                        <span className="hidden sm:inline">Review Clients</span>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                  {STAT_CARDS.map(s => {
                    const Icon = s.icon
                    return (
                      <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                            <Icon className={`w-4.5 h-4.5 ${s.color}`} strokeWidth={1.8} />
                          </div>
                          <span className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-lg ${
                            s.up ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'
                          }`}>
                            {s.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {s.trend}
                          </span>
                        </div>
                        <p className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-none">{s.value.toLocaleString()}</p>
                        <p className="text-xs font-semibold text-gray-400 mt-1.5 uppercase tracking-wide">{s.label}</p>
                        {s.badge && (
                          <p className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md inline-block mt-1.5">{s.badge}</p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Row 2: Area chart + Pie chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
                  {/* Area chart */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <h2 className="text-base font-bold text-gray-900">Platform Growth</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Listings & enquiries over the year</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                          <span className="text-xs text-gray-500 font-medium">Listings</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-violet-400 inline-block" />
                          <span className="text-xs text-gray-500 font-medium">Enquiries</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={areaData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                          <defs>
                            <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gViolet" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.12} />
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
                          <Area type="monotone" dataKey="listings" stroke="#2563eb" strokeWidth={2} fill="url(#gBlue)" dot={false} />
                          <Area type="monotone" dataKey="enquiries" stroke="#7c3aed" strokeWidth={2} fill="url(#gViolet)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Property type donut */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 flex flex-col">
                    <div className="mb-4">
                      <h2 className="text-base font-bold text-gray-900">Property Types</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Breakdown by category</p>
                    </div>
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative w-36 h-36">
                        <PieChart width={144} height={144}>
                          <Pie data={typeStats} cx={68} cy={68} innerRadius={46} outerRadius={66}
                            dataKey="value" paddingAngle={2} strokeWidth={0}>
                            {typeStats.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-2xl font-extrabold text-gray-900">{stats.properties}</p>
                          <p className="text-[10px] text-gray-400 font-semibold">Total</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      {typeStats.slice(0, 5).map((t, i) => {
                        const pct = stats.properties > 0 ? Math.round((t.value / stats.properties) * 100) : 0
                        return (
                          <div key={t.name} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-xs text-gray-600 flex-1 capitalize truncate">{t.name}</span>
                            <span className="text-xs font-bold text-gray-800">{t.value}</span>
                            <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Row 3: Recent enquiries + Top cities + Recent clients */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
                  {/* Recent enquiries */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">Recent Enquiries</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Latest tenant messages</p>
                      </div>
                      <Link href="/admin/landlords" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                        View all <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                    {recentEnquiries.length === 0 ? (
                      <div className="py-16 text-center">
                        <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No enquiries yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {recentEnquiries.map((e: any) => {
                          const name = e.tenants?.full_name ?? 'Tenant'
                          const grad = avatarGradient(name)
                          const initials = name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                          return (
                            <div key={e.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 mt-0.5`}>
                                <span className="text-[10px] font-bold text-white">{initials}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-900">{name}</p>
                                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    e.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                  }`}>{e.status}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{e.properties?.title ?? 'Property enquiry'}</p>
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{e.message}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-[10px] text-gray-400">
                                  {new Date(e.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </p>
                                {e.properties?.city && (
                                  <div className="flex items-center gap-0.5 text-[10px] text-gray-400 justify-end mt-0.5">
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

                  {/* Right column: Top cities + Recent clients */}
                  <div className="space-y-4">
                    {/* Top cities */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <h2 className="text-sm font-bold text-gray-900 mb-4">Top Locations</h2>
                      {cityStats.length === 0 ? (
                        <p className="text-xs text-gray-400 py-4 text-center">No data</p>
                      ) : (
                        <div className="space-y-3">
                          {cityStats.map((c, i) => {
                            const max = cityStats[0]?.count ?? 1
                            const pct = Math.round((c.count / max) * 100)
                            return (
                              <div key={c.city}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center text-[10px] font-black text-blue-600">#{i + 1}</span>
                                    <span className="text-sm font-semibold text-gray-700">{c.city}</span>
                                  </div>
                                  <span className="text-sm font-bold text-gray-900">{c.count}</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Recent clients */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-gray-900">New Landlords</h2>
                        <Link href="/admin/landlords" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                          View all
                        </Link>
                      </div>
                      <div className="space-y-3">
                        {recentLandlords.map((l: any) => {
                          const grad = avatarGradient(l.full_name)
                          const initials = l.full_name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                          return (
                            <div key={l.id} className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0`}>
                                <span className="text-[10px] font-bold text-white">{initials}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{l.full_name}</p>
                                <p className="text-xs text-gray-400 truncate">Joined {new Date(l.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent listings */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">Recent Listings</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Latest properties added to the platform</p>
                    </div>
                    <Link href="/admin/properties" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
                      View all <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {recentListings.length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center">No recent listings available</p>
                    ) : (
                      recentListings.map((p: any) => (
                        <div key={p.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950 truncate">{p.title}</p>
                              <p className="mt-1 text-xs text-slate-500">{p.city} · ₦{Number(p.price).toLocaleString()}</p>
                            </div>
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${PROPERTY_STATUS[p.status]?.cls ?? 'bg-gray-100 text-gray-600'}`}>
                              {PROPERTY_STATUS[p.status]?.label ?? 'Unknown'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Row 4: KPI summary strip */}
                <div className="bg-slate-900 rounded-2xl p-5 md:p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-transparent to-violet-900/20" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="text-base font-bold text-white">Platform KPIs</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Live performance snapshot</p>
                      </div>
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Occupancy Rate', value: `${occupancyRate}%`, sub: 'of all listings taken', color: 'text-emerald-400' },
                        { label: 'Est. Platform Revenue', value: `₦${(stats.properties * 320_000 / 1_000_000).toFixed(1)}M`, sub: 'based on active listings', color: 'text-blue-400' },
                        { label: 'Avg. Enquiries/Listing', value: stats.properties > 0 ? (stats.enquiries / stats.properties).toFixed(1) : '0', sub: 'engagement rate', color: 'text-violet-400' },
                        { label: 'Pending Approvals', value: stats.pendingLandlords, sub: 'landlords awaiting review', color: stats.pendingLandlords > 0 ? 'text-amber-400' : 'text-slate-400' },
                      ].map(k => (
                        <div key={k.label} className="bg-white/5 rounded-xl p-4 border border-white/6">
                          <p className={`text-2xl font-extrabold ${k.color}`}>{k.value}</p>
                          <p className="text-xs font-semibold text-white mt-1">{k.label}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{k.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
