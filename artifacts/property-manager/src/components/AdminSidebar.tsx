import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { createClient } from '../lib/supabase'
import {
  LayoutDashboard, Building2, UserPlus, FolderKanban, UserCog,
  Settings, HelpCircle, LogOut, Menu, X, ChevronRight,
  PanelLeftClose, PanelLeftOpen,
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

interface Props { userEmail?: string | null; userName?: string | null }

export default function AdminSidebar({ userEmail, userName }: Props) {
  const [location] = useLocation()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('admin-sidebar-collapsed') === 'true' } catch { return false }
  })

  useEffect(() => { setOpen(false) }, [location])

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem('admin-sidebar-collapsed', String(next)) } catch {}
  }

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

  const NavItem = ({ item, collapsed: c }: { item: typeof mainNav[0]; collapsed: boolean }) => {
    const active = isActive(item)
    const Icon = item.icon
    return (
      <Link href={item.href} title={c ? item.label : undefined}
        className={`group flex items-center ${c ? 'justify-center px-0 py-2.5 mx-1' : 'gap-3 px-3 py-2.5'} rounded-xl text-sm font-medium transition-all duration-200 ${
          active
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
            : 'text-slate-400 hover:text-white hover:bg-white/8'
        }`}>
        <Icon className={`shrink-0 transition-colors ${c ? 'w-5 h-5' : 'w-[18px] h-[18px]'} ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} strokeWidth={active ? 2 : 1.7} />
        {!c && <span className="flex-1 truncate">{item.label}</span>}
        {!c && active && <ChevronRight className="w-3.5 h-3.5 text-blue-300 shrink-0" />}
      </Link>
    )
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Logo */}
      <div className={`flex items-center ${collapsed && !mobile ? 'justify-center px-0 py-4' : 'gap-3 px-5 py-4'} border-b border-white/6 shrink-0`}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40 shrink-0">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </div>
        {(!collapsed || mobile) && (
          <>
            <span className="text-base font-extrabold text-white tracking-tight flex-1 min-w-0 truncate">Livana</span>
            <span className="text-[9px] font-bold bg-blue-600/20 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0">
              Admin
            </span>
          </>
        )}
        {mobile && (
          <button type="button" onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1 shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 pt-3 pb-2 space-y-0.5 overflow-y-auto">
        {(!collapsed || mobile) && (
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Main</p>
        )}
        {mainNav.map(item => <NavItem key={item.label} item={item} collapsed={collapsed && !mobile} />)}

        <div className={`${collapsed && !mobile ? 'py-2' : 'pt-4 pb-1'}`}>
          {(!collapsed || mobile) && (
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Support</p>
          )}
          {collapsed && !mobile && <div className="mx-2 h-px bg-white/8" />}
        </div>
        {supportNav.map(item => <NavItem key={item.label} item={item} collapsed={collapsed && !mobile} />)}
      </nav>

      {/* Profile + Collapse toggle */}
      <div className="border-t border-white/6 shrink-0">
        {/* Collapse toggle — desktop only */}
        {!mobile && (
          <button type="button" onClick={toggleCollapse}
            className={`w-full flex items-center ${collapsed ? 'justify-center py-3' : 'gap-2 px-5 py-2.5'} text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-200`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed
              ? <PanelLeftOpen className="w-4 h-4" />
              : <>
                  <PanelLeftClose className="w-4 h-4" />
                  <span className="text-xs font-medium">Collapse</span>
                </>
            }
          </button>
        )}

        {/* Profile row */}
        <div className={`flex items-center ${collapsed && !mobile ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'} hover:bg-white/5 transition-colors cursor-default`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          {(!collapsed || mobile) && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate leading-tight">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{userEmail ?? 'admin@livana.com'}</p>
              </div>
              <button type="button" onClick={handleLogout} title="Sign out"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex shrink-0 flex-col bg-slate-900 min-h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-64'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button type="button" onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 border border-white/10 shadow-lg text-white hover:bg-slate-800 active:scale-95 transition-all"
        aria-label="Open menu">
        <Menu className="w-4 h-4" />
      </button>

      {/* Mobile backdrop */}
      <div onClick={() => setOpen(false)}
        className={`md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />

      {/* Mobile drawer */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent mobile />
      </div>
    </>
  )
}
