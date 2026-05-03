import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { createClient } from '../lib/supabase'
import {
  LayoutDashboard, Heart, MessageSquare, User,
  LogOut, Menu, X, Building2, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'

const mainNav = [
  { href: '/user',           label: 'Overview',   icon: LayoutDashboard, exact: true  },
  { href: '/user/saved',     label: 'Saved',       icon: Heart,           exact: false },
  { href: '/user/enquiries', label: 'Enquiries',   icon: MessageSquare,   exact: false },
  { href: '/user/profile',   label: 'Profile',     icon: User,            exact: false },
]

interface Props {
  displayName?: string
  userEmail?: string | null
  initials?: string
  open: boolean
  onClose: () => void
}

export default function UserSidebar({ displayName = 'User', userEmail, initials = 'U', open, onClose }: Props) {
  const [location] = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('user-sidebar-collapsed') === 'true' } catch { return false }
  })

  useEffect(() => { onClose() }, [location])

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem('user-sidebar-collapsed', String(next)) } catch {}
  }

  function isActive(item: { href: string; exact: boolean }) {
    return item.exact ? location === item.href : location.startsWith(item.href)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const NavItem = ({ item, c }: { item: typeof mainNav[0]; c: boolean }) => {
    const active = isActive(item)
    const Icon = item.icon
    return (
      <Link href={item.href} title={c ? item.label : undefined}
        className={`group flex items-center ${c ? 'justify-center py-2.5 mx-1' : 'gap-3.5 px-3 py-2.5'} rounded-xl text-sm font-medium transition-all duration-200 ${
          active
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
        }`}>
        <Icon className={`shrink-0 ${c ? 'w-5 h-5' : 'w-[18px] h-[18px]'} transition-colors ${
          active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
        }`} strokeWidth={active ? 2 : 1.7} />
        {!c && <span className="flex-1 truncate">{item.label}</span>}
        {!c && active && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
      </Link>
    )
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => {
    const c = collapsed && !mobile
    return (
      <div className="flex flex-col h-full bg-white border-r border-gray-100">
        {/* Logo */}
        <div className={`flex items-center ${c ? 'justify-center px-0 py-4' : 'gap-3 px-5 py-4'} border-b border-gray-100 shrink-0`}>
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow shadow-blue-600/20 shrink-0">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
          {!c && (
            <>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold text-gray-900 tracking-tight">Livana</span>
                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md uppercase tracking-wide">Tenant</span>
                </div>
              </div>
              {mobile && (
                <button type="button" onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0 ml-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 pt-3 pb-2 space-y-0.5 overflow-y-auto">
          {!c && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Navigation</p>}
          {mainNav.map(item => <NavItem key={item.href} item={item} c={c} />)}

          {!c && (
            <div className="pt-4 pb-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Explore</p>
            </div>
          )}
          {c && <div className="my-2 mx-2 h-px bg-gray-100" />}
          <Link href="/listings" title={c ? 'Browse Listings' : undefined}
            className={`group flex items-center ${c ? 'justify-center py-2.5 mx-1' : 'gap-3.5 px-3 py-2.5'} rounded-xl text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all duration-200`}>
            <Building2 className={`shrink-0 ${c ? 'w-5 h-5' : 'w-[18px] h-[18px]'} text-gray-400 group-hover:text-gray-600`} strokeWidth={1.7} />
            {!c && <span>Browse Listings</span>}
          </Link>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 shrink-0">
          {!mobile && (
            <button type="button" onClick={toggleCollapse}
              className={`w-full flex items-center ${c ? 'justify-center py-3' : 'gap-2 px-5 py-2.5'} text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-200 text-xs font-medium`}
              title={c ? 'Expand sidebar' : 'Collapse sidebar'}>
              {c ? <PanelLeftOpen className="w-4 h-4" /> : <><PanelLeftClose className="w-4 h-4" /><span>Collapse</span></>}
            </button>
          )}

          <div className={`flex items-center ${c ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'} hover:bg-gray-50 transition-colors cursor-default`}>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            {!c && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{displayName}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{userEmail ?? 'Tenant'}</p>
                </div>
                <button type="button" onClick={handleLogout} title="Sign out"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex shrink-0 flex-col min-h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-64'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button type="button" onClick={() => { /* handled by UserLayout */ }}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50 active:scale-95 transition-all pointer-events-none opacity-0"
        aria-hidden>
        <Menu className="w-4 h-4" />
      </button>

      {/* Backdrop */}
      <div onClick={onClose}
        className={`md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />

      {/* Drawer */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent mobile />
      </div>
    </>
  )
}
