import { useState, useEffect } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import { useMobileSidebar } from '@/components/ui/mobile-sidebar-context'
import { createClient } from '@/lib/supabase'
import { useAdminPresence } from '@/lib/admin-presence'
import { subscribeSupportPresence, type SupportStatus } from '@/lib/live-support'
import { useTheme } from '@/lib/theme'

// Set by the admin layout so the sidebar can identify the signed-in admin's
// roster row (presence is keyed by user_id).
declare global {
  interface Window {
    __livarexUserId?: string
  }
}

import {
  LayoutDashboard, Building2, UserPlus, FolderKanban, UserCog,
  Settings, LogOut, Menu, X,
  PanelLeftClose, PanelLeftOpen, ShieldCheck, List, HeadphonesIcon,
  Sun, Moon,
} from 'lucide-react'

const mainNav = [
  { label: 'Dashboard',    href: '/admin',            exact: true,  icon: LayoutDashboard },
  { label: 'Listings',     href: '/admin/properties', exact: false, icon: List },
  { label: 'Clients',      href: '/admin/landlords',  exact: false, icon: UserPlus },
  { label: 'Vetting',      href: '/admin/vetting',    exact: false, icon: ShieldCheck },
  { label: 'Projects',     href: '/admin/projects',   exact: false, icon: FolderKanban },
  { label: 'Users',        href: '/admin/users',      exact: false, icon: UserCog },
  { label: 'Support',      href: '/admin/support',    exact: false, icon: HeadphonesIcon },
]
const supportNav = [
  { label: 'Settings', href: '/admin/settings', exact: false, icon: Settings },
]

interface Props { userEmail?: string | null; userName?: string | null }

export default function AdminSidebar({ userEmail, userName }: Props) {
  // Mount admin presence once per admin page — the sidebar renders on every
  // admin page (including Support), so this keeps the heartbeat + support
  // availability accurate no matter where the admin is.
  useAdminPresence()
  const [location] = useLocation()
  const { open, setOpen } = useMobileSidebar()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('admin-sidebar-collapsed') === 'true' } catch { return false }
  })
  const [openEnquiries, setOpenEnquiries] = useState(0)
  const [supportStatus, setSupportStatus] = useState<SupportStatus>('offline')

  useEffect(() => {
    // The bottom-left admin status reads the SAME single source as the Support
    // page and the customer chatbot: the agents roster (presence + availability).
    let disposed = false
    let unsubscribe: (() => void) | null = null
    const start = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
      if (disposed) return
      if (user?.id) window.__livarexUserId = user.id
      unsubscribe = subscribeSupportPresence((state) => {
        const my = state.agents.find(a => a.user_id === window.__livarexUserId)
        if (my) setSupportStatus(my.presence)
      })
    }
    start()
    return () => {
      disposed = true
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    // Support badge = open enquiries + unread/queued chats + open support tickets.
    const fetchBadge = () => {
      Promise.all([
        supabase.from('enquiries').select('id', { count: 'exact', head: true }).in('status', ['new', 'open']),
        supabase.from('chat_inquiries').select('id', { count: 'exact', head: true })
          .eq('read_by_admin', false)
          .in('agent_status', ['unassigned', 'queued']),
        supabase.from('support_tickets').select('id', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress']),
      ]).then(([enq, ch, tix]) =>
        setOpenEnquiries((enq.count ?? 0) + (ch.count ?? 0) + (tix.count ?? 0))
      )
    }
    fetchBadge()
    const channel = supabase.channel('sidebar_enquiry_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' }, fetchBadge)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_inquiries' }, fetchBadge)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchBadge)
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
        className={`group relative flex items-center ${c ? 'justify-center p-2.5 mx-1' : 'gap-3 px-3 py-2.5'} rounded-lg text-sm font-medium transition-all duration-150 ${
          active
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/30'
            : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent'
        }`}>
        <div className="relative shrink-0">
          <Icon className={`${c ? 'w-[18px] h-[18px]' : 'w-[17px] h-[17px]'} transition-colors ${
            active ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/80'
          }`} strokeWidth={active ? 2 : 1.7} />
          {badge > 0 && c && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-white text-blue-700 text-[9px] font-bold flex items-center justify-center">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        {!c && <span className="flex-1 truncate">{item.label}</span>}
        {!c && badge > 0 && (
          <span className={`ml-auto min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
            active ? 'bg-white/20 text-white' : 'bg-blue-500 text-white'
          }`}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    )
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => {
    const c = collapsed && !mobile
    const { resolvedDark, setTheme } = useTheme()
    return (
      <div className="flex flex-col h-full bg-sidebar">
        {/* Logo */}
        <div className={`flex items-center ${c ? 'justify-center px-0 py-[18px]' : 'gap-3 px-5 py-[18px]'} border-b border-sidebar-border shrink-0`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
          {(!c || mobile) && (
            <>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-extrabold text-sidebar-foreground tracking-tight">LIVAREX</span>
                  <span className="text-[9px] font-bold bg-sidebar-accent text-sidebar-foreground/70 border border-sidebar-border px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Admin
                  </span>
                </div>
              </div>
              {mobile && (
                <button type="button" onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors shrink-0 ml-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 pt-4 pb-2 space-y-0.5 overflow-y-auto">
          {!c && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/35">Main</p>}
          {mainNav.map(item => <NavItem key={item.label} item={item} c={c} />)}

          <div className={c ? 'py-3' : 'pt-5 pb-1'}>
            {!c && <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/35">Support</p>}
            {c && <div className="mx-2 h-px bg-sidebar-border" />}
          </div>
          {supportNav.map(item => <NavItem key={item.label} item={item} c={c} />)}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border shrink-0">
          {!mobile && (
            <button type="button" onClick={toggleCollapse}
              className={`w-full flex items-center ${c ? 'justify-center py-3' : 'gap-2 px-5 py-2.5'} text-sidebar-foreground/40 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent transition-all duration-200`}
              title={c ? 'Expand sidebar' : 'Collapse sidebar'}>
              {c
                ? <PanelLeftOpen className="w-4 h-4" />
                : <><PanelLeftClose className="w-4 h-4" /><span className="text-xs font-medium">Collapse</span></>
              }
            </button>
          )}

          <div className={`flex items-center ${c ? 'justify-center px-0 py-3.5' : 'gap-3 px-4 py-3'} hover:bg-sidebar-accent transition-colors cursor-default`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            {(!c || mobile) && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-sidebar-foreground/90 truncate leading-tight">{displayName}</p>
                  <p className="text-[11px] text-sidebar-foreground/45 truncate mt-0.5 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      supportStatus === 'online' ? 'bg-emerald-400'
                      : supportStatus === 'away' ? 'bg-amber-400'
                      : 'bg-sidebar-foreground/25'
                    }`} />
                    {supportStatus === 'online' ? 'Online' : supportStatus === 'away' ? 'Away' : 'Offline'}
                  </p>
                </div>
                <button type="button" onClick={handleLogout} title="Sign out"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-sidebar-foreground/30 hover:text-red-400 hover:bg-sidebar-accent transition-colors shrink-0">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Theme toggle — desktop only, hidden on mobile drawer */}
          {!mobile && (
          <div className={`flex items-center justify-center gap-1 ${c ? 'px-2 py-2' : 'px-4 py-2.5'}`}>
            <button type="button"
              onClick={() => setTheme('light')}
              aria-label="Switch to light mode"
              title="Light mode"
              className={`p-1.5 rounded-md transition-colors ${!resolvedDark ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`}>
              <Sun className="w-3.5 h-5" />
            </button>
            <button type="button"
              onClick={() => setTheme('dark')}
              aria-label="Switch to dark mode"
              title="Dark mode"
              className={`p-1.5 rounded-md transition-colors ${resolvedDark ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`}>
              <Moon className="w-3.5 h-5" />
            </button>
          </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <aside className={`hidden md:flex shrink-0 flex-col h-screen sticky top-0 z-30 border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-64'}`}>
        <SidebarContent />
      </aside>

      <div onClick={() => setOpen(false)}
        className={`md:hidden fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />

      <div className={`md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent mobile />
      </div>
    </>
  )
}
