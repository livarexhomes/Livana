import { useState, useEffect, useRef, ReactNode } from 'react'
import { useLocation } from 'wouter'
import { Search, Bell, X, Building2, Users, MessageSquare, ArrowRight, ChevronRight } from 'lucide-react'
import { createClient } from '../lib/supabase'

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
  type: 'warning' | 'info'
}

interface AdminHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  pendingCount?: number
}

export default function AdminHeader({ title, subtitle, action, pendingCount = 0 }: AdminHeaderProps) {
  const [, navigate] = useLocation()
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<SearchResult[]>([])
  const [searching, setSearching]   = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showNotif, setShowNotif]   = useState(false)
  const [notifs, setNotifs]         = useState<Notif[]>([])
  const [unread, setUnread]         = useState(0)
  const searchRef = useRef<HTMLDivElement>(null)
  const notifRef  = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Load notifications once
  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('landlords').select('id, full_name, city, status').eq('status', 'pending').limit(5),
      supabase.from('enquiries').select('id, message, status, properties(title)').eq('status', 'open').order('created_at', { ascending: false }).limit(3),
    ]).then(([{ data: pending }, { data: enqs }]) => {
      const items: Notif[] = []
      for (const l of pending ?? []) {
        items.push({ id: l.id, label: `${l.full_name} awaiting approval`, sub: l.city ?? 'Nigeria', href: '/admin/landlords', type: 'warning' })
      }
      for (const e of enqs ?? []) {
        items.push({ id: e.id, label: (e as any).properties?.title ?? 'Property enquiry', sub: e.message?.slice(0, 50) ?? '', href: '/admin/properties', type: 'info' })
      }
      setNotifs(items)
      setUnread(items.length)
    })
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const supabase = createClient()
      const q = query.trim()
      const [propRes, llRes] = await Promise.all([
        supabase.from('properties').select('id, title, city, property_type, price').ilike('title', `%${q}%`).limit(5),
        supabase.from('landlords').select('id, full_name, city, status').ilike('full_name', `%${q}%`).limit(4),
      ])
      const out: SearchResult[] = [
        ...(propRes.data ?? []).map((p: any) => ({
          id: p.id, label: p.title, sub: `${p.city ?? ''} · ₦${Number(p.price ?? 0).toLocaleString()}`,
          href: `/admin/properties`, type: 'property' as const,
        })),
        ...(llRes.data ?? []).map((l: any) => ({
          id: l.id, label: l.full_name, sub: `${l.city ?? ''} · ${l.status}`,
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
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function openSearch() {
    setShowSearch(true)
    setShowNotif(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function clearSearch() {
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  function goToResult(href: string) {
    setShowSearch(false)
    setQuery('')
    navigate(href)
  }

  function openNotif() {
    setShowNotif(v => !v)
    setShowSearch(false)
    setUnread(0)
  }

  const ICON_MAP = { property: Building2, landlord: Users, enquiry: MessageSquare }

  return (
    <header className="flex items-center justify-between pl-14 pr-4 md:px-6 py-3.5 bg-white border-b border-gray-100 shrink-0 gap-3">
      {/* Title */}
      <div className="min-w-0">
        <h1 className="text-base font-extrabold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Search */}
        <div ref={searchRef} className="relative hidden sm:block">
          {showSearch ? (
            <div className="flex items-center gap-2 bg-white border-2 border-blue-500 rounded-xl px-3 py-2 w-56 md:w-72 shadow-lg shadow-blue-500/10 transition-all">
              <Search className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search properties, landlords…"
                className="bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none w-full" />
              {query && (
                <button type="button" onClick={clearSearch} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button type="button" onClick={openSearch}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl px-3 py-2 w-36 md:w-48 transition-all group">
              <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 shrink-0 transition-colors" />
              <span className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">Search…</span>
            </button>
          )}

          {/* Results dropdown */}
          {showSearch && (searching || results.length > 0 || query.trim()) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 overflow-hidden min-w-[280px]">
              {searching && (
                <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-400">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
                      <button key={r.id} type="button" onClick={() => goToResult(r.href)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors group">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-700">{r.label}</p>
                          <p className="text-xs text-gray-400 truncate">{r.sub}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 shrink-0 transition-colors" />
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
            className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all group">
            <Bell className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                <span className="text-[9px] font-black text-white leading-none">{unread > 9 ? '9+' : unread}</span>
              </span>
            )}
          </button>

          {/* Notification panel */}
          {showNotif && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                <h3 className="text-sm font-extrabold text-gray-900">Notifications</h3>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {notifs.length} new
                </span>
              </div>

              {notifs.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                  {notifs.map(n => (
                    <button key={n.id} type="button" onClick={() => { navigate(n.href); setShowNotif(false) }}
                      className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-blue-50/50 transition-colors text-left group">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        n.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                      }`}>
                        {n.type === 'warning'
                          ? <Users className="w-4 h-4 text-amber-600" />
                          : <MessageSquare className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 leading-snug group-hover:text-blue-700 transition-colors">{n.label}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{n.sub}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 shrink-0 mt-1 transition-colors" />
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4 py-3 border-t border-gray-100">
                <button type="button" onClick={() => { navigate('/admin/landlords'); setShowNotif(false) }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  View all activity <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Optional action button */}
        {action}
      </div>
    </header>
  )
}
