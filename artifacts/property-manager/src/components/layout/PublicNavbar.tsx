
import * as React from 'react'
import { useState, useEffect, useRef } from 'react'
import { Building2, Search, UserCircle2, Menu, MapPin, BedDouble, BadgeDollarSign, ChevronDown, X } from 'lucide-react'
import { Link, useLocation } from '@/lib/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import { isAdminUser } from '@/lib/auth'
import { NIGERIAN_STATES, POPULAR_AREAS } from '@/lib/nigerianStates'

const searchSuggestions = [
  'Lagos',
  'Lekki',
  'Ogun',
  'Maitama',
  'Ikeja',
  'Victoria Island',
  'Ikoyi',
  'Yaba',
  'Ajah',
  ...NIGERIAN_STATES,
  ...Object.entries(POPULAR_AREAS).flatMap(([state, areas]) => [state, ...areas]),
]

const PROPERTY_TYPE_OPTIONS = [
  'Apartment',
  'Flat',
  'House',
  'Self Contained',
  'Duplex',
  'Bungalow',
  'Studio Apartment',
  'Terrace',
  'Maisonette',
  'Penthouse',
  'Office',
  'Shop',
  'Land',
]

const BEDROOM_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '1', label: '1 Bedroom' },
  { value: '2', label: '2 Bedrooms' },
  { value: '3', label: '3 Bedrooms' },
  { value: '4', label: '4+ Bedrooms' },
]

export default function PublicNavbar() {
  const [location, navigate] = useLocation()
  const [user, setUser] = useState<{ email?: string; isAdmin?: boolean; isLandlord?: boolean } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [openPanel, setOpenPanel] = useState<'location' | 'type' | 'beds' | 'price' | null>(null)
  const searchRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setOpenPanel(null)
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

  useEffect(() => {
    setMenuOpen(false)
    setMobileSearchOpen(false)
    setOpenPanel(null)
  }, [location])

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

  const buildSearchUrl = (locationOverride?: string) => {
    const params = new URLSearchParams()
    const trimmedLocation = (locationOverride ?? searchQuery).trim()

    if (trimmedLocation) {
      const normalized = trimmedLocation.toLowerCase()
      const stateMatch = NIGERIAN_STATES.find((state) => state.toLowerCase() === normalized || state.toLowerCase().includes(normalized))

      if (stateMatch) {
        params.set('city', stateMatch)
      } else {
        const areaMatch = Object.entries(POPULAR_AREAS)
          .flatMap(([state, areas]) => areas.map((area) => ({ state, area })))
          .find(({ area }) => area.toLowerCase() === normalized || area.toLowerCase().includes(normalized))

        if (areaMatch) {
          params.set('city', areaMatch.state)
          params.set('area', areaMatch.area)
        } else {
          params.set('area', trimmedLocation)
        }
      }
    }

    if (propertyType) params.set('property_type', propertyType)
    if (bedrooms) params.set('beds', bedrooms)
    if (priceMin) params.set('price_min', priceMin)
    if (priceMax) params.set('price_max', priceMax)

    return `/listings${params.size ? `?${params.toString()}` : ''}`
  }

  const filteredSuggestions = searchQuery.trim()
    ? searchSuggestions.filter((suggestion) => suggestion.toLowerCase().includes(searchQuery.trim().toLowerCase())).slice(0, 7)
    : searchSuggestions.slice(0, 7)

  const submitSearch = () => {
    setOpenPanel(null)
    setMobileSearchOpen(false)
    navigate(buildSearchUrl())
  }

  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion)
    setOpenPanel(null)
    setMobileSearchOpen(false)
    navigate(buildSearchUrl(suggestion))
  }

  const togglePanel = (panel: 'location' | 'type' | 'beds' | 'price') => {
    setOpenPanel((current) => current === panel ? null : panel)
  }

  const locationValue = searchQuery.trim() || 'Location'
  const propertyTypeLabel = propertyType || 'Property Type'
  const bedroomsLabel = bedrooms ? `${bedrooms}+ Bedrooms` : 'Bedrooms'
  const priceRangeLabel = priceMin || priceMax ? [priceMin ? `₦${Number(priceMin).toLocaleString()}` : 'Any', priceMax ? `₦${Number(priceMax).toLocaleString()}` : 'Any'].join(' – ') : 'Price Range'

  return (
    <nav aria-label="Main navigation" onKeyDown={(event) => {
      if (event.key === 'Escape') {
        if (openPanel) {
          searchRef.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus()
        }
        setOpenPanel(null)
        setMenuOpen(false)
        setMobileSearchOpen(false)
      }
    }} className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isTransparent
        ? 'bg-transparent border-b border-transparent'
        : 'bg-white/95 nav-blur border-b border-gray-100 shadow-sm'
    }`}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {!scrolled ? (
          <div className="flex items-center justify-between" style={{ height: '72px' }}>
            <Link href="/" className="flex items-center shrink-0">
              <img src="/livarex-logo.png" alt="LIVAREX" className="h-14 w-auto" />
            </Link>

            <div className="hidden lg:flex flex-1 min-w-0 items-center justify-center gap-0.5 px-2 xl:px-4">
              {navLinks.map(({ href, label, comingSoon }) => (
                comingSoon ? (
                  <span key={label}
                    className={`px-2 xl:px-4 py-2 rounded-lg text-sm font-medium cursor-default select-none flex items-center gap-1.5 ${
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

            <div className="hidden lg:flex shrink-0 items-center justify-end gap-2 whitespace-nowrap">
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

            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => { setMobileSearchOpen((open) => !open); setMenuOpen(false) }}
                aria-expanded={mobileSearchOpen}
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
                onClick={() => { setMenuOpen(!menuOpen); setMobileSearchOpen(false) }}
                aria-expanded={menuOpen}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 xl:gap-4 py-2" style={{ minHeight: '72px' }}>
            <Link href="/" className="flex items-center shrink-0">
              <img src="/livarex-logo.png" alt="LIVAREX" className="h-11 w-auto" />
            </Link>

            <div className="hidden lg:flex min-w-0 flex-1 items-center justify-center">
              <div ref={searchRef} className="relative min-w-0 w-full max-w-[820px]">
                <div className="grid min-w-0 items-center rounded-full border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-100"
                  style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.2fr) 52px" }}>
                  <button
                    type="button"
                    onClick={() => togglePanel('location')}
                    aria-expanded={openPanel === 'location'}
                    aria-label={locationValue}
                    title={locationValue}
                    className="flex min-w-0 flex-1 items-center gap-2 border-r border-slate-200 px-3 py-3.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
                    <span className={`truncate text-sm font-medium ${searchQuery.trim() ? 'text-slate-900' : 'text-slate-500'}`}>
                      {locationValue}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePanel('type')}
                    aria-expanded={openPanel === 'type'}
                    aria-label={propertyTypeLabel}
                    title={propertyTypeLabel}
                    className="flex min-w-0 items-center gap-2 border-r border-slate-200 px-3 py-3.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
                    <span className={`min-w-0 truncate text-sm font-medium ${propertyType ? 'text-slate-900' : 'text-slate-500'}`}>
                      {propertyTypeLabel}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePanel('beds')}
                    aria-expanded={openPanel === 'beds'}
                    aria-label={bedroomsLabel}
                    title={bedroomsLabel}
                    className="flex min-w-0 items-center gap-2 border-r border-slate-200 px-3 py-3.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <BedDouble className="h-4 w-4 shrink-0 text-blue-600" />
                    <span className={`min-w-0 truncate text-sm font-medium ${bedrooms ? 'text-slate-900' : 'text-slate-500'}`}>
                      {bedroomsLabel}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePanel('price')}
                    aria-expanded={openPanel === 'price'}
                    aria-label={priceRangeLabel}
                    title={priceRangeLabel}
                    className="flex min-w-0 items-center gap-2 px-3 py-3.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <BadgeDollarSign className="h-4 w-4 shrink-0 text-blue-600" />
                    <span className={`min-w-0 truncate text-sm font-medium ${priceMin || priceMax ? 'text-slate-900' : 'text-slate-500'}`}>
                      {priceRangeLabel}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={submitSearch}
                    className="mx-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-600/30 transition-all hover:bg-blue-700"
                    aria-label="Search properties"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>

                {openPanel === 'location' && (
                  <div className="absolute left-0 right-0 top-[calc(100%+12px)] rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <Search className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => {
                          setSearchQuery(event.target.value)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            submitSearch()
                          }
                        }}
                        placeholder="Search city, area or estate"
                        className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                        aria-label="Search location"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
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
                )}

                {openPanel === 'type' && (
                  <div className="absolute left-1/2 top-[calc(100%+12px)] w-[320px] -translate-x-1/2 rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
                    <p className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Property type</p>
                    <div className="mt-2 space-y-1">
                      <button
                        type="button"
                        onClick={() => { setPropertyType(''); setOpenPanel(null) }}
                        className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${!propertyType ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        Any
                      </button>
                      {PROPERTY_TYPE_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => { setPropertyType(option); setOpenPanel(null) }}
                          className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${propertyType === option ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {openPanel === 'beds' && (
                  <div className="absolute left-1/2 top-[calc(100%+12px)] w-[260px] -translate-x-1/2 rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
                    <p className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Bedrooms</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {BEDROOM_OPTIONS.map((option) => (
                        <button
                          key={option.value || 'any'}
                          type="button"
                          onClick={() => { setBedrooms(option.value); setOpenPanel(null) }}
                          className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${bedrooms === option.value ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {openPanel === 'price' && (
                  <div className="absolute right-0 top-[calc(100%+12px)] w-[320px] rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Price range</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Min</label>
                        <input
                          type="number"
                          min="0"
                          value={priceMin}
                          onChange={(event) => setPriceMin(event.target.value)}
                          placeholder="500000"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Max</label>
                        <input
                          type="number"
                          min="0"
                          value={priceMax}
                          onChange={(event) => setPriceMax(event.target.value)}
                          placeholder="5000000"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpenPanel(null)}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:flex shrink-0 items-center justify-end gap-2 whitespace-nowrap">
<a href="/contact" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:border-slate-300 hover:bg-slate-50">
                    Contact
                  </a>

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

              <Link href="/landlord/register" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700">
                List Property
              </Link>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => { setMobileSearchOpen((open) => !open); setMenuOpen(false) }}
                aria-expanded={mobileSearchOpen}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300"
                aria-label="Search properties"
              >
                Search Properties
              </button>

              <button
                className="p-2.5 rounded-xl text-gray-700 hover:bg-gray-100"
                onClick={() => { setMenuOpen(!menuOpen); setMobileSearchOpen(false) }}
                aria-expanded={menuOpen}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {mobileSearchOpen && (
        <div className="max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain lg:hidden border-t border-gray-100 bg-white px-4 py-4 shadow-sm">
          <div className="space-y-3">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
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
                placeholder="Location"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none"
                aria-label="Search location"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Property type</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPropertyType('')}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${!propertyType ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
                >
                  Any
                </button>
                {PROPERTY_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPropertyType(option)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${propertyType === option ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Bedrooms</p>
              <div className="flex flex-wrap gap-2">
                {BEDROOM_OPTIONS.map((option) => (
                  <button
                    key={option.value || 'any'}
                    type="button"
                    onClick={() => setBedrooms(option.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${bedrooms === option.value ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Price range</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  value={priceMin}
                  onChange={(event) => setPriceMin(event.target.value)}
                  placeholder="Min"
                  className="min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
                />
                <input
                  type="number"
                  min="0"
                  value={priceMax}
                  onChange={(event) => setPriceMax(event.target.value)}
                  placeholder="Max"
                  className="min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={submitSearch}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Search Properties
            </button>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain lg:hidden border-t border-gray-100 bg-white/98 nav-blur px-5 py-4 space-y-1 shadow-xl">
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
