import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import {
  Building2, MessageSquare, Eye, Plus, TrendingUp,
  ArrowRight, Clock, CheckCircle, AlertCircle, MapPin,
} from 'lucide-react'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Landlord, Property } from '../../lib/types'

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  available:         { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Available' },
  taken:             { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Taken' },
  coming_soon:       { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Coming Soon' },
  under_negotiation: { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Negotiating' },
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function LandlordDashboard() {
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [stats, setStats] = useState({ listings: 0, enquiries: 0, available: 0, taken: 0 })
  const [recentListings, setRecentListings] = useState<Property[]>([])
  const [recentEnquiries, setRecentEnquiries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })
      const { data: l } = await supabase
        .from('landlords').select('*').eq('user_id', user.id).single() as { data: Landlord | null }
      setLandlord(l)
      if (l) {
        const [propsRes, enqsRes] = await Promise.all([
          supabase.from('properties').select('*').eq('landlord_id', l.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('enquiries').select('*, properties(title)').eq('landlord_id', l.id).order('created_at', { ascending: false }).limit(4),
        ])
        const props = (propsRes.data as Property[] | null) ?? []
        const enqs  = enqsRes.data ?? []
        setRecentListings(props)
        setRecentEnquiries(enqs)
        setStats({
          listings: props.length,
          enquiries: enqs.length,
          available: props.filter(p => p.status === 'available').length,
          taken: props.filter(p => p.status === 'taken').length,
        })
      }
      setLoading(false)
    })
  }, [])

  const displayName = landlord?.full_name || user?.email?.split('@')[0] || 'Landlord'
  const occupancyRate = stats.listings > 0 ? Math.round((stats.taken / stats.listings) * 100) : 0

  return (
    <AuthGuard require="landlord">
      <div className="flex min-h-screen bg-slate-50">
        <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} isVerified={landlord?.is_verified} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* ── Header ── */}
          <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-4 bg-white border-b border-gray-100 shrink-0">
            <div>
              <p className="text-xs text-gray-400 font-medium">{greeting()},</p>
              <h1 className="text-base font-extrabold text-gray-900 tracking-tight">{displayName}</h1>
            </div>
            <Link href="/landlord/listings/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-600/20 transition-colors">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Listing</span>
            </Link>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-5">
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {/* Pending / Rejected notice */}
                {landlord?.status === 'pending' && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Account under review</p>
                      <p className="text-xs text-amber-600 mt-0.5">Your account is pending admin approval. You'll be notified once verified.</p>
                    </div>
                  </div>
                )}
                {landlord?.status === 'rejected' && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-800">Account not approved</p>
                      <p className="text-xs text-red-600 mt-0.5">Contact support at support@livana.com to resolve this issue.</p>
                    </div>
                  </div>
                )}

                {/* ── Stat cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  {[
                    { label: 'Total Listings', value: stats.listings, icon: Building2, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', trend: null },
                    { label: 'Available',       value: stats.available, icon: CheckCircle, iconBg: 'bg-green-50', iconColor: 'text-green-600', trend: null },
                    { label: 'Enquiries',       value: stats.enquiries, icon: MessageSquare, iconBg: 'bg-violet-50', iconColor: 'text-violet-600', trend: null },
                    { label: 'Occupancy Rate', value: `${occupancyRate}%`, icon: TrendingUp, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', trend: null },
                  ].map(s => {
                    const Icon = s.icon
                    return (
                      <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-tight">{s.label}</p>
                          <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${s.iconColor}`} strokeWidth={1.7} />
                          </div>
                        </div>
                        <p className="text-2xl md:text-3xl font-extrabold text-gray-900">{s.value}</p>
                      </div>
                    )
                  })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                  {/* ── Recent Listings ── */}
                  <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                      <h2 className="text-sm font-bold text-gray-900">Recent Listings</h2>
                      <Link href="/landlord/listings" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        View all <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                    {recentListings.length === 0 ? (
                      <div className="py-16 text-center px-6">
                        <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 font-medium mb-4">No listings yet</p>
                        <Link href="/landlord/listings/new"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl">
                          <Plus className="w-4 h-4" /> Add your first listing
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {recentListings.map((p: any) => {
                          const st = STATUS_STYLE[p.status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: p.status }
                          return (
                            <div key={p.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                <Building2 className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                  <MapPin className="w-3 h-3" />
                                  {p.city} · ₦{Number(p.price).toLocaleString()}
                                </div>
                              </div>
                              <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${st.bg} ${st.text}`}>
                                {st.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* ── Recent Enquiries ── */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                      <h2 className="text-sm font-bold text-gray-900">Recent Enquiries</h2>
                      <Link href="/landlord/enquiries" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        View all <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                    {recentEnquiries.length === 0 ? (
                      <div className="py-16 text-center px-6">
                        <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 font-medium">No enquiries yet</p>
                        <p className="text-xs text-gray-400 mt-1">They'll appear once tenants message you.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {recentEnquiries.map((e: any) => (
                          <div key={e.id} className="px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                            <div className="flex items-start gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                                <MessageSquare className="w-3.5 h-3.5 text-violet-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-800 truncate">
                                  {e.properties?.title ?? 'Property enquiry'}
                                </p>
                                <p className="text-xs text-gray-500 truncate mt-0.5 leading-relaxed">
                                  {e.message?.slice(0, 60)}{e.message?.length > 60 ? '…' : ''}
                                </p>
                                <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(e.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                  <span className={`ml-2 px-1.5 py-0.5 rounded-full font-bold ${
                                    e.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                  }`}>{e.status}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Quick Actions ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { href: '/landlord/listings/new', icon: Plus,         label: 'Add Listing',     bg: 'bg-blue-600', text: 'text-white' },
                      { href: '/landlord/enquiries',    icon: MessageSquare, label: 'View Enquiries',  bg: 'bg-violet-50', text: 'text-violet-700' },
                      { href: '/listings',              icon: Eye,           label: 'Browse Market',   bg: 'bg-slate-50', text: 'text-gray-700' },
                      { href: '/landlord/profile',      icon: Building2,     label: 'Edit Profile',    bg: 'bg-slate-50', text: 'text-gray-700' },
                    ].map(a => {
                      const Icon = a.icon
                      return (
                        <Link key={a.href} href={a.href}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl ${a.bg} ${a.text} hover:opacity-90 transition-opacity text-center`}>
                          <Icon className="w-5 h-5" strokeWidth={1.7} />
                          <span className="text-xs font-bold">{a.label}</span>
                        </Link>
                      )
                    })}
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
