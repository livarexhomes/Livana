import { useState, useRef, useEffect } from 'react'
import { Search, Bell, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VettingHeaderProps {
  kycPendingCount: number
  listingsPendingCount: number
  onSearch?: (q: string) => void
  totalNotifications?: number
}

export default function VettingHeader({
  kycPendingCount,
  listingsPendingCount,
  onSearch,
  totalNotifications,
}: VettingHeaderProps) {
  const [query, setQuery] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)

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
    if (mobileSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [mobileSearchOpen])

  function handleChange(v: string) {
    setQuery(v)
    onSearch?.(v)
  }

  return (
    <header
      className="sticky top-0 z-20 h-14 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-800 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/80"
      role="banner"
    >
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6">
        {/* Left: title + subtitle */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[18px] sm:text-[22px] md:text-[28px] font-bold leading-none text-[#0B1F4D] dark:text-white">
            Vetting Hub
          </h1>
          <p className="mt-0.5 hidden sm:block truncate text-[12px] font-medium text-slate-500 dark:text-slate-400">
            Review landlord identities &amp; listing submissions
          </p>
        </div>

        {/* Right: search + bell */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Desktop search */}
          <div className="relative hidden md:block">
            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-colors focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-blue-500 dark:focus-within:bg-slate-900 dark:focus-within:ring-blue-900/40">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={e => handleChange(e.target.value)}
                placeholder="Search landlords, listings…"
                aria-label="Search vetting queue"
                className="w-56 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => handleChange('')}
                  className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
              aria-expanded={mobileSearchOpen}
            >
              {mobileSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
            {mobileSearchOpen && (
              <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-700 dark:bg-slate-800">
                  <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={e => handleChange(e.target.value)}
                    placeholder="Search…"
                    aria-label="Search vetting queue"
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notification bell */}
          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen(o => !o)}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                notifOpen && 'bg-slate-100 dark:bg-slate-700',
              )}
              aria-label={notifOpen ? 'Close notifications' : 'Open notifications'}
              aria-expanded={notifOpen}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-none text-white ring-2 ring-white dark:ring-slate-900">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Notifications
                  </h3>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950/50 dark:text-red-300">
                    {unread} new
                  </span>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  <NotifRow
                    label="Identity checks"
                    sub={`${kycPendingCount} awaiting review`}
                    tone="indigo"
                  />
                  <NotifRow
                    label="Listing submissions"
                    sub={`${listingsPendingCount} pending approval`}
                    tone="violet"
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

function NotifRow({ label, sub, tone }: { label: string; sub: string; tone: 'indigo' | 'violet' }) {
  const toneCls =
    tone === 'indigo'
      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'
      : 'bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300'
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${toneCls}`}>
        <Bell className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{label}</p>
        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{sub}</p>
      </div>
    </div>
  )
}
