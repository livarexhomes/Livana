import { Link, useLocation } from 'wouter'
import { createClient } from '../lib/supabase'
import {
  LayoutDashboard, Building2, Users, BarChart2, Settings, LogOut,
} from 'lucide-react'

const menuNav = [
  { label: 'Dashboard', href: '/admin', exact: true, icon: LayoutDashboard },
  { label: 'Properties', href: '/admin/properties', exact: false, icon: Building2 },
  { label: 'Landlords', href: '/admin/landlords', exact: false, icon: Users },
]

const generalNav = [
  { label: 'Reports', href: '/admin/reports', exact: false, icon: BarChart2 },
  { label: 'Settings', href: '/admin/settings', exact: false, icon: Settings },
]

const mobileNav = [...menuNav]

interface SidebarProps {
  userEmail?: string | null
  userName?: string | null
}

export default function AdminSidebar({ userEmail, userName }: SidebarProps) {
  const [location] = useLocation()

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Admin')
  const initials = displayName.slice(0, 2).toUpperCase()

  function isActive(item: { href: string; exact: boolean }) {
    return item.exact ? location === item.href : location.startsWith(item.href)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-60 xl:w-64 shrink-0 flex-col bg-white border-r border-gray-100 min-h-screen sticky top-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20">
            <svg className="w-[18px] h-[18px] text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
          </div>
          <div>
            <p className="text-base font-extrabold text-gray-900 leading-none tracking-tight">Livana</p>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600 mt-0.5">Workspace</p>
          </div>
        </div>

        {/* Profile */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-blue-50">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-white">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 truncate leading-tight">{displayName}</p>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 truncate mt-0.5 font-semibold">{userEmail ?? 'admin'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Menu</p>
          {menuNav.map(item => {
            const active = isActive(item)
            const Icon = item.icon
            return (
              <Link key={item.label} href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}>
                <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <span className="flex-1">{item.label}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
              </Link>
            )
          })}

          <p className="px-3 mb-2 mt-5 text-[10px] font-black uppercase tracking-widest text-gray-400">General</p>
          {generalNav.map(item => {
            const active = isActive(item)
            const Icon = item.icon
            return (
              <Link key={item.label} href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}>
                <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <span className="flex-1">{item.label}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all group">
            <LogOut className="w-[18px] h-[18px] shrink-0 text-gray-400 group-hover:text-red-500 transition-colors" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-center justify-around px-2 pb-safe">
        {mobileNav.map(item => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <Link key={item.label} href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-semibold transition-colors ${active ? 'text-blue-600' : 'text-gray-400'}`}>
              <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
              {item.label}
            </Link>
          )
        })}
        <button onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-semibold text-gray-400 transition-colors">
          <LogOut className="w-5 h-5 text-gray-400" />
          Sign Out
        </button>
      </nav>
    </>
  )
}
