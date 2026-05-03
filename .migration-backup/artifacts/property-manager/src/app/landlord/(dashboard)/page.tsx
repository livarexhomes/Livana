export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Plus, Building2, CheckCircle2, XCircle, MessageSquare, ChevronRight, MapPin } from 'lucide-react'

const statusStyles: Record<string, string> = {
  available: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  taken: 'bg-rose-50 text-rose-700 border-rose-100',
  coming_soon: 'bg-blue-50 text-blue-700 border-blue-100',
  under_negotiation: 'bg-amber-50 text-amber-700 border-amber-100',
}

const enquiryStatusStyles: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  replied: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

export default async function LandlordDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: landlord } = await supabase
    .from('landlords')
    .select('id, full_name')
    .eq('user_id', user.id)
    .single()

  if (!landlord) redirect('/login')

  const [
    { count: total },
    { count: available },
    { count: taken },
    { count: openEnquiries },
    { data: recentListings },
    { data: recentEnquiries },
  ] = await Promise.all([
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('landlord_id', landlord.id),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('landlord_id', landlord.id).eq('status', 'available'),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('landlord_id', landlord.id).eq('status', 'taken'),
    supabase.from('enquiries').select('*', { count: 'exact', head: true }).eq('landlord_id', landlord.id).eq('status', 'open'),
    supabase
      .from('properties')
      .select('id, title, city, price, type, status, created_at')
      .eq('landlord_id', landlord.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('enquiries')
      .select('id, message, status, created_at, properties(id, title)')
      .eq('landlord_id', landlord.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const statCards = [
    { label: 'Total Listings', value: total ?? 0, icon: Building2, color: 'indigo' },
    { label: 'Available', value: available ?? 0, icon: CheckCircle2, color: 'emerald' },
    { label: 'Taken', value: taken ?? 0, icon: XCircle, color: 'rose' },
    { label: 'Open Enquiries', value: openEnquiries ?? 0, icon: MessageSquare, color: 'amber' },
  ]

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Overview</h1>
          <p className="text-sm text-slate-500 font-medium">Your listings and enquiries at a glance.</p>
        </div>
        <Link
          href="/landlord/listings/new"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
        >
          <Plus size={18} strokeWidth={3} />
          Add Listing
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all group">
            <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center transition-transform group-hover:scale-110 ${colorMap[card.color]}`}>
              <card.icon size={22} />
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{card.value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Recent listings table */}
        <div className="xl:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-indigo-600 rounded-full" />
              <h3 className="text-lg font-black text-slate-900">Recent Listings</h3>
            </div>
            <Link href="/landlord/listings" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group">
              View all <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Property</th>
                  <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</th>
                  <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {!recentListings?.length ? (
                  <tr>
                    <td colSpan={3} className="px-8 py-20 text-center">
                      <Building2 className="mx-auto text-slate-200 mb-4" size={48} />
                      <p className="text-slate-400 font-medium">No listings yet.</p>
                      <Link href="/landlord/listings/new" className="text-sm text-indigo-600 font-medium hover:underline mt-2 inline-block">
                        Add your first listing
                      </Link>
                    </td>
                  </tr>
                ) : (
                  (recentListings as any[]).map((p) => (
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

        {/* Recent enquiries panel */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden h-fit">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900">Recent Enquiries</h3>
            <Link href="/landlord/enquiries" className="text-indigo-600 hover:text-indigo-800 transition-colors">
              <MessageSquare size={20} />
            </Link>
          </div>

          <div className="p-4 space-y-2">
            {!recentEnquiries?.length ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400 font-medium">
                No enquiries yet.
              </div>
            ) : (
              (recentEnquiries as any[]).map((e) => (
                <div key={e.id} className="flex items-start gap-3 p-4 rounded-2xl hover:bg-slate-50 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare size={14} className="text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{e.properties?.title ?? '—'}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{e.message}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${enquiryStatusStyles[e.status]}`}>
                    {e.status}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-slate-50/50 border-t border-slate-50">
            <Link href="/landlord/enquiries" className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 transition-all">
              See All Enquiries
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
