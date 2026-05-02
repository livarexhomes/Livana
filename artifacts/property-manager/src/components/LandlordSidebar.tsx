import { Link, useLocation } from 'wouter'
import { createClient } from '../lib/supabase'

const mainNav = [
  {
    label: 'Dashboard',
    href: '/landlord',
    exact: true,
    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" /></svg>,
  },
  {
    label: 'My Listings',
    href: '/landlord/listings',
    exact: false,
    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
  {
    label: 'Enquiries',
    href: '/landlord/enquiries',
    exact: false,
    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" /></svg>,
  },
  {
    label: 'Profile',
    href: '/landlord/profile',
    exact: false,
    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  },
]

interface SidebarProps {
  userName?: string | null
  userEmail?: string | null
  isVerified?: boolean
}

export default function LandlordSidebar({ userName, userEmail, isVerified }: SidebarProps) {
  const [location] = useLocation()

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Landlord')
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  function isActive(item: { href: string; exact: boolean }) {
    return item.exact ? location === item.href : location.startsWith(item.href)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-white border-r border-gray-100 min-h-screen">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#6b9e6e] flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
        </div>
        <span className="text-base font-bold text-gray-900">Livana</span>
        <span className="ml-auto text-[10px] font-semibold text-[#6b9e6e] bg-[#6b9e6e]/10 px-1.5 py-0.5 rounded-md">Landlord</span>
      </div>

      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6b9e6e] to-[#aadb5a] flex items-center justify-center shadow-sm shrink-0">
          <span className="text-xs font-bold text-white">{initials}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
            {isVerified && (
              <svg className="w-3.5 h-3.5 text-[#6b9e6e] shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate">{userEmail ?? 'Landlord'}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Main</p>
        {mainNav.map(item => {
          const active = isActive(item)
          return (
            <Link key={item.label} href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-[#6b9e6e] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}>
              <span className={`shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-5 pt-3 border-t border-gray-100">
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all group">
          <svg className="w-[18px] h-[18px] text-gray-400 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  )
}
