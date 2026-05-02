import { Link, useLocation } from 'wouter'
import { createClient } from '../lib/supabase'

const mainNav = [
  {
    label: 'Dashboard',
    href: '/admin',
    exact: true,
    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" /></svg>,
  },
  {
    label: 'Properties',
    href: '/admin/properties',
    exact: false,
    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
  {
    label: 'Landlords',
    href: '/admin/landlords',
    exact: false,
    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
]

interface SidebarProps {
  userEmail?: string | null
  userName?: string | null
}

export default function AdminSidebar({ userEmail, userName }: SidebarProps) {
  const [location] = useLocation()

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Admin')
  const initials = displayName.slice(0, 2).toUpperCase()

  function isActive(item: { href: string; exact: boolean }) {
    return item.exact ? location === item.href : location.startsWith(item.href)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="py-6 pl-6 pr-2 bg-transparent h-screen shrink-0 sticky top-0">
      <aside className="w-64 h-full flex flex-col bg-white/70 backdrop-blur-xl border border-white/80 rounded-[2rem] shadow-lg">
        <div className="flex items-center gap-3 px-6 h-20 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#6b9e6e] flex items-center justify-center shadow-lg shadow-[#6b9e6e]/20">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-slate-900 tracking-tight leading-none">Livana</span>
            <span className="text-[9px] font-black text-[#6b9e6e] uppercase tracking-[0.2em] mt-1">Admin</span>
          </div>
        </div>

        <div className="px-4 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/60 border border-white/80 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6b9e6e]/20 to-[#aadb5a]/20 flex items-center justify-center border border-[#6b9e6e]/20 shrink-0">
              <span className="text-sm font-black text-[#4a7f4d]">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-900 truncate">{displayName}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate mt-0.5">{userEmail ?? 'Admin'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
          <p className="px-2 mb-3 mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Menu</p>
          {mainNav.map(item => {
            const active = isActive(item)
            return (
              <Link key={item.label} href={item.href}
                className={`group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                  active ? 'bg-white text-[#4a7f4d] shadow-md border border-white' : 'text-slate-500 hover:bg-white/50 hover:text-slate-800 border border-transparent'
                }`}>
                <span className={`shrink-0 ${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>{item.icon}</span>
                {item.label}
                {active && <span className="absolute right-4 w-1.5 h-1.5 rounded-full bg-[#6b9e6e]" />}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 mt-auto">
          <button onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-2xl text-sm font-bold text-slate-500 bg-white/40 hover:bg-rose-50 hover:text-rose-600 border border-white/60 hover:border-rose-200 transition-all group shadow-sm">
            <svg className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>
    </div>
  )
}
