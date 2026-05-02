import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'

export default function PublicNavbar() {
  const [location] = useLocation()
  const [user, setUser] = useState<{ email?: string; isAdmin?: boolean; isLandlord?: boolean } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setUser(null); return }
      const admin = isAdminUser(user as any)
      const { data: landlord } = await supabase.from('landlords').select('id').eq('user_id', user.id).single()
      setUser({ email: user.email, isAdmin: admin, isLandlord: !!landlord })
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { setUser(null); return }
      const u = session.user
      isAdminUser(u as any)
      supabase.from('landlords').select('id').eq('user_id', u.id).single().then(({ data: landlord }) => {
        setUser({ email: u.email, isAdmin: isAdminUser(u as any), isLandlord: !!landlord })
      })
    })
    return () => subscription.unsubscribe()
  }, [])

  const isActive = (path: string) => location === path || location.startsWith(path + '/')

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/listings', label: 'Listings' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#6b9e6e] flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">Livana</span>
        </Link>

        <div className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(href) && href !== '/'
                  ? 'bg-[#6b9e6e]/10 text-[#4a7f4d]'
                  : href === '/' && location === '/'
                    ? 'bg-[#6b9e6e]/10 text-[#4a7f4d]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="ml-auto hidden md:flex items-center gap-3">
          {user ? (
            <>
              {user.isAdmin && (
                <Link href="/admin" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  Admin
                </Link>
              )}
              {user.isLandlord && (
                <Link href="/landlord" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  Dashboard
                </Link>
              )}
              <Link href="/user" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                My Account
              </Link>
              <button
                onClick={async () => {
                  const supabase = createClient()
                  await supabase.auth.signOut()
                  setUser(null)
                  window.location.href = '/'
                }}
                className="text-sm font-medium text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Sign in
              </Link>
              <Link href="/register" className="text-sm font-medium bg-[#6b9e6e] hover:bg-[#4a7f4d] text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden ml-auto p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(href) ? 'bg-[#6b9e6e]/10 text-[#4a7f4d]' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100">
            {user ? (
              <>
                {user.isAdmin && <Link href="/admin" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Admin</Link>}
                {user.isLandlord && <Link href="/landlord" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Dashboard</Link>}
                <Link href="/user" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">My Account</Link>
                <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); setUser(null); setMenuOpen(false); window.location.href = '/' }}
                  className="block w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">Sign in</Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm font-medium bg-[#6b9e6e] text-white rounded-lg text-center mt-1">Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
