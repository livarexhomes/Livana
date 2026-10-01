import { useState, useRef, useEffect } from 'react'
import { Search, Bell, X, ShieldCheck, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Brand color constants ──────────────────────────────────────────────────────
const BRAND   = '#6366F1' // indigo-500
const BRAND_D = '#4F46E5' // indigo-600
const ACCENT  = '#A855F7' // violet-500

// ── Types ─────────────────────────────────────────────────────────────────────
interface VettingHeaderProps {
  kycPendingCount: number
  listingsPendingCount: number
  onSearch?: (q: string) => void
  totalNotifications?: number
  adminName?: string
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VettingHeader({
  kycPendingCount,
  listingsPendingCount,
  onSearch,
  totalNotifications,
  adminName,
}: VettingHeaderProps) {
  const [query, setQuery]           = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen]   = useState(false)
  const inputRef          = useRef<HTMLInputElement>(null)
  const notifRef          = useRef<HTMLDivElement>(null)
  const mobileSearchRef   = useRef<HTMLDivElement>(null)

  const unread = totalNotifications ?? kycPendingCount + listingsPendingCount

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
      if (
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(e.target as Node)
      ) {
        setMobileSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  useEffect(() => {
    if (mobileSearchOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [mobileSearchOpen])

  function handleChange(v: string) {
    setQuery(v)
    onSearch?.(v)
  }

  return (
    <header
      className="relative shrink-0 overflow-hidden border-b border-slate-200/80 bg-white/80 backdrop-blur-md"
      role="banner"
    >
      {/* Decorative gradient wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(60% 80% at 0% 0%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(40% 60% at 100% 0%, rgba(168,85,247,0.06) 0%, transparent 60%)',
        }}
      />
      {/* Bottom hairline highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.2) 50%, transparent 100%)',
        }}
      />

      <div className="relative flex min-h-[72px] items-center justify-between gap-3 px-4 py-3 sm:px-6">

        {/* ── Left: brand mark + title ── */}
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Brand icon */}
          <div
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-md shadow-indigo-500/20"
            style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_D} 100%)` }}
          >
            <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.25} />
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm"
            >
              <Sparkles className="h-2.5 w-2.5" style={{ color: BRAND }} />
            </span>
          </div>

          {/* Text */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Operations
              </p>
              {/* Live pulse */}
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 ring-1 ring-emerald-200/60">
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            </div>
            <h1 className="truncate text-[20px] font-extrabold tracking-tight text-slate-900 sm:text-[22px]">
              Vetting <span style={{ background: `linear-gradient(135deg, ${BRAND}, ${ACCENT})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Desk</span>
            </h1>
          </div>
        </div>

        {/* ── Right: stats + search + bell + avatar ── */}
        <div className="flex shrink-0 items-center gap-2">

          {/* Live stats chips */}
          <div className="hidden items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 px-3.5 py-2 shadow-sm shadow-slate-900/[0.02] backdrop-blur sm:flex">
            <span className="flex items-center gap-1.5">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-70" />
                <span className="relative h-2 w-2 rounded-full bg-amber-400" />
              </span>
              <span className="text-[12px] font-extrabold text-slate-800">
                {kycPendingCount}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">KYC</span>
            </span>
            <span className="h-4 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: `linear-gradient(135deg, ${BRAND}, ${ACCENT})` }}
              />
              <span className="text-[12px] font-extrabold text-slate-800">
                {listingsPendingCount}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Listings</span>
            </span>
          </div>

          {/* Desktop search */}
          <div className="relative hidden md:block">
            <div
              className="group flex h-11 items-center gap-2.5 rounded-2xl border border-slate-200/70 bg-white/70 px-3.5 shadow-sm shadow-slate-900/[0.02] focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-md focus-within:shadow-indigo-500/10 focus-within:ring-4 focus-within:ring-indigo-500/10"
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
              <input
                type="search"
                value={query}
                onChange={e => handleChange(e.target.value)}
                placeholder="Search landlords…"
                aria-label="Search vetting queue"
                className="w-52 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => handleChange('')}
                  className="shrink-0 rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile search trigger */}
          <div ref={mobileSearchRef} className="relative md:hidden">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(o => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/70 text-slate-500 shadow-sm shadow-slate-900/[0.02] transition-all hover:bg-white"
              aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
              aria-expanded={mobileSearchOpen}
            >
              {mobileSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
            {mobileSearchOpen && (
              <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
                <div className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5">
                  <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={e => handleChange(e.target.value)}
                    placeholder="Search…"
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Admin avatar */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[10px] font-black text-white shadow-md ring-2 ring-white"
            style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${ACCENT} 100%)` }}
          >
            {adminName ? getInitials(adminName) : 'A'}
          </div>

          {/* Notification bell */}
          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen(o => !o)}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/70 text-slate-500 shadow-sm shadow-slate-900/[0.02] transition-all hover:bg-white',
                notifOpen && 'bg-white',
              )}
              aria-label={notifOpen ? 'Close notifications' : 'Open notifications'}
              aria-expanded={notifOpen}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[9px] font-black text-white shadow-md ring-2 ring-white"
                  style={{ background: `linear-gradient(135deg, ${BRAND}, ${ACCENT})` }}
                >
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2.5 w-80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/10">
                <div
                  className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(168,85,247,0.04) 100%)',
                  }}
                >
                  <h3 className="text-sm font-extrabold tracking-tight text-slate-900">Notifications</h3>
                  {unread > 0 && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${BRAND}, ${ACCENT})` }}
                    >
                      {unread} new
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-50">
                  <NotifRow
                    icon={<ShieldCheck className="h-3.5 w-3.5" />}
                    iconBg="bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 ring-1 ring-indigo-100"
                    label="Identity checks"
                    sub={`${kycPendingCount} awaiting review`}
                    badge={kycPendingCount > 0 ? kycPendingCount : null}
                  />
                  <NotifRow
                    icon={<svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>}
                    iconBg="bg-gradient-to-br from-violet-50 to-purple-50 text-violet-600 ring-1 ring-violet-100"
                    label="Listing submissions"
                    sub={`${listingsPendingCount} pending approval`}
                    badge={listingsPendingCount > 0 ? listingsPendingCount : null}
                    brandColor={`linear-gradient(135deg, ${BRAND}, ${ACCENT})`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function NotifRow({
  icon, iconBg, label, sub, badge, brandColor
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  sub: string
  badge?: number | null
  brandColor?: string
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/80">
      <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', iconBg)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] font-semibold text-slate-900">{label}</p>
                  {(badge != null && badge > 0) && (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
              style={{ background: brandColor ?? `linear-gradient(135deg, ${BRAND}, ${ACCENT})` }}
            >
              {badge}
            </span>
          )}
        </div>
        <p className="truncate text-[12px] text-slate-500">{sub}</p>
      </div>
    </div>
  )
}