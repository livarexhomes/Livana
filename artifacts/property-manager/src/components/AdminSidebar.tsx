import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { createClient } from '../lib/supabase'
import {
  LayoutDashboard, Building2, UserPlus, FolderKanban, UserCog,
  Settings, HelpCircle, LogOut, Menu, X, ChevronRight,
} from 'lucide-react'

const mainNav = [
  { label: 'Dashboard',  href: '/admin',            exact: true,  icon: LayoutDashboard },
  { label: 'Properties', href: '/admin/properties', exact: false, icon: Building2 },
  { label: 'Clients',    href: '/admin/landlords',  exact: false, icon: UserPlus },
  { label: 'Projects',   href: '/admin/projects',   exact: false, icon: FolderKanban },
  { label: 'Users',      href: '/admin/users',      exact: false, icon: UserCog },
]

const supportNav = [
  { label: 'Settings',       href: '/admin/settings', exact: false, icon: Settings },
  { label: 'Help & Support', href: '/admin/help',     exact: false, icon: HelpCircle },
]

interface SidebarProps {
  userEmail?: string | null
  userName?: string | null
}

export default function AdminSidebar({ userEmail, userName }: SidebarProps) {
  const [location] = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [location])

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Admin')
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'AD'

  function isActive(item: { href: string; exact: boolean }) {
    return item.exact ? location === item.href : location.startsWith(item.href)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const NavSection = () => (
    <nav className="flex-1 px-3 pt-4 pb-2 space-y-0.5 overflow-y-auto">
      <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Main Menu</p>
      {mainNav.map(item => {
        const active = isActive(item)
        const Icon = item.icon
        return (
          <Link key={item.label} href={item.href}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              active
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/8'
            }`}>
            <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} strokeWidth={active ? 2 : 1.7} />
            <span className="flex-1">{item.label}</span>
            {active && <ChevronRight className="w-3.5 h-3.5 text-blue-300 shrink-0" />}
          </Link>
        )
      })}

      <div className="pt-5 pb-2">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Support</p>
      </div>

      {supportNav.map(item => {
        const active = isActive(item)
        const Icon = item.icon
        return (
          <Link key={item.label} href={item.href}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              active
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/8'
            }`}>
            <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} strokeWidth={1.7} />
            <span className="flex-1">{item.label}</span>
            {active && <ChevronRight className="w-3.5 h-3.5 text-blue-300 shrink-0" />}
          </Link>
        )
      })}
    </nav>
  )

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/6 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40 shrink-0">
          <svg className="w-4.5 h-4.5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </div>
        <span className="text-base font-extrabold text-white tracking-tight">Livana</span>
        <span className="ml-auto text-[9px] font-bold bg-blue-600/20 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wide">Admin</span>
        {mobile && (
          <button type="button" onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <NavSection />

      {/* Profile + Logout */}
      <div className="px-3 py-4 border-t border-white/6 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/6 transition-colors group cursor-default">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate leading-tight">{displayName}</p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{userEmail ?? 'admin@livana.com'}</p>
          </div>
          <button type="button" onClick={handleLogout} title="Sign out"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden md:flex w-60 xl:w-64 shrink-0 flex-col bg-slate-900 min-h-screen sticky top-0 z-30">
        <SidebarContent />
      </aside>

      <button type="button" onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 border border-white/10 shadow-lg text-white hover:bg-slate-800 active:scale-95 transition-all"
        aria-label="Open menu">
        <Menu className="w-4 h-4" />
      </button>

      <div onClick={() => setOpen(false)}
        className={`md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`} />

      <div className={`md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 shadow-2xl transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent mobile />
      </div>
    </>
  )
}
