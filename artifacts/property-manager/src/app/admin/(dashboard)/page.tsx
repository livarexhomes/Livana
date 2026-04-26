export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { 
  Plus, 
  ArrowUpRight, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Users, 
  ChevronRight,
  Home,
  MapPin
} from 'lucide-react'

async function getStats() {
  if (!isSupabaseConfigured()) {
    return { total: 0, available: 0, unavailable: 0, landlords: 0, recentProperties: [], recentLandlords: [] }
  }
  const supabase = await createClient()

  const [
    { count: total },
    { count: available },
    { count: taken },
    { count: landlordCount },
    { data: recentProperties },
    { data: recentLandlords },
  ] = await Promise.all([
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'available'),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'taken'),
    supabase.from('landlords').select('*', { count: 'exact', head: true }),
    supabase
      .from('properties')
      .select('id, title, city, price, type, status, created_at, landlords(full_name)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('landlords')
      .select('id, full_name, whatsapp, status, created_at')
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  return {
    total: total ?? 0,
    available: available ?? 0,
    unavailable: taken ?? 0,
    landlords: landlordCount ?? 0,
    recentProperties: recentProperties ?? [],
    recentLandlords: recentLandlords ?? [],
  }
}

const statusStyles: Record<string, string> = {
  available: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  taken: 'bg-rose-50 text-rose-700 border-rose-100',
  coming_soon: 'bg-blue-50 text-blue-700 border-blue-100',
  under_negotiation: 'bg-amber-50 text-amber-700 border-amber-100',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  rejected: 'bg-rose-50 text-rose-700 border-rose-100',
}

export default async function DashboardPage() {
  const stats = await getStats()

  const statCards = [
    { label: 'Total Listings', value: stats.total, icon: Building2, color: 'indigo' },
    { label: 'Available Now', value: stats.available, icon: CheckCircle2, color: 'emerald' },
    { label: 'Currently Taken', value: stats.unavailable, icon: XCircle, color: 'rose' },
    { label: 'Active Landlords', value: stats.landlords, icon: Users, color: 'violet' },
  ]

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 space-y-8 font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Management Overview</h1>
          <p className="text-sm text-slate-500 font-medium">Real-time status of your property portfolio.</p>
        </div>
        <div className="flex items-center gap-3">
            <Link 
                href="/admin/properties/new" 
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
                <Plus size={18} strokeWidth={3} />
                Add Property
            </Link>
        </div>
      </div>

      {/* Hero Announcement Banner */}
      <div className="relative overflow-hidden rounded-[2rem] bg-indigo-600 p-8 lg:p-12 text-white shadow-2xl shadow-indigo-100">
        <div className="relative z-10 max-w-lg">
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
            Summer 2024 Update
          </span>
          <h2 className="text-3xl lg:text-4xl font-black leading-[1.1] mb-4">
            Property Performance is up 24% this month.
          </h2>
          <p className="text-indigo-100 text-sm mb-8 font-medium leading-relaxed max-w-sm">
            Check your top performing listings and see which areas are attracting the most interest.
          </p>
          <Link
            href="/admin/properties"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 text-sm font-black rounded-xl hover:bg-indigo-50 transition-all shadow-xl"
          >
            Review Performance <ArrowUpRight size={18} />
          </Link>
        </div>
        {/* Abstract Background Shapes */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute right-20 bottom-0 w-64 h-64 bg-indigo-500 rounded-full opacity-50 blur-3xl pointer-events-none" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all group">
            <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center transition-transform group-hover:scale-110 ${
                card.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                card.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                card.color === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-violet-50 text-violet-600'
            }`}>
              <card.icon size={22} />
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{card.value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Table Panel */}
        <div className="xl:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50">
            <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-indigo-600 rounded-full" />
                <h3 className="text-lg font-black text-slate-900">Recent Listings</h3>
            </div>
            <Link href="/admin/properties" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group">
              View Database <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity</th>
                  <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Management</th>
                  <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Value</th>
                  <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.recentProperties.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                        <Home className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-slate-400 font-medium">No properties recorded yet.</p>
                    </td>
                  </tr>
                ) : (
                  (stats.recentProperties as any[]).map((p) => (
                    <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{p.title}</span>
                            <div className="flex items-center gap-1 text-slate-400 mt-1">
                                <MapPin size={10} />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">{p.city}</span>
                            </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                            {p.landlords?.full_name ?? 'Internal'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-sm font-black text-slate-900">₦{Number(p.price).toLocaleString()}</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{p.type}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${statusStyles[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Landlord Side Panel */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden h-fit">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900">Partner List</h3>
            <Link href="/admin/landlords" className="text-indigo-600 hover:text-indigo-800 transition-colors">
                <Users size={20} />
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {stats.recentLandlords.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400 font-medium">
                No active partners yet.
              </div>
            ) : (
              (stats.recentLandlords as any[]).map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-indigo-600">
                      {l.full_name?.slice(0, 2).toUpperCase() ?? 'LL'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{l.full_name}</p>
                    <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-tighter">{l.whatsapp}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${l.status === 'active' || l.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
              ))
            )}
          </div>
          <div className="p-6 bg-slate-50/50 border-t border-slate-50">
            <Link href="/admin/landlords" className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 transition-all">
                See All Partners
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}