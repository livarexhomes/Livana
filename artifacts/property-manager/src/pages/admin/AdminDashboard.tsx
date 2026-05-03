import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { Bell, Search, TrendingUp, Building2, Users, CheckCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const revenueData = MONTHS.map((month, i) => ({
  month,
  current: Math.floor(Math.random() * 8 + 2) * 1_000_000 + i * 400_000,
  previous: Math.floor(Math.random() * 5 + 1) * 1_000_000 + i * 200_000,
}))

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export default function AdminDashboard() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [stats, setStats] = useState({ properties: 0, active: 0, occupied: 0, landlords: 0, pendingLandlords: 0, tenants: 0, enquiries: 0 })
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

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
      ] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'available'),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'taken'),
        supabase.from('landlords').select('id', { count: 'exact', head: true }),
        supabase.from('landlords').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
        supabase.from('enquiries').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        properties: propCount ?? 0,
        active: activeCount ?? 0,
        occupied: occupiedCount ?? 0,
        landlords: landlordCount ?? 0,
        pendingLandlords: pendingCount ?? 0,
        tenants: tenantCount ?? 0,
        enquiries: enqCount ?? 0,
      })
      setLoading(false)
    })
  }, [])

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'
  const totalProfit = (stats.properties * 320_000).toLocaleString('en-NG', { maximumFractionDigits: 0 })

  return (
    <AuthGuard require="admin">
      <div className="flex min-h-screen bg-slate-50">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* ── Top Header ── */}
          <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-white border-b border-gray-100 shrink-0">
            <div>
              <h1 className="text-sm font-bold text-gray-900">{greeting()}, {displayName} 👋</h1>
              <p className="text-[11px] text-gray-400 font-medium">Dashboard</p>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 w-44 md:w-56">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input placeholder="Search…" className="bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none w-full" />
              </div>
              <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                <Bell className="w-4 h-4 text-gray-600" />
                {stats.pendingLandlords > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white" />
                )}
              </button>
            </div>
          </header>

          {/* ── Main ── */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4 md:space-y-5">

            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {/* ── Row 1: Stat cards + Hero banner ── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
                  {/* Stat cards (left) */}
                  <div className="lg:col-span-2 grid grid-cols-2 gap-3 md:gap-4">
                    {/* Total Listings */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Listings</p>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                      <p className="text-3xl font-extrabold text-gray-900">{stats.properties}</p>
                    </div>

                    {/* Active */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active</p>
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                      <p className="text-3xl font-extrabold text-gray-900">{stats.active}</p>
                    </div>

                    {/* Occupied */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Occupied</p>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
                        </div>
                      </div>
                      <p className="text-3xl font-extrabold text-gray-900">{stats.occupied}</p>
                    </div>

                    {/* Landlords */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Landlords</p>
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                          <Users className="w-4 h-4 text-purple-600" />
                        </div>
                      </div>
                      <p className="text-3xl font-extrabold text-gray-900">{stats.landlords}</p>
                      {stats.pendingLandlords > 0 && (
                        <p className="text-[10px] text-orange-600 font-bold mt-1">{stats.pendingLandlords} pending</p>
                      )}
                    </div>
                  </div>

                  {/* Hero banner (right) */}
                  <div className="lg:col-span-3 relative overflow-hidden rounded-2xl min-h-[200px] lg:min-h-0">
                    <img
                      src="https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&q=80"
                      alt="Luxury property"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-900/60 to-transparent" />
                    <div className="relative z-10 p-6 md:p-8 flex flex-col justify-between h-full">
                      <div>
                        <span className="inline-block px-3 py-1 bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                          Portfolio Highlight
                        </span>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-3">
                          Discover High-Yield<br />Properties.
                        </h2>
                        <p className="text-blue-100 text-sm leading-relaxed max-w-xs">
                          Manage your luxury listings, monitor partner performance, and close deals faster with our advanced routing engine.
                        </p>
                      </div>
                      <div className="mt-6">
                        <Link href="/admin/properties"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 text-sm font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
                          View Analytics
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Row 2: Revenue chart + Sales statistic ── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
                  {/* Revenue overview */}
                  <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-4 md:p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Revenue Overview</h3>
                        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mt-0.5">Current year vs previous</p>
                      </div>
                      <select
                        value={year}
                        onChange={e => setYear(Number(e.target.value))}
                        className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
                      </select>
                    </div>
                    <div className="h-52 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueData} barGap={2} barCategoryGap="30%">
                          <CartesianGrid vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Tooltip
                            formatter={(v: number) => [`₦${(v / 1_000_000).toFixed(1)}M`, '']}
                            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}
                          />
                          <Bar dataKey="previous" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="current" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />
                        <span className="text-xs text-gray-500 font-medium">Current Year</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-blue-200 inline-block" />
                        <span className="text-xs text-gray-500 font-medium">Previous Year</span>
                      </div>
                    </div>
                  </div>

                  {/* Sales statistic */}
                  <div className="lg:col-span-2 bg-gray-950 rounded-2xl p-5 md:p-6 relative overflow-hidden shadow-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 to-transparent" />
                    <div className="relative z-10 h-full flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white mb-5">Sales Statistic</h3>

                        <div className="mb-5 pb-5 border-b border-white/10">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Total Profit</p>
                          <div className="flex items-end gap-2">
                            <p className="text-2xl font-extrabold text-white">₦{totalProfit}</p>
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-md mb-0.5">
                              <TrendingUp className="w-3 h-3" /> +12%
                            </span>
                          </div>
                        </div>

                        <div className="mb-5 pb-5 border-b border-white/10">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Network Partners</p>
                          <div className="flex items-center justify-between">
                            <p className="text-2xl font-extrabold text-white">{stats.landlords}</p>
                            <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-md">Active</span>
                          </div>
                        </div>

                        <div className="mb-5 pb-5 border-b border-white/10">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Registered Tenants</p>
                          <p className="text-2xl font-extrabold text-white">{stats.tenants}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Total Enquiries</p>
                          <p className="text-2xl font-extrabold text-white">{stats.enquiries}</p>
                        </div>
                      </div>

                      {stats.pendingLandlords > 0 && (
                        <Link href="/admin/landlords?filter=pending"
                          className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors">
                          {stats.pendingLandlords} Pending Approval
                        </Link>
                      )}
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
