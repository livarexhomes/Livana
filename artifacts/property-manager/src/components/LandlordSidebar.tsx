import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { createClient } from '../lib/supabase'
import {
  LayoutDashboard, Building2, MessageSquare, User, Settings,
  LogOut, Menu, X, CheckCircle,
} from 'lucide-react'

const mainNav = [
  { label: 'Dashboard',   href: '/landlord',            exact: true,  icon: LayoutDashboard },
  { label: 'My Listings', href: '/landlord/listings',   exact: false, icon: Building2 },
  { label: 'Enquiries',   href: '/landlord/enquiries',  exact: false, icon: MessageSquare },
  { label: 'Profile',     href: '/landlord/profile',    exact: false, icon: User },
  { label: 'Settings',    href: '/landlord/settings',   exact: false, icon: Settings },
]

interface SidebarProps {
  userName?: string | null
  userEmail?: string | null
  isVerified?: boolean
}

export default function LandlordSidebar({ userName, userEmail, isVerified }: SidebarProps) {
  const [location] = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [location])

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Landlord')
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'LL'

  function isActive(item: { href: string; exact: boolean }) {
    return item.exact ? location === item.href : location.startsWith(item.href)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow shadow-blue-600/20 shrink-0">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-base font-extrabold text-gray-900 tracking-tight">Livana</span>
          <span className="ml-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md uppercase tracking-wide">Landlord</span>
        </div>
        {mobile && (
          <button type="button" onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 pt-5 pb-2 space-y-0.5 overflow-y-auto">
        {mainNav.map(item => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <Link key={item.label} href={item.href}
              className={`group flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                active ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}>
              <Icon className={`w-5 h-5 shrink-0 transition-colors ${
                active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
              }`} strokeWidth={1.7} />
              {item.label}
            </Link>
          )
        })}

        <div className="pt-5 pb-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Account</p>
        </div>
        <Link href="/listings"
          className="group flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors">
          <Building2 className="w-5 h-5 shrink-0 text-gray-400 group-hover:text-gray-600" strokeWidth={1.7} />
          Browse Listings
        </Link>
      </nav>

      {/* Profile + Logout */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-sm font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{displayName}</p>
              {isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
            </div>
            <p className="text-xs text-gray-400 truncate mt-0.5">{userEmail ?? 'landlord@livana.com'}</p>
          </div>
          <button type="button" onClick={handleLogout} title="Sign out"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-60 xl:w-64 shrink-0 flex-col bg-white border-r border-gray-100 min-h-screen sticky top-0 z-30">
        <SidebarContent />
      </aside>

      {/* ── Mobile: Hamburger button ── */}
      <button type="button" onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
        aria-label="Open menu">
        <Menu className="w-4 h-4" />
      </button>

      {/* ── Mobile: Backdrop ── */}
      <div
        onClick={() => setOpen(false)}
        className={`md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ── Mobile: Drawer ── */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 shadow-2xl transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent mobile />
      </div>
    </>
  )
}
