import * as React from 'react'
import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Search, UserCircle2, Menu, MapPin, BedDouble, BadgeDollarSign, ChevronDown, X, Check } from 'lucide-react'
import { Link, useLocation } from '@/lib/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import { isAdminUser } from '@/lib/auth'
import { NIGERIAN_STATES, POPULAR_AREAS } from '@/lib/nigerianStates'

// ─── Constants ───

type SearchPanelName = 'location' | 'type' | 'beds' | 'price'

const SEARCH_SUGGESTIONS = [
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

const NAV_LINKS = [
  { href: '/listings?type=rent', label: 'Rent', comingSoon: false },
  { href: '/listings?type=lease', label: 'Lease', comingSoon: false },
  { href: null, label: 'Buy', comingSoon: true },
  { href: null, label: 'Commercial', comingSoon: true },
  { href: '/about', label: 'About', comingSoon: false },
  { href: '/contact', label: 'Contact', comingSoon: false },
] as const

const PANEL_CARD = 'absolute z-20 rounded-3xl bg-white p-3 ring-1 ring-slate-200/80 shadow-[0_18px_50px_rgba(15,23,42,0.14)]'
const PANEL_TITLE = 'px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400'
const PANEL_TRANSITION = { duration: 0.18, ease: 'easeOut' as const }

// ─── Search Panels ───

interface SingleSelectPanelProps {
  selected: string
  onSelect: (value: string) => void
}

function LocationPanel({ query, onQueryChange, suggestions, onSelect, onSubmit }: {
  query: string
  onQueryChange: (value: string) => void
  suggestions: string[]
  onSelect: (suggestion: string) => void
  onSubmit: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={PANEL_TRANSITION}
      className={`${PANEL_CARD} left-0 right-0 top-[calc(100%+12px)]`}
    >
      <div className="flex items-center gap-2.5 rounded-2xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-200/70 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/30">
        <Search className="h-4 w-4 shrink-0 text-blue-600" />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onSubmit()
            }
          }}
          placeholder="Search city, area or estate"
          className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          aria-label="Search location"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelect(suggestion)}
            className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 ring-1 ring-transparent transition-all hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-100"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-blue-500" />
            <span className="truncate">{suggestion}</span>
          </button>
        ))}
      </div>

      {suggestions.length === 0 && (
        <p className="px-2 py-6 text-center text-sm text-slate-400">No matching locations — try another name.</p>
      )}
    </motion.div>
  )
}

function TypePanel({ selected, onSelect }: SingleSelectPanelProps) {
  const options = ['', ...PROPERTY_TYPE_OPTIONS]
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98, x: '-50%' }}
      animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
      exit={{ opacity: 0, y: 8, scale: 0.98, x: '-50%' }}
      transition={PANEL_TRANSITION}
      className={`${PANEL_CARD} left-1/2 top-[calc(100%+12px)] w-[320px]`}
    >
      <p className={PANEL_TITLE}>Property type</p>
      <div className="mt-2 space-y-1">
        {options.map((option) => {
          const isActive = selected === option
          return (
            <button
              key={option || 'any'}
              type="button"
              onClick={() => onSelect(option)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                isActive ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{option || 'Any type'}</span>
              {isActive && <Check className="h-4 w-4 shrink-0" />}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

function BedsPanel({ selected, onSelect }: SingleSelectPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98, x: '-50%' }}
      animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
      exit={{ opacity: 0, y: 8, scale: 0.98, x: '-50%' }}
      transition={PANEL_TRANSITION}
      className={`${PANEL_CARD} left-1/2 top-[calc(100%+12px)] w-[280px]`}
    >
      <p className={PANEL_TITLE}>Bedrooms</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {BEDROOM_OPTIONS.map((option) => {
          const isActive = selected === option.value
          return (
            <button
              key={option.value || 'any'}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                  : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 hover:ring-slate-300'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

function PricePanel({ priceMin, priceMax, onPriceMinChange, onPriceMaxChange, onApply }: {
  priceMin: string
  priceMax: string
  onPriceMinChange: (value: string) => void
  onPriceMaxChange: (value: string) => void
  onApply: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={PANEL_TRANSITION}
      className={`${PANEL_CARD} right-0 top-[calc(100%+12px)] w-[320px] p-4`}
    >
      <p className={PANEL_TITLE}>Price range</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Min</label>
          <input
            type="number"
            min="0"
            value={priceMin}
            onChange={(event) => onPriceMinChange(event.target.value)}
            placeholder="500000"
            className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 ring-1 ring-slate-200 placeholder:text-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Max</label>
          <input
            type="number"
            min="0"
            value={priceMax}
            onChange={(event) => onPriceMaxChange(event.target.value)}
            placeholder="5000000"
            className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 ring-1 ring-slate-200 placeholder:text-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        type="button"
        onClick={onApply}
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition-colors hover:bg-blue-700"
      >
        Apply
      </motion.button>
    </motion.div>
  )
}

// ─── Main Component ───

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
  const [openPanel, setOpenPanel] = useState<SearchPanelName | null>(null)
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
    ? SEARCH_SUGGESTIONS.filter((suggestion) => suggestion.toLowerCase().includes(searchQuery.trim().toLowerCase())).slice(0, 7)
    : SEARCH_SUGGESTIONS.slice(0, 7)

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

  const togglePanel = (panel: SearchPanelName) => {
    setOpenPanel((current) => current === panel ? null : panel)
  }

  const locationValue = searchQuery.trim() || 'Location'
  const propertyTypeLabel = propertyType || 'Property Type'
  const bedroomsLabel = bedrooms ? `${bedrooms}+ Bedrooms` : 'Bedrooms'
  const priceRangeLabel = priceMin || priceMax ? [priceMin ? `₦${Number(priceMin).toLocaleString()}` : 'Any', priceMax ? `₦${Number(priceMax).toLocaleString()}` : 'Any'].join(' – ') : 'Price Range'

  const drawerMotion = {
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.2, ease: 'easeOut' as const },
  }

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
        : 'bg-white/95 nav-blur border-b border-slate-100 shadow-sm'
    }`}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {!scrolled ? (
          <div className="flex items-center justify-between" style={{ height: '72px' }}>
            <Link href="/" className="flex items-center shrink-0">
              <img src="/livarex-logo.png" alt="LIVAREX" className={`h-14 w-auto ${isTransparent ? 'drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]' : ''}`} />
            </Link>

            <div className="hidden lg:flex flex-1 min-w-0 items-center justify-center gap-0.5 px-2 xl:px-4">
              {NAV_LINKS.map(({ href, label, comingSoon }) => (
                comingSoon ? (
                  <span key={label}
                    className={`px-2 xl:px-4 py-2 rounded-lg text-sm font-medium cursor-default select-none flex items-center gap-1.5 ${
                      isTransparent ? 'text-white/40' : 'text-slate-300'
                    }`}>
                    {label}
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ring-1 ${
                      isTransparent ? 'bg-white/10 text-white/50 ring-white/10' : 'bg-slate-100 text-slate-400 ring-slate-200'
                    }`}>Soon</span>
                  </span>
                ) : (
                  <Link
                    key={href}
                    href={href!}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[15px] font-semibold transition-all ${
                      (isActive(href!) && href !== '/') || (href === '/' && location === '/')
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : isTransparent
                          ? 'text-white/90 hover:text-white hover:bg-white/10'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {label === 'Rent' ? (
                      <>
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isActive(href!) ? 'bg-white/15' : isTransparent ? 'bg-white/10' : 'bg-blue-50'
                        }`}>
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
                    <Link href="/admin" className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${
                      isTransparent ? 'text-white hover:bg-white/15' : 'text-slate-700 hover:bg-slate-100'
                    }`}>
                      Admin
                    </Link>
                  )}
                  {user.isLandlord && (
                    <Link href="/landlord" className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${
                      isTransparent ? 'text-white/90 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}>
                      Dashboard
                    </Link>
                  )}
                  <Link href={user.isAdmin ? '/admin' : user.isLandlord ? '/landlord/profile' : '/user'} className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${
                    isTransparent ? 'text-white/90 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                    className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${
                      isTransparent ? 'text-red-300 hover:text-red-200 hover:bg-white/10' : 'text-red-500 hover:text-red-600 hover:bg-red-50'
                    }`}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/landlord/register" className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${
                    isTransparent ? 'text-white/90 hover:text-white hover:bg-white/10' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}>
                    List your Property
                  </Link>
                  <Link href="/login" className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40">
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
                className={`p-2.5 rounded-full transition-all ${
                  isTransparent ? 'text-white ring-1 ring-white/20 hover:bg-white/10' : 'text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                }`}
                aria-label="Search properties"
              >
                <Search className="h-4 w-4" />
              </button>

              {!user && (
                <Link href="/register" className="text-xs font-semibold bg-blue-600 text-white px-4 py-2.5 rounded-full hover:bg-blue-700 transition-all shadow-md shadow-blue-600/25 whitespace-nowrap">
                  Get Started
                </Link>
              )}

              <button
                className={`p-2.5 rounded-full transition-all ${
                  isTransparent ? 'text-white ring-1 ring-white/20 hover:bg-white/10' : 'text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
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
                <div className="grid min-w-0 items-center rounded-full bg-white ring-1 ring-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.08)] focus-within:ring-2 focus-within:ring-blue-500/25 transition-all overflow-hidden"
                  style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.2fr) 52px" }}>
                  <button
                    type="button"
                    onClick={() => togglePanel('location')}
                    aria-expanded={openPanel === 'location'}
                    aria-label={locationValue}
                    title={locationValue}
                    className={`flex min-w-0 flex-1 items-center gap-2 border-r border-slate-200 px-3 py-3.5 text-left transition-colors hover:bg-slate-50 ${openPanel === 'location' ? 'bg-slate-100' : ''}`}
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
                    className={`flex min-w-0 items-center gap-2 border-r border-slate-200 px-3 py-3.5 text-left transition-colors hover:bg-slate-50 ${openPanel === 'type' ? 'bg-slate-100' : ''}`}
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
                    className={`flex min-w-0 items-center gap-2 border-r border-slate-200 px-3 py-3.5 text-left transition-colors hover:bg-slate-50 ${openPanel === 'beds' ? 'bg-slate-100' : ''}`}
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
                    className={`flex min-w-0 items-center gap-2 px-3 py-3.5 text-left transition-colors hover:bg-slate-50 ${openPanel === 'price' ? 'bg-slate-100' : ''}`}
                  >
                    <BadgeDollarSign className="h-4 w-4 shrink-0 text-blue-600" />
                    <span className={`min-w-0 truncate text-sm font-medium ${priceMin || priceMax ? 'text-slate-900' : 'text-slate-500'}`}>
                      {priceRangeLabel}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>

                  <motion.button
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    type="button"
                    onClick={submitSearch}
                    className="mx-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/30 transition-colors hover:bg-blue-700"
                    aria-label="Search properties"
                  >
                    <Search className="h-4 w-4" />
                  </motion.button>
                </div>

                <AnimatePresence>
                  {openPanel === 'location' && (
                    <LocationPanel
                      key="location"
                      query={searchQuery}
                      onQueryChange={setSearchQuery}
                      suggestions={filteredSuggestions}
                      onSelect={selectSuggestion}
                      onSubmit={submitSearch}
                    />
                  )}
                  {openPanel === 'type' && (
                    <TypePanel
                      key="type"
                      selected={propertyType}
                      onSelect={(value) => { setPropertyType(value); setOpenPanel(null) }}
                    />
                  )}
                  {openPanel === 'beds' && (
                    <BedsPanel
                      key="beds"
                      selected={bedrooms}
                      onSelect={(value) => { setBedrooms(value); setOpenPanel(null) }}
                    />
                  )}
                  {openPanel === 'price' && (
                    <PricePanel
                      key="price"
                      priceMin={priceMin}
                      priceMax={priceMax}
                      onPriceMinChange={setPriceMin}
                      onPriceMaxChange={setPriceMax}
                      onApply={() => setOpenPanel(null)}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="hidden lg:flex shrink-0 items-center justify-end gap-2 whitespace-nowrap">
              <a href="/contact" className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900 hover:ring-slate-300">
                Contact
              </a>

              {user ? (
                <Link href={user.isAdmin ? '/admin' : user.isLandlord ? '/landlord/profile' : '/user'} className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900 hover:ring-slate-300">
                  <UserCircle2 className="h-4 w-4 text-blue-600" />
                  <span>Profile</span>
                </Link>
              ) : (
                <Link href="/login" className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900 hover:ring-slate-300">
                  Sign In
                </Link>
              )}

              <Link href="/landlord/register" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/35">
                List Property
              </Link>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => { setMobileSearchOpen((open) => !open); setMenuOpen(false) }}
                aria-expanded={mobileSearchOpen}
                className="rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 shadow-sm transition-all hover:ring-slate-300"
                aria-label="Search properties"
              >
                Search Properties
              </button>

              <button
                className="p-2.5 rounded-full text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 transition-all"
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

      {/* Mobile Search Drawer */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div {...drawerMotion} className="max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain lg:hidden border-t border-slate-100 bg-white px-4 py-4 shadow-lg shadow-slate-900/5">
            <div className="space-y-3">
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
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
                  className="w-full rounded-2xl bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-700 ring-1 ring-slate-200 placeholder:text-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  aria-label="Search location"
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Property type</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPropertyType('')}
                    className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${!propertyType ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'}`}
                  >
                    Any
                  </button>
                  {PROPERTY_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPropertyType(option)}
                      className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${propertyType === option ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Bedrooms</p>
                <div className="flex flex-wrap gap-2">
                  {BEDROOM_OPTIONS.map((option) => (
                    <button
                      key={option.value || 'any'}
                      type="button"
                      onClick={() => setBedrooms(option.value)}
                      className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${bedrooms === option.value ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Price range</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={priceMin}
                    onChange={(event) => setPriceMin(event.target.value)}
                    placeholder="Min"
                    className="min-w-0 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-700 ring-1 ring-slate-200 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <input
                    type="number"
                    min="0"
                    value={priceMax}
                    onChange={(event) => setPriceMax(event.target.value)}
                    placeholder="Max"
                    className="min-w-0 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-700 ring-1 ring-slate-200 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={submitSearch}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700"
              >
                Search Properties
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div {...drawerMotion} className="max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain lg:hidden border-t border-slate-100 bg-white/95 nav-blur px-4 py-4 space-y-1 shadow-xl shadow-slate-900/10">
            {NAV_LINKS.map(({ href, label, comingSoon }) => (
              comingSoon ? (
                <span key={label}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-slate-300 cursor-default select-none">
                  {label}
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full ring-1 ring-slate-200">Soon</span>
                </span>
              ) : (
                <Link key={href} href={href!} onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive(href!) ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}>
                  {label === 'Rent' ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
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
            <div className="pt-3 mt-2 border-t border-slate-100 space-y-1">
              {user ? (
                <>
                  {user.isAdmin && <Link href="/admin" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">Admin</Link>}
                  {user.isLandlord && <Link href="/landlord" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">Dashboard</Link>}
                  <Link href={user.isAdmin ? '/admin' : user.isLandlord ? '/landlord/profile' : '/user'} onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">My Account</Link>
                  <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); setUser(null); setMenuOpen(false); window.location.href = '/' }}
                    className="block w-full text-left px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors">Logout</button>
                </>
              ) : (
                <>
                  <Link href="/landlord/register" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">List your Property</Link>
                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Link href="/register" onClick={() => setMenuOpen(false)} className="block px-4 py-3.5 text-sm font-bold bg-blue-600 text-white rounded-xl text-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25">Get Started</Link>
                  </motion.div>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 rounded-xl text-center transition-colors">Already have an account? Sign in</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}