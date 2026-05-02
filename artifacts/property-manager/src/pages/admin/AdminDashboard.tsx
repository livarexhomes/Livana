import { useState, useEffect } from 'react'
import AdminSidebar from '../../components/AdminSidebar'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

export default function AdminDashboard() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [stats, setStats] = useState({ properties: 0, landlords: 0, pendingLandlords: 0, tenants: 0, enquiries: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })
      const [
        { count: propCount },
        { count: landlordCount },
        { count: pendingCount },
        { count: tenantCount },
        { count: enqCount },
      ] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('landlords').select('id', { count: 'exact', head: true }),
        supabase.from('landlords').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
        supabase.from('enquiries').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        properties: propCount ?? 0,
        landlords: landlordCount ?? 0,
        pendingLandlords: pendingCount ?? 0,
        tenants: tenantCount ?? 0,
        enquiries: enqCount ?? 0,
      })
      setLoading(false)
    })
  }, [])

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <AuthGuard require="admin">
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <AdminSidebar userEmail={user?.email} userName={displayName} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-100 shrink-0">
            <div>
              <p className="text-sm text-gray-500">{greeting()},</p>
              <h1 className="text-base font-semibold text-gray-900">{displayName}</h1>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-[#aadb5a] border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Total Properties', value: stats.properties, color: 'text-[#4a7f4d] bg-[#6b9e6e]/10' },
                    { label: 'Approved Landlords', value: stats.landlords, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Pending Approval', value: stats.pendingLandlords, color: 'text-amber-600 bg-amber-50', urgent: stats.pendingLandlords > 0 },
                    { label: 'Registered Tenants', value: stats.tenants, color: 'text-purple-600 bg-purple-50' },
                    { label: 'Total Enquiries', value: stats.enquiries, color: 'text-indigo-600 bg-indigo-50' },
                  ].map(s => (
                    <div key={s.label} className={`bg-white rounded-2xl border p-5 ${s.urgent ? 'border-amber-200' : 'border-gray-200'}`}>
                      <p className={`text-3xl font-bold ${s.color.split(' ')[0]}`}>{s.value}</p>
                      <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                      {s.urgent && <p className="text-xs text-amber-600 font-medium mt-1">Needs action</p>}
                    </div>
                  ))}
                </div>

                {stats.pendingLandlords > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-amber-800">
                        {stats.pendingLandlords} landlord{stats.pendingLandlords !== 1 ? 's' : ''} waiting for approval
                      </p>
                      <p className="text-sm text-amber-600 mt-0.5">Review and approve or reject their applications.</p>
                    </div>
                    <a href="/admin/landlords?filter=pending"
                      className="shrink-0 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-colors">
                      Review now
                    </a>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
