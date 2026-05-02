/**
 * Content-Only Advanced Blue Glassmorphism Dashboard
 * Fixes applied: Restored the bright, clear visibility of the Hero background image.
 */

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { 
  Building,
  ArrowUpRight,
  MoreVertical,
  Edit,
  Home,
  CheckCircle
} from 'lucide-react'

// --- Types ---
interface DashboardStats {
  total: number
  available: number
  unavailable: number
  landlords: number
  recentProperties: any[]
  recentLandlords: any[]
}

async function getStats(): Promise<DashboardStats> {
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
    supabase.from('properties')
      .select('id, title, city, price, type, status, created_at, landlords(full_name)')
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('landlords')
      .select('id, full_name, whatsapp, status, created_at')
      .order('created_at', { ascending: false }).limit(5),
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

// Glassy Blue Status Badges
const statusStyles: Record<string, string> = {
  available: 'bg-blue-100/60 text-blue-700 border-blue-200/50 backdrop-blur-sm',
  taken: 'bg-slate-200/60 text-slate-700 border-slate-300/50 backdrop-blur-sm',
  pending: 'bg-indigo-100/60 text-indigo-700 border-indigo-200/50 backdrop-blur-sm',
  approved: 'bg-sky-100/60 text-sky-700 border-sky-200/50 backdrop-blur-sm',
}

export default async function DashboardContent() {
  const stats = await getStats()

  return (
    <div className="w-full flex-1 bg-[#f8fafc] text-slate-800 font-sans overflow-y-auto">
      {/* Ambient background orbs — fixed so they don't affect layout */}
      <div className="fixed top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-blue-300/30 mix-blend-multiply filter blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] rounded-full bg-indigo-300/20 mix-blend-multiply filter blur-[100px] pointer-events-none" />
      <div className="fixed top-[30%] left-[40%] w-[25vw] h-[25vw] rounded-full bg-sky-200/40 mix-blend-multiply filter blur-[80px] pointer-events-none" />

      <main className="relative z-10 p-6 lg:p-10 space-y-8">

        {/* TOP GRID: Stats & Hero Block */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Quick Stats */}
          <div className="lg:col-span-1 grid grid-cols-2 gap-4">
            <div className="bg-white/50 backdrop-blur-2xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Building size={48} /></div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2 relative z-10">Total Listings</p>
              <h2 className="text-4xl font-black text-slate-900 relative z-10">{stats.total}</h2>
            </div>
            <div className="bg-white/50 backdrop-blur-2xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-600"><CheckCircle size={48} /></div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2 relative z-10">Active</p>
              <h2 className="text-4xl font-black text-blue-600 relative z-10">{stats.available}</h2>
            </div>
            <div className="col-span-2 bg-gradient-to-br from-sky-100/80 to-blue-50/80 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/80 shadow-sm flex items-center justify-between group">
              <div>
                <p className="text-blue-800/60 text-[10px] font-bold uppercase tracking-widest mb-1">Occupied</p>
                <h2 className="text-3xl font-black text-blue-950">{stats.unavailable}</h2>
              </div>
              <div className="w-14 h-14 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-blue-600 shadow-[0_4px_20px_rgb(37,99,235,0.15)] group-hover:scale-110 transition-transform duration-500">
                <Home size={24} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Right: Deep Blue Hero Block (FIXED IMAGE VISIBILITY) */}
          <div className="lg:col-span-2 relative bg-[#0B192C] rounded-[2rem] overflow-hidden shadow-xl border border-[#112240] group">
            {/* Adjusted image: Removed mix-blend and raised opacity to 80% */}
            <img 
              src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
              alt="Premium Property" 
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
            />
            {/* Adjusted gradient: Fades out completely to transparent on the right side */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B192C]/95 via-[#0B192C]/60 to-transparent" />
            
            <div className="relative z-10 p-8 lg:p-10 h-full flex flex-col justify-between max-w-lg">
              <span className="inline-block px-4 py-1.5 bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] rounded-full w-fit">
                Portfolio Highlight
              </span>
              <div>
                <h2 className="text-3xl lg:text-4xl font-black text-white leading-[1.15] mb-4">
                  Discover High-Yield Properties.
                </h2>
                <p className="text-blue-100/90 text-sm font-medium mb-8 max-w-md leading-relaxed">
                  Manage your luxury listings, monitor partner performance, and close deals faster with our advanced routing engine.
                </p>
                <button className="px-6 py-3 bg-white hover:bg-blue-50 text-blue-900 text-sm font-bold rounded-xl transition-colors shadow-lg shadow-white/10">
                  View Analytics
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE GRID: Charts & Demographics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/50 backdrop-blur-2xl p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Revenue Overview</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Current Year vs Previous</p>
              </div>
              <select className="bg-white/80 backdrop-blur-md border border-slate-200 text-sm font-bold text-slate-700 rounded-xl px-4 py-2 outline-none hover:border-blue-400 transition-colors shadow-sm">
                <option>2026</option>
                <option>2025</option>
              </select>
            </div>
            
            <div className="h-56 flex items-end justify-between gap-3 px-2">
              {[40, 60, 45, 80, 50, 90, 65, 100, 75, 40, 55, 30].map((height, i) => (
                <div key={i} className="w-full bg-slate-100/50 rounded-t-xl relative group flex items-end justify-center h-full">
                   <div 
                    style={{ height: `${height}%` }} 
                    className="w-full bg-gradient-to-t from-blue-600 to-sky-400 rounded-t-xl transition-all duration-500 group-hover:opacity-80 shadow-[0_0_15px_rgb(56,189,248,0.2)]"
                   />
                   <div className="absolute -top-10 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      ₦{(height * 1.5).toFixed(1)}M
                   </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-6 px-2">
              <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0B192C] to-[#112240] p-8 rounded-[2rem] shadow-xl border border-slate-700 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[80px] opacity-20 -mr-20 -mt-20 pointer-events-none group-hover:opacity-40 transition-opacity duration-700" />
            
            <h3 className="text-lg font-black mb-8 relative z-10 tracking-tight">Sales Statistic</h3>
            <div className="space-y-8 relative z-10">
              <div>
                <p className="text-blue-300/60 text-[10px] font-bold uppercase tracking-widest mb-2">Total Profit</p>
                <div className="flex items-end gap-3">
                  <h2 className="text-4xl font-black tracking-tighter">₦24.9M</h2>
                  <span className="flex items-center text-[10px] font-bold text-sky-400 bg-sky-400/10 px-2 py-1 rounded-md mb-1.5">
                    <ArrowUpRight size={12} className="mr-0.5" /> +12%
                  </span>
                </div>
              </div>
              <div className="pt-8 border-t border-slate-700/50">
                <p className="text-blue-300/60 text-[10px] font-bold uppercase tracking-widest mb-2">Network Partners</p>
                <div className="flex items-end gap-3">
                  <h2 className="text-4xl font-black tracking-tighter">{stats.landlords}</h2>
                  <span className="flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md mb-1.5">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM GRID: Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
          
          {/* Property List */}
          <div className="lg:col-span-2 bg-white/50 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 overflow-hidden relative">
             <div className="absolute inset-0 border border-white/80 rounded-[2.5rem] pointer-events-none" />
            
            <div className="flex justify-between items-center p-8 border-b border-slate-200/50 relative z-10">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Active Properties</h3>
              <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 transition-all">
                Filter <MoreVertical size={14} />
              </button>
            </div>
            
            <div className="overflow-x-auto relative z-10">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-slate-100">
                  {stats.recentProperties.map((p) => (
                    <tr key={p.id} className="hover:bg-white/60 transition-colors duration-300 group">
                      <td className="p-5 pl-8">
                        <div className="flex items-center gap-5">
                          <div className="w-20 h-14 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0 relative shadow-sm border border-white">
                             <img 
                                src={`https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=150&q=80`} 
                                alt="thumb" 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">{p.title}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">{p.city}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Contact</p>
                        <p className="text-sm font-bold text-slate-700">{p.landlords?.full_name ?? 'Internal'}</p>
                      </td>
                      <td className="p-5">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Price</p>
                        <p className="text-sm font-black text-slate-900">₦{Number(p.price).toLocaleString()}</p>
                      </td>
                      <td className="p-5">
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${statusStyles[p.status] || statusStyles.taken}`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-5 pr-8 text-right">
                        <button className="p-2.5 text-slate-400 hover:text-blue-600 transition-colors rounded-xl hover:bg-blue-50">
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Partner/Messages List */}
          <div className="bg-white/50 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 overflow-hidden flex flex-col relative">
            <div className="absolute inset-0 border border-white/80 rounded-[2.5rem] pointer-events-none" />
            
            <div className="flex justify-between items-center p-8 border-b border-slate-200/50 relative z-10">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Directory</h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white border border-slate-100 px-3 py-1.5 rounded-lg shadow-sm">Newest</span>
            </div>
            
            <div className="p-5 flex-1 space-y-2 relative z-10">
              {stats.recentLandlords.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/80 hover:shadow-sm border border-transparent hover:border-white transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-50 border border-blue-200 text-blue-600 flex items-center justify-center font-black text-sm shadow-inner group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                      {l.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{l.full_name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{l.whatsapp}</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {new Date(l.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}