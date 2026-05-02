import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { Building2, MessageSquare, Eye, Plus } from 'lucide-react'
import LandlordSidebar from '../../components/LandlordSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Landlord, Property } from '../../lib/types'

export default function LandlordDashboard() {
  const [landlord, setLandlord] = useState<Landlord | null>(null)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [stats, setStats] = useState({ listings: 0, enquiries: 0, available: 0 })
  const [recentListings, setRecentListings] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })
      const { data: l } = await supabase.from('landlords').select('*').eq('user_id', user.id).single() as { data: Landlord | null }
      setLandlord(l)
      if (l) {
        const [propsResult, enqsResult] = await Promise.all([
          supabase.from('properties').select('*').eq('landlord_id', l.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('enquiries').select('id').eq('landlord_id', l.id),
        ])
        const props = propsResult.data as Property[] | null
        const enqs = enqsResult.data as { id: string }[] | null
        const allProps = props ?? []
        setRecentListings(allProps)
        setStats({
          listings: allProps.length,
          enquiries: enqs?.length ?? 0,
          available: allProps.filter(p => p.status === 'available').length,
        })
      }
      setLoading(false)
    })
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const statusStyles: Record<string, string> = {
    available: 'bg-green-100 text-green-700',
    taken: 'bg-red-100 text-red-700',
    coming_soon: 'bg-blue-100 text-blue-700',
    under_negotiation: 'bg-yellow-100 text-yellow-700',
  }

  return (
    <AuthGuard require="landlord">
      <div className="flex min-h-screen bg-gray-50">
        <LandlordSidebar userName={landlord?.full_name} userEmail={user?.email} isVerified={landlord?.is_verified} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-100 shrink-0">
            <div>
              <p className="text-sm text-gray-500">{greeting()},</p>
              <h1 className="text-base font-semibold text-gray-900">{landlord?.full_name ?? user?.email ?? 'Landlord'}</h1>
            </div>
            <Link href="/landlord/listings/new"
              className="flex items-center gap-2 px-4 py-2 bg-[#6b9e6e] hover:bg-[#4a7f4d] text-white text-sm font-semibold rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Add Listing
            </Link>
          </header>

          <main className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-[#aadb5a] border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total Listings', value: stats.listings, icon: <Building2 className="w-5 h-5" />, color: 'text-[#6b9e6e] bg-[#6b9e6e]/10' },
                    { label: 'Available', value: stats.available, icon: <Eye className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Enquiries', value: stats.enquiries, icon: <MessageSquare className="w-5 h-5" />, color: 'text-purple-600 bg-purple-50' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
                      <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Recent listings */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">Recent Listings</h2>
                    <Link href="/landlord/listings" className="text-sm text-[#6b9e6e] hover:text-[#4a7f4d] font-medium">View all</Link>
                  </div>
                  {recentListings.length === 0 ? (
                    <div className="text-center py-10">
                      <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 mb-4">No listings yet.</p>
                      <Link href="/landlord/listings/new" className="inline-flex items-center gap-2 px-4 py-2 bg-[#6b9e6e] text-white text-sm font-semibold rounded-xl">
                        <Plus className="w-4 h-4" /> Add your first listing
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentListings.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{p.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{p.city} · ₦{Number(p.price).toLocaleString()}</p>
                          </div>
                          <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {p.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
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
