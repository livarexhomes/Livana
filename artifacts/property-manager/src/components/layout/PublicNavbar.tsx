
import { useState, useEffect, useRef } from 'react'
import { Building2, Search, UserCircle2, Menu } from 'lucide-react'
import { Link, useLocation } from '@/lib/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import { isAdminUser } from '@/lib/auth'
import { NIGERIAN_STATES, POPULAR_AREAS } from '@/lib/nigerianStates'

const searchSuggestions = [
  'Lagos',
  'Lekki',
  'Abuja',
  'Maitama',
  'Ikeja',
  'Victoria Island',
  'Ikoyi',
  'Gwarinpa',
  'Yaba',
  'Ajah',
  ...NIGERIAN_STATES,
  ...Object.entries(POPULAR_AREAS).flatMap(([state, areas]) => [state, ...areas]),
]

export default function PublicNavbar() {
  const [location, navigate] = useLocation()
  const [user, setUser] = useState<{ email?: string; isAdmin?: boolean; isLandlord?: boolean } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const isActive = (path: string) => {
    const cleanPath = path.split('?')[0]
    return location === path || location === cleanPath || location.startsWith(cleanPath + '/')
  }

  const navLinks = [
    { href: '/listings?type=rent', label: 'Rent', comingSoon: false },
    { href: '/listings?type=lease', label: 'Lease', comingSoon: false },
    { href: null, label: 'Buy', comingSoon: true },
    { href: null, label: 'Commercial', comingSoon: true },
    { href: '/about', label: 'About', comingSoon: false },
    { href: '/contact', label: 'Contact', comingSoon: false },
  ]

  const isHomePage = location === '/'
  const isTransparent = isHomePage && !scrolled

  const getSearchRoute = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) {
      return '/listings'
    }

    const normalized = trimmed.toLowerCase()

    const stateMatch = NIGERIAN_STATES.find((state) => state.toLowerCase() === normalized)
    if (stateMatch) {
      return `/listings?city=${encodeURIComponent(stateMatch)}`
    }

    const areaMatch = Object.entries(POPULAR_AREAS)
      .flatMap(([state, areas]) => areas.map((area) => ({ state, area })))
      .find(({ area }) => area.toLowerCase() === normalized || area.toLowerCase().includes(normalized))

    if (areaMatch) {
      return `/listings?city=${encodeURIComponent(areaMatch.state)}&area=${encodeURIComponent(areaMatch.area)}`
    }

    return `/listings?area=${encodeURIComponent(trimmed)}`
  }

  const filteredSuggestions = searchQuery.trim()
    ? searchSuggestions.filter((suggestion) => suggestion.toLowerCase().includes(searchQuery.trim().toLowerCase())).slice(0, 7)
    : searchSuggestions.slice(0, 7)

  const submitSearch = () => {
    const target = getSearchRoute(searchQuery)
    setSearchOpen(false)
    setMobileSearchOpen(false)
    navigate(target)
  }

  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion)
    setSearchOpen(false)
    setMobileSearchOpen(false)
    navigate(getSearchRoute(suggestion))
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isTransparent
        ? 'bg-transparent border-b border-transparent'
        : 'bg-white/95 nav-blur border-b border-gray-100 shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {!scrolled ? (
          <div className="flex items-center justify-between md:grid md:grid-cols-3" style={{ height: '72px' }}>
            <Link href="/" className="flex items-center shrink-0">
              <img src="/livarex-logo.png" alt="LIVAREX" className="h-14 w-auto" />
            </Link>

            <div className="hidden md:flex items-center justify-center gap-0.5">
              {navLinks.map(({ href, label, comingSoon }) => (
                comingSoon ? (
                  <span key={label}
                    className={`px-4 py-2 rounded-lg text-sm font-medium cursor-default select-none flex items-center gap-1.5 ${
                      isTransparent ? 'text-white/40' : 'text-gray-300'
                    }`}>
                    {label}
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                      isTransparent ? 'bg-white/10 text-white/50' : 'bg-gray-100 text-gray-400'
                    }`}>Soon</span>
                  </span>
                ) : (
                  <Link
                    key={href}
                    href={href!}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[15px] font-semibold transition-all ${
                      (isActive(href!) && href !== '/') || (href === '/' && location === '/')
                        ? 'bg-blue-600 text-white shadow-md'
                        : isTransparent
                          ? 'text-white/90 hover:text-white hover:bg-white/10'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {label === 'Rent' ? (
                      <>
                        <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                          <Building2 className={`w-4 h-4 ${isActive(href!) ? 'text-white' : isTransparent ? 'text-white/80' : 'text-blue-600'}`} />
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
                    <Link href="/admin" className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                      isTransparent ? 'text-white hover:text-white hover:bg-white/15' : 'text-gray-700 hover:text-gray-950 hover:bg-gray-50'
                    }`}>
                      Admin
                    </Link>
                  )}
                  {user.isLandlord && (
                    <Link href="/landlord" className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                      isTransparent ? 'text-white/90 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}>
                      Dashboard
                    </Link>
                  )}
                  <Link href={user.isAdmin ? '/admin' : user.isLandlord ? '/landlord/profile' : '/user'} className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                    isTransparent ? 'text-white/90 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                    className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                      isTransparent ? 'text-red-300 hover:text-red-200 hover:bg-white/10' : 'text-red-500 hover:text-red-600 hover:bg-red-50'
                    }`}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/landlord/register" className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                    isTransparent ? 'text-white/90 hover:text-white hover:bg-white/10' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}>
                    List your Property
                  </Link>
                  <Link href="/login" className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40">
                    Sign In
                  </Link>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setMobileSearchOpen((open) => !open)}
                className={`p-2 rounded-xl transition-all ${
                  isTransparent ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                }`}
                aria-label="Search properties"
              >
                <Search className="h-4 w-4" />
              </button>

              {!user && (
                <Link href="/register" className="text-xs font-semibold bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700 transition-all whitespace-nowrap">
                  Get Started
                </Link>
              )}

              <button
                className={`p-2.5 rounded-xl transition-all ${
                  isTransparent ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3" style={{ height: '68px' }}>
            <Link href="/" className="flex items-center shrink-0">
              <img src="/livarex-logo.png" alt="LIVAREX" className="h-11 w-auto" />
            </Link>

            <div className="hidden md:flex flex-1 items-center justify-center">
              <div ref={searchRef} className="relative w-full max-w-2xl">
                <div
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm transition-all hover:border-slate-300"
                >
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => setSearchOpen(true)}
                    onChange={(event) => {
                      setSearchQuery(event.target.value)
                      setSearchOpen(true)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        submitSearch()
                      }
                    }}
                    placeholder="Search by location, estate, city or property type"
                    className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    aria-label="Search properties"
                  />
                </div>

                {searchOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_22px_50px_-28px_rgba(15,23,42,0.45)]">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => navigate('/listings?type=rent')}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700"
                      >
                        Rent
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/listings?type=lease')}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600"
                      >
                        Lease
                      </button>
                    </div>

                    <div className="mt-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Popular locations</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {filteredSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => selectSuggestion(suggestion)}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={submitSearch}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      Search properties
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="hidden md:flex items-center justify-end gap-2">
              <Link href="/listings?type=rent" className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                isActive('/listings?type=rent') ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-50'
              }`}>
                Rent
              </Link>

              <Link href="/landlord/register" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700">
                List Property
              </Link>

              {user ? (
                <Link href={user.isAdmin ? '/admin' : user.isLandlord ? '/landlord/profile' : '/user'} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-all hover:border-slate-300 hover:bg-slate-50">
                  <UserCircle2 className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
              ) : (
                <Link href="/login" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:border-slate-300 hover:bg-slate-50">
                  Sign In
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setMobileSearchOpen((open) => !open)}
                className="p-2 rounded-xl text-gray-700 hover:bg-gray-100"
                aria-label="Search properties"
              >
                <Search className="h-4 w-4" />
              </button>

              <button
                className="p-2.5 rounded-xl text-gray-700 hover:bg-gray-100"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {mobileSearchOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  submitSearch()
                }
              }}
              placeholder="Search properties or locations"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none"
              aria-label="Search properties"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {filteredSuggestions.slice(0, 6).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-left text-xs font-medium text-slate-600"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

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
                <Link href="/landlord/register" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">List your Property</Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold bg-blue-600 text-white rounded-xl text-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25">Get Started</Link>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-xl text-center">Already have an account? Sign in</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
