import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import {
  Heart, MessageSquare, User, ArrowRight, Clock, MapPin, Building2, Menu,
} from 'lucide-react'
import AuthGuard from '../../components/AuthGuard'
import UserSidebar from '../../components/UserSidebar'
import { createClient } from '../../lib/supabase'
import type { Tenant } from '../../lib/types'

export function UserLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [location] = useLocation()

  useEffect(() => { setSidebarOpen(false) }, [location])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })
      const { data: t } = await supabase.from('tenants').select('*').eq('user_id', user.id).single() as { data: Tenant | null }
      setTenant(t)
    })
  }, [])

  const displayName = tenant?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'U'

  return (
    <div className="flex min-h-screen bg-[#F4F6FB]">
      <UserSidebar
        displayName={displayName}
        userEmail={user?.email}
        initials={initials}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Mobile hamburger */}
      <button type="button" onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
        aria-label="Open menu">
        <Menu className="w-4 h-4" />
      </button>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-4 bg-white border-b border-gray-100 shrink-0">
          <h1 className="text-base font-extrabold text-gray-900 tracking-tight">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <span className="text-sm font-semibold text-gray-700 hidden sm:block">{displayName}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">{children}</main>
      </div>
    </div>
  )
}

export default function UserDashboardPage() {
  const [stats, setStats] = useState({ saved: 0, enquiries: 0 })
  const [recentEnquiries, setRecentEnquiries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single() as { data: { id: string } | null }
      if (!tenant) { setLoading(false); return }
      const [savedRes, enqRes] = await Promise.all([
        supabase.from('saved_properties').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
        supabase.from('enquiries').select('*, properties(title, city, price)').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(4),
      ])
      setStats({ saved: savedRes.count ?? 0, enquiries: enqRes.count ?? 0 })
      setRecentEnquiries(enqRes.data ?? [])
      setLoading(false)
    })
  }, [])

  return (
    <AuthGuard require="tenant">
      <UserLayout title="My Dashboard">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-5 max-w-3xl">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4">
              <Link href="/user/saved"
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                  <Heart className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-3xl font-extrabold text-gray-900">{stats.saved}</p>
                <p className="text-sm text-gray-500 mt-1">Saved properties</p>
                <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold mt-3 group-hover:gap-2 transition-all">
                  View saved <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
              <Link href="/user/enquiries"
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-extrabold text-gray-900">{stats.enquiries}</p>
                <p className="text-sm text-gray-500 mt-1">Enquiries sent</p>
                <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold mt-3 group-hover:gap-2 transition-all">
                  View enquiries <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            </div>

            {/* Recent Enquiries */}
            {recentEnquiries.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-900">Recent Enquiries</h2>
                  <Link href="/user/enquiries" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="divide-y divide-gray-50">
                  {recentEnquiries.map((e: any) => (
                    <div key={e.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{e.properties?.title ?? 'Property'}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          {e.properties?.city && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{e.properties.city}</span>}
                          {e.properties?.price && <span>· ₦{Number(e.properties.price).toLocaleString()}</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{e.message}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          e.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>{e.status}</span>
                        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-0.5 justify-end">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(e.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { href: '/listings',        icon: Building2,     label: 'Browse all listings',    accent: true  },
                  { href: '/user/profile',     icon: User,          label: 'Update your profile',    accent: false },
                  { href: '/user/saved',       icon: Heart,         label: 'View saved properties',  accent: false },
                  { href: '/user/enquiries',   icon: MessageSquare, label: 'My enquiries',           accent: false },
                ].map(a => {
                  const Icon = a.icon
                  return (
                    <Link key={a.href} href={a.href}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:shadow-sm ${
                        a.accent
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20'
                          : 'bg-slate-50 border border-gray-100 text-gray-700 hover:bg-gray-100'
                      }`}>
                      <Icon className={`w-5 h-5 ${a.accent ? 'text-white' : 'text-gray-400'}`} strokeWidth={1.7} />
                      {a.label}
                      <ArrowRight className={`w-4 h-4 ml-auto ${a.accent ? 'text-white/70' : 'text-gray-400'}`} />
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </UserLayout>
    </AuthGuard>
  )
}
