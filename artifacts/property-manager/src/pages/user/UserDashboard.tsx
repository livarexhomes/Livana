import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import {
  Heart, MessageSquare, User, LayoutDashboard, Building2,
  LogOut, Menu, X, ArrowRight, Clock, MapPin, Search,
} from 'lucide-react'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Tenant } from '../../lib/types'

const userNav = [
  { href: '/user',            label: 'Overview',   icon: LayoutDashboard, exact: true  },
  { href: '/user/saved',      label: 'Saved',       icon: Heart,           exact: false },
  { href: '/user/enquiries',  label: 'Enquiries',   icon: MessageSquare,   exact: false },
  { href: '/user/profile',    label: 'Profile',     icon: User,            exact: false },
]

function UserSidebar({ tenant, open, onClose }: { tenant: Tenant | null; open: boolean; onClose: () => void }) {
  const [location] = useLocation()

  function isActive(item: { href: string; exact: boolean }) {
    return item.exact ? location === item.href : location.startsWith(item.href)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const displayName = tenant?.full_name || 'User'
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'U'

  const Content = ({ mobile = false }) => (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow shadow-blue-600/20 shrink-0">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </div>
        <span className="text-base font-extrabold text-gray-900 tracking-tight flex-1">Livana</span>
        {mobile && (
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 pt-5 pb-2 space-y-0.5 overflow-y-auto">
        {userNav.map(item => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} onClick={onClose}
              className={`group flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                active ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}>
              <Icon className={`w-5 h-5 shrink-0 transition-colors ${
                active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
              }`} strokeWidth={1.7} />
              {item.label}
            </Link>
          )
        })}

        <div className="pt-5 pb-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Explore</p>
        </div>
        <Link href="/listings" onClick={onClose}
          className="group flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors">
          <Building2 className="w-5 h-5 shrink-0 text-gray-400 group-hover:text-gray-600" strokeWidth={1.7} />
          Browse Listings
        </Link>
        <Link href="/listings" onClick={onClose}
          className="group flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors">
          <Search className="w-5 h-5 shrink-0 text-gray-400 group-hover:text-gray-600" strokeWidth={1.7} />
          Search Properties
        </Link>
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-sm font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">Tenant</p>
          </div>
          <button type="button" onClick={handleLogout} title="Sign out"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden md:flex w-60 xl:w-64 shrink-0 flex-col bg-white border-r border-gray-100 min-h-screen sticky top-0 z-30">
        <Content />
      </aside>

      {/* hamburger handled by UserLayout — this element removed to avoid duplication */}

      <div onClick={onClose}
        className={`md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`} />

      <div className={`md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 shadow-2xl transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Content mobile />
      </div>
    </>
  )
}

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
    <div className="flex min-h-screen bg-slate-50">
      <UserSidebar tenant={tenant} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile hamburger — separate from sidebar so it stays visible */}
      <button type="button"
        onClick={() => setSidebarOpen(true)}
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
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{displayName}</span>
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
            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 gap-4">
              <Link href="/user/saved"
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                  <Heart className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-3xl font-extrabold text-gray-900">{stats.saved}</p>
                <p className="text-sm text-gray-500 mt-0.5">Saved properties</p>
                <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold mt-3 group-hover:gap-2 transition-all">
                  View saved <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
              <Link href="/user/enquiries"
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-extrabold text-gray-900">{stats.enquiries}</p>
                <p className="text-sm text-gray-500 mt-0.5">Enquiries sent</p>
                <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold mt-3 group-hover:gap-2 transition-all">
                  View enquiries <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            </div>

            {/* ── Recent Enquiries ── */}
            {recentEnquiries.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-900">Recent Enquiries</h2>
                  <Link href="/user/enquiries" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
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

            {/* ── Quick Actions ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href="/listings"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
                  <Building2 className="w-5 h-5" strokeWidth={1.7} />
                  Browse all listings
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Link>
                <Link href="/user/profile"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-50 border border-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors">
                  <User className="w-5 h-5 text-gray-400" strokeWidth={1.7} />
                  Update your profile
                  <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
                </Link>
                <Link href="/user/saved"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-50 border border-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors">
                  <Heart className="w-5 h-5 text-red-400" strokeWidth={1.7} />
                  View saved properties
                  <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
                </Link>
                <Link href="/user/enquiries"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-50 border border-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors">
                  <MessageSquare className="w-5 h-5 text-violet-400" strokeWidth={1.7} />
                  My enquiries
                  <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </UserLayout>
    </AuthGuard>
  )
}
