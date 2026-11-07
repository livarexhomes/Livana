import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, LogOut, Settings, ShieldCheck, Building2 } from 'lucide-react'
import { Link } from '@/lib/navigation'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface VettingHeaderProps {
  kycPendingCount: number
  listingsPendingCount: number
  totalNotifications?: number
  adminName?: string
}

function initials(name: string) {
  return name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

export default function VettingHeader({
  kycPendingCount,
  listingsPendingCount,
  totalNotifications,
  adminName = 'Admin',
}: VettingHeaderProps) {
  const { toast } = useToast()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const unread = totalNotifications ?? kycPendingCount + listingsPendingCount

  useEffect(() => {
    function onOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  async function handleLogout() {
    try {
      const { error } = await createClient().auth.signOut()
      if (error) throw error
      window.location.href = '/'
    } catch (error) {
      console.error('[vetting] Admin sign-out failed:', error)
      toast({
        title: 'Could not sign out',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <header className="relative z-30 flex min-h-[68px] shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6" role="banner">
      <div className="min-w-0">
        <p className="hidden text-[11px] font-medium text-slate-500 sm:block">Admin <span className="mx-1.5 text-slate-300">/</span> Operations</p>
        <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:mt-0.5 sm:text-xl">Vetting Desk</h1>
        <p className="hidden text-xs text-slate-500 md:block">Review landlord identities and property submissions.</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen(open => !open)}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={notifOpen ? 'Close notifications' : 'Open notifications'}
            aria-expanded={notifOpen}
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && <span className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">{unread > 99 ? '99+' : unread}</span>}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">Review notifications</h2>
                <p className="mt-0.5 text-xs text-slate-500">{unread} item{unread === 1 ? '' : 's'} awaiting attention</p>
              </div>
              <div className="divide-y divide-slate-100">
                <NotificationRow icon={<ShieldCheck className="h-4 w-4" />} label="Identity checks" count={kycPendingCount} />
                <NotificationRow icon={<Building2 className="h-4 w-4" />} label="Listing approvals" count={listingsPendingCount} />
              </div>
            </div>
          )}
        </div>

        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(open => !open)}
            aria-expanded={profileOpen}
            className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-[10px] font-semibold text-white">{initials(adminName) || 'A'}</span>
            <span className="hidden max-w-28 truncate sm:block">{adminName}</span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              <Link href="/admin/settings" onClick={() => setProfileOpen(false)} className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-slate-700 hover:bg-slate-50">
                <Settings className="h-4 w-4 text-slate-500" /> Admin settings
              </Link>
              <button type="button" onClick={() => void handleLogout()} className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-slate-700 hover:bg-slate-50">
                <LogOut className="h-4 w-4 text-slate-500" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function NotificationRow({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{label}</span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{count}</span>
    </div>
  )
}
