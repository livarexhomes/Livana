import { useState, useRef, useEffect } from 'react'
import { Search, Bell, X, ShieldCheck, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Brand color constants ──────────────────────────────────────────────────────
const BRAND   = '#C8102E'
const BRAND_D = '#9B0C23'

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
      className="shrink-0 border-b border-slate-200 bg-white shadow-sm shadow-slate-900/5"
      role="banner"
    >
      <div className="flex min-h-[68px] items-center justify-between gap-3 px-4 py-3 sm:px-6">

        {/* ── Left: brand mark + title ── */}
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Brand icon */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm"
            style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_D} 100%)` }}
          >
            <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2} />
          </div>

          {/* Text */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p
                className="text-[11px] font-bold uppercase tracking-widest text-slate-400"
              >
                Operations
              </p>
              {/* Live pulse */}
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <h1
              className="truncate text-[20px] font-black tracking-tight text-slate-900 sm:text-[22px]"
            >
              Vetting Desk
            </h1>
          </div>
        </div>

        {/* ── Right: stats + search + bell + avatar ── */}
        <div className="flex shrink-0 items-center gap-2">

          {/* Live stats chips */}
          <div className="hidden items-center gap-1.5 rounded-2xl bg-slate-100 px-3.5 py-2 sm:flex">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[12px] font-bold text-slate-700">
                {kycPendingCount}
              </span>
              <span className="text-[11px] font-medium text-slate-400">KYC</span>
            </span>
            <span className="h-4 w-px bg-slate-300" />
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: BRAND }}
              />
              <span className="text-[12px] font-bold text-slate-700">
                {listingsPendingCount}
              </span>
              <span className="text-[11px] font-medium text-slate-400">Listings</span>
            </span>
          </div>

          {/* Desktop search */}
          <div className="relative hidden md:block">
            <div
              className="flex h-11 items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 transition-colors focus-within:border-slate-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900/10"
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
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
                  className="shrink-0 text-slate-400 hover:text-slate-600"
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
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100"
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[10px] font-black text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_D} 100%)` }}
          >
            {adminName ? getInitials(adminName) : 'A'}
          </div>

          {/* Notification bell */}
          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen(o => !o)}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100',
                notifOpen && 'bg-slate-100',
              )}
              aria-label={notifOpen ? 'Close notifications' : 'Open notifications'}
              aria-expanded={notifOpen}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[9px] font-black text-white shadow-sm"
                  style={{ background: BRAND }}
                >
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2.5 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                  <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                  {unread > 0 && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: BRAND }}
                    >
                      {unread} new
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-50">
                  <NotifRow
                    icon={<ShieldCheck className="h-3.5 w-3.5" />}
                    iconBg="bg-slate-100 text-slate-600"
                    label="Identity checks"
                    sub={`${kycPendingCount} awaiting review`}
                    badge={kycPendingCount > 0 ? kycPendingCount : null}
                  />
                  <NotifRow
                    icon={<svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>}
                    iconBg="bg-slate-100 text-slate-600"
                    label="Listing submissions"
                    sub={`${listingsPendingCount} pending approval`}
                    badge={listingsPendingCount > 0 ? listingsPendingCount : null}
                    brandColor={BRAND}
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
    <div className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
      <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', iconBg)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] font-semibold text-slate-900">{label}</p>
                  {(badge != null && badge > 0) && (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
              style={{ background: brandColor ?? '#C8102E' }}
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
