'use client'

import { useState, useEffect } from 'react'
import { Building2 } from 'lucide-react'
import { Link, useLocation } from '@/lib/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import { isAdminUser } from '@/lib/auth'

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
    { href: '/', label: 'Home', comingSoon: false },
    { href: '/listings?type=rent', label: 'Rent', comingSoon: false },
    { href: '/listings?type=lease', label: 'Lease', comingSoon: false },
    { href: null, label: 'Buy', comingSoon: true },
    { href: null, label: 'Commercial', comingSoon: true },
  ]

  const isHomePage = location === '/'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/95 nav-blur border-b border-gray-100 ${
      scrolled ? 'shadow-sm' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-3 items-center" style={{ height: '80px' }}>
        <Link href="/" className="flex items-center shrink-0">
          <img src="/livarex-logo.png" alt="LIVAREX" className="h-16 w-auto" />
        </Link>

        <div className="hidden md:flex items-center justify-center gap-0.5">
          {navLinks.map(({ href, label, comingSoon }) => (
            comingSoon ? (
              <span key={label}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 cursor-default select-none flex items-center gap-1.5">
                {label}
                <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md">Soon</span>
              </span>
            ) : (
              <Link
                key={href}
                href={href!}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  (isActive(href!) && href !== '/') || (href === '/' && location === '/')
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {label === 'Rent' ? (
                  <>
                    <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                      <Building2 className={`w-4 h-4 ${isActive(href!) ? 'text-white' : 'text-blue-600'}`} />
                    </span>
                    <span>{label}</span>
                  </>
                ) : (
                  <span>{label}</span>
                )}
              </Link>
            )
          ))}
        </div>

        <div className="hidden md:flex items-center justify-end gap-2">
          {user ? (
            <>
              {user.isAdmin && (
                <Link href="/admin" className="text-sm font-medium px-4 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                  Admin
                </Link>
              )}
              {user.isLandlord && (
                <Link href="/landlord" className="text-sm font-medium px-4 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                  Dashboard
                </Link>
              )}
              <Link href={user.isAdmin ? '/admin' : user.isLandlord ? '/landlord/profile' : '/user'} className="text-sm font-medium px-4 py-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-50">
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
              <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg transition-all text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                Sign in
              </Link>
              <Link href="/register" className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40">
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden ml-auto p-2.5 rounded-xl transition-all text-gray-700 hover:bg-gray-100"
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
          {navLinks.map(({ href, label, comingSoon }) => (
            comingSoon ? (
              <span key={label}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 cursor-default select-none">
                {label}
                <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md">Soon</span>
              </span>
            ) : (
              <Link key={href} href={href!} onClick={() => setMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive(href!) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                }`}>
                {label === 'Rent' ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </span>
                    <span>{label}</span>
                  </span>
                ) : (
                  <span>{label}</span>
                )}
              </Link>
            )
          ))}
          <div className="pt-3 border-t border-gray-100 space-y-1">
            {user ? (
              <>
                {user.isAdmin && <Link href="/admin" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">Admin</Link>}
                {user.isLandlord && <Link href="/landlord" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">Dashboard</Link>}
                <Link href={user.isAdmin ? '/admin' : user.isLandlord ? '/landlord/profile' : '/user'} onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">My Account</Link>
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
