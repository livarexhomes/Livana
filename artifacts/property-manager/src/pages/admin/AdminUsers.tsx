import { useState, useEffect } from 'react'
import { Search, Phone, Users, MessageSquare, Clock, UserX } from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import AdminHeader from '../../components/AdminHeader'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600', 'from-blue-500 to-blue-700',
  'from-emerald-400 to-teal-600',  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',  'from-indigo-400 to-indigo-600',
]
function avatarGrad(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 2592000) return `${Math.floor(d / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
}

type Tenant = {
  id: string
  user_id: string
  full_name: string
  phone?: string | null
  email?: string | null
  created_at: string
  enquiry_count: number
}

export default function AdminUsers() {
  const [user, setUser]         = useState<{ email?: string } | null>(null)
  const [tenants, setTenants]   = useState<Tenant[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser({ email: user?.email }))

    supabase
      .from('tenants')
      .select('*, enquiries(count)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list: Tenant[] = (data ?? []).map((t: any) => ({
          id: t.id,
          user_id: t.user_id,
          full_name: t.full_name ?? 'Unknown Tenant',
          phone: t.phone ?? null,
          email: t.email ?? null,
          created_at: t.created_at,
          enquiry_count: t.enquiries?.[0]?.count ?? 0,
        }))
        setTenants(list)
        setLoading(false)
      })
  }, [])

  const displayName = user?.email ? user.email.split('@')[0] : 'Admin'

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase()
    return !q || t.full_name.toLowerCase().includes(q) || (t.phone ?? '').includes(q) || (t.email ?? '').toLowerCase().includes(q)
  })

  const totalEnquiries = tenants.reduce((s, t) => s + t.enquiry_count, 0)

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen overflow-hidden bg-[#F4F6FB]">
        <AdminSidebar userEmail={user?.email} userName={displayName} />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            title="Tenants"
            subtitle={`${tenants.length} registered tenants`}
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4">

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Tenants',    value: tenants.length,  icon: Users,         color: 'text-blue-600',    bg: 'bg-blue-50'    },
                { label: 'Total Enquiries',  value: totalEnquiries,  icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'This Month',       value: tenants.filter(t => new Date(t.created_at) > new Date(Date.now() - 30 * 86400000)).length, icon: Clock, color: 'text-violet-600', bg: 'bg-violet-50' },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${s.color}`} strokeWidth={1.7} />
                    </div>
                    <div>
                      <p className="text-xl font-extrabold text-gray-900 leading-tight">{s.value}</p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, phone…"
                className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent" />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : tenants.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <UserX className="w-8 h-8 text-blue-300" />
                </div>
                <p className="text-gray-800 font-bold text-base mb-1">No tenants yet</p>
                <p className="text-sm text-gray-400">Tenants who register on the platform will appear here.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <p className="text-gray-500 font-medium">No tenants match your search.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px]">
                    <thead className="bg-slate-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tenant</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Phone</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Enquiries</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map(t => {
                        const grad = avatarGrad(t.full_name)
                        const initials = getInitials(t.full_name)
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 shadow-sm`}>
                                  <span className="text-xs font-bold text-white">{initials}</span>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm leading-tight">{t.full_name}</p>
                                  {t.email && <p className="text-[11px] text-gray-400 mt-0.5">{t.email}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 hidden md:table-cell">
                              {t.phone ? (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-gray-400" />
                                  <span className="text-sm text-gray-600">{t.phone}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-300 italic">No phone</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                t.enquiry_count > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'
                              }`}>
                                <MessageSquare className="w-3 h-3" />
                                {t.enquiry_count} {t.enquiry_count === 1 ? 'enquiry' : 'enquiries'}
                              </span>
                            </td>
                            <td className="px-5 py-4 hidden sm:table-cell">
                              <span className="text-xs text-gray-400">{timeAgo(t.created_at)}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
