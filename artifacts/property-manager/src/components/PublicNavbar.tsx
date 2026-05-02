import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import type { User } from '@supabase/supabase-js'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'

export default function PublicNavbar() {
  const [location] = useLocation()
  const [user, setUser] = useState<{ email?: string; isAdmin?: boolean; isLandlord?: boolean } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setUser(null); return }
      const admin = isAdminUser(user)
      const { data: landlord } = await supabase.from('landlords').select('id').eq('user_id', user.id).single()
      setUser({ email: user.email, isAdmin: admin, isLandlord: !!landlord })
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { setUser(null); return }
      const u: User = session.user
      supabase.from('landlords').select('id').eq('user_id', u.id).single().then(({ data: landlord }) => {
        setUser({ email: u.email, isAdmin: isAdminUser(u), isLandlord: !!landlord })
      })
    })
    return () => subscription.unsubscribe()
  }, [])

  const isActive = (path: string) => location === path || location.startsWith(path + '/')

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ]

  const isHomePage = location === '/'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled || !isHomePage
        ? 'bg-white/95 nav-blur border-b border-gray-100 shadow-sm'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-18 flex items-center gap-8" style={{ height: '72px' }}>
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
          <span className={`text-xl font-bold tracking-tight transition-colors ${
            scrolled || !isHomePage ? 'text-gray-900' : 'text-white'
          }`}>Livana</span>
        </Link>

        <div className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                (isActive(href) && href !== '/') || (href === '/' && location === '/')
                  ? scrolled || !isHomePage
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-white/15 text-white'
                  : scrolled || !isHomePage
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="ml-auto hidden md:flex items-center gap-2">
          {user ? (
            <>
              {user.isAdmin && (
                <Link href="/admin" className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                  scrolled || !isHomePage ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}>
                  Admin
                </Link>
              )}
              {user.isLandlord && (
                <Link href="/landlord" className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                  scrolled || !isHomePage ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}>
                  Dashboard
                </Link>
              )}
              <Link href="/user" className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                scrolled || !isHomePage ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}>
                My Account
              </Link>
              <button
                onClick={async () => {
                  const supabase = createClient()
                  await supabase.auth.signOut()
                  setUser(null)
                  window.location.href = '/'
                }}
                className="text-sm font-medium text-red-500 hover:text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-all"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                scrolled || !isHomePage ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-50' : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}>
                Sign in
              </Link>
              <Link href="/register" className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40">
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          className={`md:hidden ml-auto p-2.5 rounded-xl transition-all ${
            scrolled || !isHomePage ? 'text-gray-600 hover:bg-gray-100' : 'text-white hover:bg-white/10'
          }`}
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
        <div className="md:hidden border-t border-gray-100 bg-white/98 nav-blur px-5 py-4 space-y-1 shadow-xl">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}
              className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive(href) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
              }`}>
              {label}
            </Link>
          ))}
          <div className="pt-3 border-t border-gray-100 space-y-1">
            {user ? (
              <>
                {user.isAdmin && <Link href="/admin" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">Admin</Link>}
                {user.isLandlord && <Link href="/landlord" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">Dashboard</Link>}
                <Link href="/user" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">My Account</Link>
                <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); setUser(null); setMenuOpen(false); window.location.href = '/' }}
                  className="block w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">Sign in</Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold bg-blue-600 text-white rounded-xl text-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25">Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
