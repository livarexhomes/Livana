import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { createClient } from '../lib/supabase'
import {
  LayoutDashboard, Heart, HeadphonesIcon, User,
  LogOut, Menu, X, Building2, PanelLeftClose, PanelLeftOpen,
  Home, Key, Briefcase, ShoppingBag,
} from 'lucide-react'

const mainNav = [
  { href: '/user',           label: 'Overview', icon: LayoutDashboard, exact: true  },
  { href: '/user/saved',     label: 'Saved',    icon: Heart,           exact: false },
  { href: '/user/enquiries', label: 'Support',  icon: HeadphonesIcon,  exact: false },
  { href: '/user/profile',   label: 'Profile',  icon: User,            exact: false },
]

const exploreNav = [
  { href: '/listings?type=rent',  label: 'Rent',       icon: Key,        comingSoon: false },
  { href: '/listings?type=lease', label: 'Lease',      icon: Briefcase,  comingSoon: false },
  { href: null,                   label: 'Buy',        icon: Home,       comingSoon: true  },
  { href: null,                   label: 'Commercial', icon: ShoppingBag,comingSoon: true  },
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
        className={`group relative flex items-center ${c ? 'justify-center p-2.5 mx-1' : 'gap-3 px-3 py-2.5'} rounded-xl text-sm font-medium transition-all duration-200 ${
          active
            ? 'bg-white/[0.12] text-white'
            : 'text-white/45 hover:text-white/90 hover:bg-white/[0.06]'
        }`}>
        {active && !c && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r-full" />}
        <Icon className={`shrink-0 ${c ? 'w-[18px] h-[18px]' : 'w-[17px] h-[17px]'} transition-colors ${
          active ? 'text-white' : 'text-white/40 group-hover:text-white/70'
        }`} strokeWidth={active ? 2 : 1.7} />
        {!c && <span className="flex-1 truncate">{item.label}</span>}
        {!c && active && <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />}
      </Link>
    )
  }

  const ExploreItem = ({ item, c }: { item: typeof exploreNav[0]; c: boolean }) => {
    const Icon = item.icon
    if (item.comingSoon) {
      return (
        <div title={c ? `${item.label} (Coming Soon)` : undefined}
          className={`flex items-center ${c ? 'justify-center p-2.5 mx-1' : 'gap-3 px-3 py-2.5'} rounded-xl text-sm font-medium text-white/20 cursor-default select-none`}>
          <Icon className={`shrink-0 ${c ? 'w-[18px] h-[18px]' : 'w-[17px] h-[17px]'} text-white/20`} strokeWidth={1.7} />
          {!c && (
            <span className="flex-1 flex items-center gap-2 truncate">
              {item.label}
              <span className="text-[9px] font-bold uppercase tracking-wider bg-white/10 text-white/30 px-1.5 py-0.5 rounded-md shrink-0">Soon</span>
            </span>
          )}
        </div>
      )
    }
    return (
      <Link href={item.href!} title={c ? item.label : undefined}
        className={`group flex items-center ${c ? 'justify-center p-2.5 mx-1' : 'gap-3 px-3 py-2.5'} rounded-xl text-sm font-medium text-white/45 hover:text-white/90 hover:bg-white/[0.06] transition-all duration-200`}>
        <Icon className={`shrink-0 ${c ? 'w-[18px] h-[18px]' : 'w-[17px] h-[17px]'} text-white/40 group-hover:text-white/70`} strokeWidth={1.7} />
        {!c && <span className="flex-1 truncate">{item.label}</span>}
      </Link>
    )
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => {
    const c = collapsed && !mobile
    return (
      <div className="flex flex-col h-full bg-[#0c0c15]">
        {/* Logo */}
        <div className={`flex items-center ${c ? 'justify-center px-0 py-[18px]' : 'gap-3 px-5 py-[18px]'} border-b border-white/[0.06] shrink-0`}>
          <img
            src="/livana-logo-transparent.png"
            alt="Livana"
            className={`shrink-0 brightness-0 invert ${c ? 'h-8' : 'h-9'}`}
          />
          {(!c || mobile) && (
            <>
              <span className="text-[9px] font-bold bg-white/10 text-white/70 border border-white/[0.12] px-2 py-0.5 rounded-full uppercase tracking-wider">
                Tenant
              </span>
              {mobile && (
                <button type="button" onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-colors shrink-0 ml-auto">
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 pt-4 pb-2 space-y-0.5 overflow-y-auto">
          {!c && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/20">Navigation</p>}
          {mainNav.map(item => <NavItem key={item.href} item={item} c={c} />)}

          <div className={c ? 'py-3' : 'pt-5 pb-1'}>
            {!c && <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/20">Browse</p>}
            {c && <div className="mx-2 h-px bg-white/[0.06]" />}
          </div>

          {exploreNav.map(item => <ExploreItem key={item.href} item={item} c={c} />)}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.06] shrink-0">
          {!mobile && (
            <button type="button" onClick={toggleCollapse}
              className={`w-full flex items-center ${c ? 'justify-center py-3' : 'gap-2 px-5 py-2.5'} text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all duration-200`}
              title={c ? 'Expand sidebar' : 'Collapse sidebar'}>
              {c
                ? <PanelLeftOpen className="w-4 h-4" />
                : <><PanelLeftClose className="w-4 h-4" /><span className="text-xs font-medium">Collapse</span></>
              }
            </button>
          )}

          <div className={`flex items-center ${c ? 'justify-center px-0 py-3.5' : 'gap-3 px-4 py-3'} hover:bg-white/[0.04] transition-colors cursor-default`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            {(!c || mobile) && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white/90 truncate leading-tight">{displayName}</p>
                  <p className="text-[11px] text-white/35 truncate mt-0.5">{userEmail ?? 'Tenant'}</p>
                </div>
                <button type="button" onClick={handleLogout} title="Sign out"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
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
      <aside className={`hidden md:flex shrink-0 flex-col h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-64'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile hamburger placeholder — handled by UserLayout */}
      <button type="button" aria-hidden className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 pointer-events-none opacity-0">
        <Menu className="w-4 h-4" />
      </button>

      {/* Backdrop */}
      <div onClick={onClose}
        className={`md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />

      {/* Drawer */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent mobile />
      </div>
    </>
  )
}
