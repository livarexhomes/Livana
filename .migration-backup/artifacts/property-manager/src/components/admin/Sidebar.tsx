'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const mainNav = [
  {
    label: 'Dashboard',
    href: '/admin',
    matchExact: true,
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
      </svg>
    ),
  },
  {
    label: 'Properties',
    href: '/admin/properties',
    matchExact: false,
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    label: 'Landlords',
    href: '/admin/landlords',
    matchExact: false,
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

const secondaryNav = [
  {
    label: 'Reports',
    href: '/admin/reports',
    neverActive: true,
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    neverActive: true,
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

interface SidebarProps {
  userEmail?: string | null
  userName?: string | null
}

export default function Sidebar({ userEmail, userName }: SidebarProps) {
  const pathname = usePathname()

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Admin')
  const initials = displayName.slice(0, 2).toUpperCase()

  function isActive(item: { href: string; matchExact?: boolean; neverActive?: boolean }) {
    if (item.neverActive) return false
    if (item.matchExact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  function NavItem({ item }: { item: { label: string; href: string; icon: React.ReactNode; matchExact?: boolean; neverActive?: boolean } }) {
    const active = isActive(item)
    return (
      <Link
        href={item.href}
        className={`group relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
          active
            ? 'bg-white text-blue-600 shadow-[0_4px_15px_rgb(0,0,0,0.05)] border border-white'
            : 'text-slate-500 hover:bg-white/50 hover:text-slate-800 border border-transparent'
        }`}
      >
        <span className={`shrink-0 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
          {item.icon}
        </span>
        <span className="truncate tracking-wide">{item.label}</span>
        
        {/* Active Indicator Dot */}
        {active && (
          <span className="absolute right-4 w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgb(37,99,235,0.6)]" />
        )}
      </Link>
    )
  }

  return (
    // The wrapper adds padding around the sidebar so it "floats" inside the main window
    <div className="py-6 pl-6 pr-2 bg-transparent h-screen shrink-0 sticky top-0">
      
      {/* The actual floating glass container */}
      <aside className="w-64 h-full flex flex-col bg-white/40 backdrop-blur-2xl border border-white/80 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 h-20 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-slate-900 tracking-tight leading-none">Livana</span>
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1">Workspace</span>
          </div>
        </div>

        {/* Profile Card (Floating inside the sidebar) */}
        <div className="px-4 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 border border-white/80 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center border border-blue-200 shrink-0">
              <span className="text-sm font-black text-blue-600">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-900 truncate">{displayName}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate mt-0.5">{userEmail ?? 'Admin'}</p>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto hide-scrollbar">
          <p className="px-2 mb-3 mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Menu</p>
          {mainNav.map((item) => <NavItem key={item.label} item={item} />)}

          <div className="pt-6">
            <p className="px-2 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">General</p>
            {secondaryNav.map((item) => <NavItem key={item.label} item={item} />)}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 mt-auto">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-2xl text-sm font-bold text-slate-500
                bg-white/40 hover:bg-rose-50 hover:text-rose-600 border border-white/60 hover:border-rose-200 transition-all duration-300 group shadow-sm"
            >
              <svg className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </form>
        </div>
      </aside>
    </div>
  )
}