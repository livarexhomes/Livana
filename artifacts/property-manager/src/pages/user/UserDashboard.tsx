import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { Heart, MessageSquare, User, LayoutDashboard, Building2, ArrowLeft } from 'lucide-react'
import AuthGuard from '../../components/AuthGuard'
import { createClient } from '../../lib/supabase'
import type { Tenant } from '../../lib/types'

function UserSidebar({ tenant }: { tenant: Tenant | null }) {
  const [location] = useLocation()
  const links = [
    { href: '/user', label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: '/user/saved', label: 'Saved', icon: Heart, exact: false },
    { href: '/user/enquiries', label: 'Enquiries', icon: MessageSquare, exact: false },
    { href: '/user/profile', label: 'Profile', icon: User, exact: false },
  ]

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white border-r border-gray-200 min-h-screen">
      <div className="h-16 flex items-center px-5 border-b border-gray-200 shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#6b9e6e] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm">My Account</span>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? location === href : location.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-[#6b9e6e]/15 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#6b9e6e]' : ''}`} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4 border-t border-gray-200 space-y-1">
        <Link href="/listings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 shrink-0" /> Browse listings
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Logout
        </button>
      </div>
    </aside>
  )
}

export function UserLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [user, setUser] = useState<{ email?: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser({ email: user.email })
      const { data: t } = await supabase.from('tenants').select('*').eq('user_id', user.id).single() as { data: Tenant | null }
      setTenant(t)
    })
  }, [])

  const initials = tenant?.full_name
    ? tenant.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <div className="flex min-h-screen bg-gray-50">
      <UserSidebar tenant={tenant} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-200 shrink-0">
          <h1 className="text-base font-semibold text-gray-900">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#6b9e6e] flex items-center justify-center">
              <span className="text-xs font-semibold text-white">{initials}</span>
            </div>
            <span className="text-sm text-gray-700 hidden sm:block">{tenant?.full_name ?? user?.email}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">{children}</main>
      </div>
    </div>
  )
}

export default function UserDashboardPage() {
  const [stats, setStats] = useState({ saved: 0, enquiries: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single() as { data: { id: string } | null }
      if (!tenant) { setLoading(false); return }
      const [savedResult, enqResult] = await Promise.all([
        supabase.from('saved_properties').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
        supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
      ])
      const savedCount = savedResult.count
      const enqCount = enqResult.count
      setStats({ saved: savedCount ?? 0, enquiries: enqCount ?? 0 })
      setLoading(false)
    })
  }, [])

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Overview">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="max-w-2xl space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Link href="/user/saved" className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <Heart className="w-8 h-8 text-red-400 mb-3" />
                <p className="text-2xl font-bold text-gray-900">{stats.saved}</p>
                <p className="text-sm text-gray-500">Saved properties</p>
              </Link>
              <Link href="/user/enquiries" className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <MessageSquare className="w-8 h-8 text-[#6b9e6e] mb-3" />
                <p className="text-2xl font-bold text-gray-900">{stats.enquiries}</p>
                <p className="text-sm text-gray-500">Enquiries sent</p>
              </Link>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link href="/listings" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#6b9e6e]/10 text-[#4a7f4d] font-medium text-sm hover:bg-[#6b9e6e]/20 transition-colors">
                  <Building2 className="w-5 h-5" /> Browse listings
                </Link>
                <Link href="/user/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 text-gray-700 font-medium text-sm hover:bg-gray-100 transition-colors">
                  <User className="w-5 h-5" /> Update profile
                </Link>
              </div>
            </div>
          </div>
        )}
      </UserLayout>
    </AuthGuard>
  )
}
