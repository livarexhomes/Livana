import { useState, useEffect, useRef, ReactNode } from 'react'
import { useLocation } from '@/lib/navigation'
import { Search, Bell, X, Building2, Users, MessageSquare, ArrowRight, ChevronRight, ShieldCheck, Headphones, Menu, Check, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useMobileSidebar } from '@/components/ui/mobile-sidebar-context'
import { getNotificationSettings } from '@/lib/platform-settings'
import { playSupportSound, getSoundMuted } from '@/lib/support-notifications'
import { useToast } from '@/hooks/use-toast'

type SearchResult = {
  id: string
  label: string
  sub: string
  href: string
  type: 'property' | 'landlord' | 'enquiry'
}

type Notif = {
  id: string
  label: string
  sub: string
  href: string
  type: 'warning' | 'info' | 'kyc' | 'signup'
}

interface AdminHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  pendingCount?: number
}

export default function AdminHeader({ title, subtitle, action, pendingCount = 0 }: AdminHeaderProps) {
  const [, navigate] = useLocation()
  const { setOpen } = useMobileSidebar()
  const { toast } = useToast()
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<SearchResult[]>([])
  const [searching, setSearching]   = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showNotif, setShowNotif]   = useState(false)
  const [notifs, setNotifs]         = useState<Notif[]>([])
  const [unread, setUnread]         = useState(0)
  const [readIds, setReadIds]       = useState<Set<string>>(new Set())
  const seenIdsRef                  = useRef<Set<string>>(new Set())
  const searchRef = useRef<HTMLDivElement>(null)
  const notifRef  = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Load notifications: KYC pending + new signups (last 48h) + open enquiries +
  // open support tickets + contact messages + chat inquiries. The
  // newLandlord / newEnquiry / newProperty toggles from Admin Settings gate
  // their respective items.
  async function loadNotifs({ silent = false }: { silent?: boolean } = {}) {
    const supabase = createClient()
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const prefs = await getNotificationSettings({ refresh: true }).catch(() => null)

    const [
      { data: kycPending },
      { data: newLandlords },
      { data: newTenants },
      { data: enqs },
      { data: tickets },
      { data: contacts },
      { data: chats },
      { data: newProps },
    ] = await Promise.all([
      supabase.from('landlords').select('id, full_name').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
      supabase.from('landlords').select('id, full_name, created_at').gte('created_at', cutoff).order('created_at', { ascending: false }).limit(5),
      supabase.from('tenants').select('id, full_name, created_at').gte('created_at', cutoff).order('created_at', { ascending: false }).limit(5),
      supabase.from('enquiries').select('id, message, status, properties(title)').in('status', ['new', 'open']).order('created_at', { ascending: false }).limit(5),
      supabase.from('support_tickets').select('id, subject, created_at, tenants(full_name)').eq('status', 'open').order('created_at', { ascending: false }).limit(5),
      supabase.from('contact_messages').select('id, name, subject, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('chat_inquiries').select('id, name, note, read_by_admin, created_at').eq('read_by_admin', false).order('created_at', { ascending: false }).limit(5),
      supabase.from('properties').select('id, title, city, created_at').gte('created_at', cutoff).order('created_at', { ascending: false }).limit(5),
    ])

    const items: Notif[] = []
    const seen = new Set<string>()

    for (const l of kycPending ?? []) {
      if (!seen.has(l.id)) {
        seen.add(l.id)
        items.push({ id: `kyc-${l.id}`, label: `${l.full_name} submitted KYC`, sub: 'Awaiting your review', href: '/admin/vetting', type: 'kyc' })
      }
    }
    if (prefs?.newLandlord !== false) {
      for (const l of newLandlords ?? []) {
        if (!seen.has(l.id)) {
          seen.add(l.id)
          items.push({ id: `ll-${l.id}`, label: `${l.full_name} signed up as landlord`, sub: relAgo(l.created_at), href: '/admin/vetting', type: 'signup' })
        }
      }
    }
    for (const t of newTenants ?? []) {
      items.push({ id: `tn-${t.id}`, label: `${t.full_name} created an account`, sub: relAgo(t.created_at), href: '/admin/activity', type: 'signup' })
    }
    if (prefs?.newEnquiry !== false) {
      for (const e of enqs ?? []) {
        items.push({ id: `eq-${e.id}`, label: (e as any).properties?.title ?? 'Property enquiry', sub: (e.message ?? '').slice(0, 55), href: '/admin/properties', type: 'info' })
      }
    }
    if (prefs?.newProperty !== false) {
      for (const p of newProps ?? []) {
        items.push({ id: `np-${p.id}`, label: `New listing: ${p.title}`, sub: `${p.city ?? ''} · ${relAgo(p.created_at)} · Pending approval`, href: '/admin/vetting', type: 'kyc' })
      }
    }
    for (const tk of tickets ?? []) {
      items.push({ id: `tk-${tk.id}`, label: `Support: ${tk.subject}`, sub: `From ${(tk as any).tenants?.full_name ?? 'tenant'} · ${relAgo(tk.created_at)}`, href: '/admin/support', type: 'info' })
    }
    for (const c of contacts ?? []) {
      items.push({ id: `cm-${c.id}`, label: `${c.name} sent a contact message`, sub: (c.subject ?? 'No subject').slice(0, 55), href: '/admin/support', type: 'info' })
    }
    for (const ch of chats ?? []) {
      items.push({ id: `ci-${ch.id}`, label: `${ch.name} started a chat`, sub: (ch.note ?? '').slice(0, 55), href: '/admin/support', type: 'info' })
    }

    setNotifs(items)
    const remainingUnread = items.filter(n => !seenIdsRef.current.has(n.id)).length
    setUnread(remainingUnread)

    // Surface brand-new notifications (anything not seen before in this
    // session) as toast notifications so the admin doesn't have to keep
    // opening the bell panel.
    if (silent) {
      const fresh = items.filter(n => !seenIdsRef.current.has(n.id))
      for (const n of fresh) {
        seenIdsRef.current.add(n.id)
        toast({ title: n.label, description: n.sub })
      }
    } else {
      // Initial load — just register the ids so we don't spam toasts on mount.
      for (const n of items) seenIdsRef.current.add(n.id)
    }
  }

  useEffect(() => {
    loadNotifs({ silent: false })

    const supabase = createClient()

    // Realtime: re-fetch on new enquiries, support tickets, tenants, landlords,
    // contact messages, chat inquiries, or properties.
    const channel = supabase
      .channel('admin-notif-watch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'enquiries' }, () => loadNotifs({ silent: true }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, () => loadNotifs({ silent: true }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tenants' }, () => loadNotifs({ silent: true }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'landlords' }, () => loadNotifs({ silent: true }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' }, () => loadNotifs({ silent: true }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_inquiries' }, (payload) => {
        // New chat inquiry → play the support sound so the admin notices
        // without a page refresh (respects the mute toggle).
        playSupportSound(getSoundMuted())
        loadNotifs({ silent: true })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_inquiries' }, () => loadNotifs({ silent: true }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'properties' }, () => loadNotifs({ silent: true }))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [toast])

  function relAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m} min ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const supabase = createClient()
      const q = query.trim()
      const [propRes, llRes] = await Promise.all([
        supabase.from('properties').select('id, title, city, price').ilike('title', `%${q}%`).limit(5),
        supabase.from('landlords').select('id, full_name').ilike('full_name', `%${q}%`).limit(4),
      ])
      const out: SearchResult[] = [
        ...(propRes.data ?? []).map((p: any) => ({
          id: p.id, label: p.title, sub: `${p.city ?? ''} · ₦${Number(p.price ?? 0).toLocaleString()}`,
          href: `/admin/properties`, type: 'property' as const,
        })),
        ...(llRes.data ?? []).map((l: any) => ({
          id: l.id, label: l.full_name, sub: 'Landlord',
          href: `/admin/landlords`, type: 'landlord' as const,
        })),
      ]
      setResults(out)
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function openSearch() {
    setShowSearch(true); setShowNotif(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function openNotif() {
    setShowNotif(v => !v)
    setShowSearch(false)
  }

  function markAllAsRead() {
    const next = new Set(readIds)
    for (const n of notifs) {
      next.add(n.id)
      seenIdsRef.current.add(n.id)
    }
    setReadIds(next)
    setUnread(0)
  }

  function goTo(href: string) {
    setShowSearch(false); setShowNotif(false); setQuery(''); navigate(href)
  }

  const ICON_MAP = { property: Building2, landlord: Users, enquiry: MessageSquare }

  const notifIconFor = (type: Notif['type'], id?: string) => {
    if (type === 'kyc')    return { Icon: ShieldCheck,  bg: 'bg-indigo-100', ic: 'text-indigo-600' }
    if (type === 'signup') return { Icon: Users,        bg: 'bg-blue-100',   ic: 'text-blue-600'   }
    if (type === 'warning')return { Icon: Users,        bg: 'bg-amber-100',  ic: 'text-amber-600'  }
    if (id?.startsWith('tk-')) return { Icon: Headphones, bg: 'bg-violet-100', ic: 'text-violet-600' }
    return                        { Icon: MessageSquare, bg: 'bg-emerald-100', ic: 'text-emerald-600' }
  }

  return (
    <header className="flex items-center justify-between px-3 md:px-6 py-1.5 md:py-2.5 bg-white border-b border-gray-100 shrink-0 gap-3 h-12 md:h-auto">
      <div className="flex items-center gap-2 min-w-0">
        {showSearch ? (
          <button type="button" onClick={() => setShowSearch(false)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
            aria-label="Close search">
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" onClick={() => setOpen(true)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
            aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className={cn('min-w-0', showSearch && 'hidden md:block')}>
          <h1 className="text-base font-extrabold text-gray-900 truncate">{title}</h1>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate hidden md:inline-block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Search */}
        <div ref={searchRef} className="relative">
          {showSearch ? (
              <div className="flex items-center gap-2 bg-white border border-slate-950 rounded-xl px-3 py-2 w-[calc(100vw-4rem)] max-w-[calc(100vw-4rem)] sm:max-w-56 md:max-w-none md:w-72 shadow-sm transition-all">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search properties, landlords…"
                className="bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none w-full" />
              {query && (
                <button type="button" onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}
                  className="text-gray-400 hover:text-gray-600 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button type="button" onClick={openSearch}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 rounded-xl px-3 py-2 w-10 h-10 sm:w-36 sm:h-auto md:w-48 transition-all group justify-center sm:justify-start">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />
              <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors hidden sm:inline">Search…</span>
            </button>
          )}

          {showSearch && (searching || results.length > 0 || query.trim()) && (
            <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 overflow-hidden w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] md:w-80 md:max-w-[420px]">
              {searching && (
                <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-400">
                  <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Searching…
                </div>
              )}
              {!searching && results.length === 0 && query.trim() && (
                <p className="px-4 py-3 text-xs text-gray-400">No results for "{query}"</p>
              )}
              {!searching && results.length > 0 && (
                <>
                  <p className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Results</p>
                  {results.map(r => {
                    const Icon = ICON_MAP[r.type] ?? Building2
                    return (
                      <button key={r.id} type="button" onClick={() => goTo(r.href)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors group">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-slate-600" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-slate-950">{r.label}</p>
                          <p className="text-xs text-gray-400 truncate">{r.sub}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-slate-500 shrink-0 transition-colors" />
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button type="button" onClick={openNotif}
            className={cn(
              'relative w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all group',
              showSearch && 'hidden md:flex',
            )}>
            <Bell className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-colors" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                <span className="text-[9px] font-black text-white leading-none">{unread > 9 ? '9+' : unread}</span>
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-gray-900">Notifications</h3>
                  {unread > 0 && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      {unread} new
                    </span>
                  )}
                </div>
                {notifs.length > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    disabled={unread === 0}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all as read
                  </button>
                )}
              </div>

              {notifs.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                  {notifs.map(n => {
                    const { Icon, bg, ic } = notifIconFor(n.type, n.id)
                    const isRead = readIds.has(n.id)
                    return (
                      <button key={n.id} type="button" onClick={() => goTo(n.href)}
                        className={cn(
                          'relative w-full flex items-start gap-3 px-4 py-3.5 transition-colors text-left group',
                          isRead ? 'hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50/70',
                        )}>
                        {!isRead && (
                          <span aria-hidden="true" className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
                          <Icon className={`w-4 h-4 ${ic}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-xs leading-snug transition-colors',
                            isRead ? 'font-medium text-slate-600' : 'font-semibold text-gray-800 group-hover:text-slate-950',
                          )}>{n.label}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{n.sub}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-slate-500 shrink-0 mt-1 transition-colors" />
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="px-4 py-3 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => goTo('/admin/activity')}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 transition-colors">
                  Activity log <ArrowRight className="w-3 h-3" />
                </button>
                <button type="button" onClick={markAllAsRead}
                  disabled={unread === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors">
                  <Check className="w-3 h-3" />
                  Mark all as read
                </button>
              </div>
            </div>
          )}
        </div>

        {action && <div className={cn(showSearch && 'hidden md:inline-flex')}>{action}</div>}
      </div>
    </header>
  )
}
