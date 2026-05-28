import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { createClient } from '../lib/supabase'
import {
  LayoutDashboard, Building2, UserPlus, FolderKanban, UserCog,
  Settings, LogOut, Menu, X,
  PanelLeftClose, PanelLeftOpen, ShieldCheck, Activity, List, HeadphonesIcon,
} from 'lucide-react'

const mainNav = [
  { label: 'Dashboard',    href: '/admin',            exact: true,  icon: LayoutDashboard },
  { label: 'Listings',     href: '/admin/properties', exact: false, icon: List },
  { label: 'Clients',      href: '/admin/landlords',  exact: false, icon: UserPlus },
  { label: 'KYC Review',   href: '/admin/kyc',        exact: false, icon: ShieldCheck },
  { label: 'Projects',     href: '/admin/projects',   exact: false, icon: FolderKanban },
  { label: 'Users',        href: '/admin/users',      exact: false, icon: UserCog },
  { label: 'Activity Log', href: '/admin/activity',   exact: false, icon: Activity },
  { label: 'Support',      href: '/admin/support',    exact: false, icon: HeadphonesIcon },
]
const supportNav = [
  { label: 'Settings', href: '/admin/settings', exact: false, icon: Settings },
]

interface Props { userEmail?: string | null; userName?: string | null }

export default function AdminSidebar({ userEmail, userName }: Props) {
  const [location] = useLocation()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('admin-sidebar-collapsed') === 'true' } catch { return false }
  })
  const [openEnquiries, setOpenEnquiries] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'open')
      .then(({ count }) => setOpenEnquiries(count ?? 0))
    const channel = supabase.channel('sidebar_enquiry_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' }, () => {
        supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'open')
          .then(({ count }) => setOpenEnquiries(count ?? 0))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => { setOpen(false) }, [location])

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem('admin-sidebar-collapsed', String(next)) } catch {}
  }

  const rawName = userName || (userEmail ? userEmail.split('@')[0] : 'Admin')
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'AD'

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
    const isSupport = item.href === '/admin/support'
    const badge = isSupport && openEnquiries > 0 ? openEnquiries : 0
    return (
      <Link href={item.href} title={c ? item.label : undefined}
        className={`group relative flex items-center ${c ? 'justify-center p-2.5 mx-1' : 'gap-3 px-3 py-2.5'} rounded-xl text-sm font-medium transition-all duration-200 ${
          active
            ? 'bg-white/[0.12] text-white'
            : 'text-white/45 hover:text-white/90 hover:bg-white/[0.06]'
        }`}>
        {active && !c && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r-full" />}
        <div className="relative shrink-0">
          <Icon className={`${c ? 'w-[18px] h-[18px]' : 'w-[17px] h-[17px]'} transition-colors ${
            active ? 'text-white' : 'text-white/40 group-hover:text-white/70'
          }`} strokeWidth={active ? 2 : 1.7} />
          {badge > 0 && c && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        {!c && <span className="flex-1 truncate">{item.label}</span>}
        {!c && badge > 0 && (
          <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    )
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => {
    const c = collapsed && !mobile
    return (
      <div className="flex flex-col h-full bg-[#0c0c15]">
        {/* Logo */}
        <div className={`flex items-center ${c ? 'justify-center px-0 py-[18px]' : 'gap-3 px-5 py-[18px]'} border-b border-white/[0.06] shrink-0`}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
          {(!c || mobile) && (
            <>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-extrabold text-white tracking-tight">LIVAREX</span>
                  <span className="text-[9px] font-bold bg-white/10 text-white/70 border border-white/[0.12] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Admin
                  </span>
                </div>
              </div>
              {mobile && (
                <button type="button" onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-colors shrink-0 ml-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 pt-4 pb-2 space-y-0.5 overflow-y-auto">
          {!c && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/20">Main</p>}
          {mainNav.map(item => <NavItem key={item.label} item={item} c={c} />)}

          <div className={c ? 'py-3' : 'pt-5 pb-1'}>
            {!c && <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/20">Support</p>}
            {c && <div className="mx-2 h-px bg-white/[0.06]" />}
          </div>
          {supportNav.map(item => <NavItem key={item.label} item={item} c={c} />)}
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            {(!c || mobile) && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white/90 truncate leading-tight">{displayName}</p>
                  <p className="text-[11px] text-white/35 truncate mt-0.5">{userEmail ?? 'admin@livarex.com'}</p>
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
      <aside className={`hidden md:flex shrink-0 flex-col h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-64'}`}>
        <SidebarContent />
      </aside>

      <button type="button" onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-xl bg-[#0c0c15] border border-white/10 shadow-lg text-white hover:bg-[#14141f] active:scale-95 transition-all"
        aria-label="Open menu">
        <Menu className="w-4 h-4" />
      </button>

      <div onClick={() => setOpen(false)}
        className={`md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />

      <div className={`md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent mobile />
      </div>
    </>
  )
}
