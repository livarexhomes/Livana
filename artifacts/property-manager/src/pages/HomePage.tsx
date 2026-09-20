import * as React from 'react'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from '@/lib/navigation'
import { ArrowRight, ShieldCheck, Building2, Users, CheckCircle2, CheckCircle, MapPin, Calendar, ChevronDown, Search, Send, Home, X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

const HERO_IMAGES = [
  { src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1800&q=90', alt: 'Luxury apartment with pool' },
  { src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1800&q=90', alt: 'Modern apartment interior' },
  { src: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=1800&q=90', alt: 'Premium residential building' },
  { src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1800&q=90', alt: 'Elegant living space' },
]
import PublicNavbar from '../components/layout/PublicNavbar'
import Footer from '../components/layout/Footer'
import SEO from '../components/SEO'
import PropertyCard from '../components/property/PropertyCard'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import type { PropertyWithLandlord } from '@/types'
import { NIGERIAN_STATES, POPULAR_AREAS } from '../lib/nigerianStates'

type Tab = 'Buy' | 'Rent' | 'Lease' | 'Commercial'
const typeMap: Record<Tab, string> = { Buy: 'sale', Rent: 'rent', Lease: 'lease', Commercial: 'commercial' }

type Project = {
  id: string; name: string; developer: string; location: string
  map_link?: string; description: string; image: string; price: number; down: number
  completion: string; progress: number; units: number; sold: number
  category: string; status: string; type: string
}
function loadProjects(): Project[] {
  try { const r = localStorage.getItem('livana_admin_projects'); if (r) return JSON.parse(r) } catch { }
  return []
}
function progressColor(p: number) {
  if (p >= 80) return 'bg-emerald-500'
  if (p >= 50) return 'bg-blue-600'
  if (p >= 30) return 'bg-amber-500'
  return 'bg-rose-500'
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(Math.min(target, 12))
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = Math.min(target, 12)
        const duration = 1800
        const step = target / (duration / 16)
        const timer = window.setInterval(() => {
          start += step
          if (start >= target) {
            setCount(target)
            window.clearInterval(timer)
          } else {
            setCount(Math.floor(start))
          }
        }, 16)
        observer.disconnect()
      }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

export default function HomePage() {
  const [heroSlide, setHeroSlide] = useState(0)
  const [slidePaused, setSlidePaused] = useState(false)
  const [heroFocused, setHeroFocused] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(true)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  const [activeTab, setActiveTab] = useState<Tab>('Rent')
  const [properties, setProperties] = useState<PropertyWithLandlord[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [searchState, setSearchState] = useState('')
  const [searchArea, setSearchArea] = useState('')
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([])
  const [searchBeds, setSearchBeds] = useState('')
  const [searchBaths, setSearchBaths] = useState('')
  const [priceMin, setPriceMin] = useState(0)
  const [priceMax, setPriceMax] = useState(500_000_000)
  const [openDropdown, setOpenDropdown] = useState<'location' | 'propertyType' | 'beds' | 'price' | null>(null)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const searchBarRef = useRef<HTMLDivElement>(null)
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [activeHiwStep, setActiveHiwStep] = useState<number | null>(null)

  useEffect(() => {
    setAllProjects(loadProjects())
    if (isSupabaseConfigured()) {
      const supabase = createClient()
      supabase.from('projects').select('*').order('created_at', { ascending: false })
        .then(({ data }) => {
          const rows = (data as Project[] | null) ?? []
          if (rows.length > 0) {
            setAllProjects(rows)
            try { localStorage.setItem('livana_admin_projects', JSON.stringify(rows)) } catch { }
          }
        })
    }
  }, [])

  useEffect(() => {
    if (slidePaused || heroFocused || reduceMotion) return
    const id = window.setInterval(() => {
      if (!document.hidden) setHeroSlide(s => (s + 1) % HERO_IMAGES.length)
    }, 6500)
    return () => window.clearInterval(id)
  }, [slidePaused, heroFocused, reduceMotion])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setIsAuthenticated(!!user)
      if (user) {
        const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single()
        if (tenant) {
          const { data: saved } = await supabase.from('saved_properties').select('property_id').eq('tenant_id', (tenant as { id: string }).id)
          setSavedIds(new Set((saved ?? []).map((r: { property_id: string }) => r.property_id)))
        }
      }
    })
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    setLoading(true)
    const supabase = createClient()
    supabase.from('properties')
      .select('*, landlords(full_name, whatsapp, is_verified), property_images(storage_path, alt_text, is_cover)')
      .eq('status', 'available')
      .eq('type', typeMap[activeTab])
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setProperties((data as PropertyWithLandlord[]) ?? [])
        setLoading(false)
      })
  }, [activeTab])

  function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setOpenDropdown(null)
    const params = new URLSearchParams()
    params.set('type', typeMap[activeTab])
    if (searchState) params.set('city', searchState)
    if (searchArea) params.set('area', searchArea)
    if (selectedPropertyTypes.length) params.set('property_type', selectedPropertyTypes.join(','))
    if (searchBeds) params.set('beds', searchBeds)
    if (searchBaths) params.set('baths', searchBaths)
    if (priceMin > 0) params.set('price_min', String(priceMin))
    if (priceMax < 500_000_000) params.set('price_max', String(priceMax))
    window.location.href = `/listings?${params.toString()}`
  }

  function togglePropertyType(val: string) {
    if (val === '') { setSelectedPropertyTypes([]); return }
    setSelectedPropertyTypes(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev.filter(v => v !== ''), val]
    )
  }

  function fmtPrice(n: number) {
    if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(0)}M`
    if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}k`
    return `₦${n}`
  }

  const propertyTypeLabel = selectedPropertyTypes.length === 0
    ? 'Any'
    : selectedPropertyTypes.length === 1
      ? selectedPropertyTypes[0]
      : `${selectedPropertyTypes.length} types`

  const bedsBathsLabel = [searchBeds && `${searchBeds}+ Beds`, searchBaths && `${searchBaths}+ Baths`].filter(Boolean).join(', ') || 'Beds / Baths'

  const priceLabel = (priceMin === 0 && priceMax === 500_000_000)
    ? 'Any Price'
    : `${fmtPrice(priceMin)} – ${fmtPrice(priceMax)}`

  const PROPERTY_TYPES = ['Studio Apartment', 'Apartment', 'Detached', 'Semi-Detached', 'Terrace', 'Land', 'Bungalow', 'Maisonette', 'Self Contained', 'Hostel', 'Penthouse']
  const homeSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://livarex.com.ng/#organization',
        name: 'LIVAREX',
        url: 'https://livarex.com.ng',
        logo: 'https://livarex.com.ng/opengraph.jpg',
        description: 'Verified property marketplace for homes, apartments and commercial spaces in Nigeria.',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://livarex.com.ng/#website',
        name: 'LIVAREX',
        url: 'https://livarex.com.ng',
        publisher: { '@id': 'https://livarex.com.ng/#organization' },
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://livarex.com.ng/listings?city={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }
  return (
    <div className="lv-home min-h-screen flex flex-col bg-white">
      <SEO
        title="Nigeria's Verified Property Marketplace"
        description="Find verified homes, apartments and commercial properties for rent, lease and sale across Nigeria. Every landlord is vetted, every listing is real."
        url="/"
        schema={homeSchema}
      />
      <PublicNavbar />

      <style>{homeStyles}</style>
      {/* ── HERO ── */}
      <section
        className="lv-home-hero relative pt-[88px]"
        onFocusCapture={() => setHeroFocused(true)}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setHeroFocused(false) }}
      >
        {/* Full-bleed slideshow background */}
        <div className="absolute inset-0 overflow-hidden bg-slate-950">
          <AnimatePresence mode="sync">
            <motion.img
              key={heroSlide}
              src={HERO_IMAGES[heroSlide].src}
              alt={HERO_IMAGES[heroSlide].alt}
              className="absolute inset-0 w-full h-full object-cover object-center"
              initial={reduceMotion ? false : { opacity: 0, scale: 1.035 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 1.5, ease: 'easeInOut' }}
              fetchPriority={heroSlide === 0 ? 'high' : 'auto'}
              decoding="async"
            />
          </AnimatePresence>
          {/* Overlays */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,20,42,0.86)_0%,rgba(5,20,42,0.65)_45%,rgba(5,20,42,0.12)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-slate-950/15" />
          <div className="lv-hero-controls" role="group" aria-label="Hero slideshow controls">
            <button type="button" aria-label="Previous slide" onClick={() => { setSlidePaused(true); setHeroSlide(s => (s - 1 + HERO_IMAGES.length) % HERO_IMAGES.length) }}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
            <div className="lv-hero-dots">
              {HERO_IMAGES.map((_, i) => <button key={i} type="button" aria-label={`Show slide ${i + 1}`} aria-current={i === heroSlide ? 'true' : undefined} onClick={() => { setSlidePaused(true); setHeroSlide(i) }}><span className={i === heroSlide ? 'is-active' : ''} /></button>)}
            </div>
            <button type="button" aria-label="Next slide" onClick={() => { setSlidePaused(true); setHeroSlide(s => (s + 1) % HERO_IMAGES.length) }}><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
            {!reduceMotion && <button type="button" aria-label={slidePaused ? 'Play slideshow' : 'Pause slideshow'} aria-pressed={slidePaused} onClick={() => setSlidePaused(p => !p)}>{slidePaused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}</button>}
          </div>
        </div>

        {/* Subtle noise texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

        {/* Content */}
        <div className="lv-hero-content relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 flex flex-col justify-center">

          <div className="lv-hero-copy w-full pt-8 pb-10" ref={searchBarRef}>

            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2.5 mb-8">
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                </span>
                <span className="text-xs font-bold text-white/80 uppercase tracking-[0.15em]">Nigeria's Verified Property Marketplace</span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="lv-hero-title text-white mb-6">
              Find a home you can trust.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-white/85 mb-8 leading-relaxed max-w-lg font-normal">
              Verified properties. Screened landlords. Safer inspections. A simpler way to find your next home.
            </p>

            {/* Mobile animated listing pill */}

            {/* <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/listings" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition-all">
                Browse Properties
              </Link>
              <Link href="/for-landlords" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-8 py-4 text-sm font-semibold text-white hover:bg-white/15 transition-all">
                List Your Property
              </Link>
            </div> */}

            {/* Search card */}

            <div className="mb-8" onKeyDown={(event) => {
              if (event.key === 'Escape') {
                const trigger = event.currentTarget.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')
                setOpenDropdown(null)
                trigger?.focus()
              }
            }} onBlur={(event) => {
              if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpenDropdown(null)
            }}>
              <style>{`
    .lv-search-ui button:focus-visible,.lv-search-ui input:focus-visible { outline: 2px solid #2563eb; outline-offset: 3px; }
    .lv-search-ui input[type=range]::-moz-range-thumb { pointer-events:auto; width:18px; height:18px; border-radius:50%; background:#2563eb; border:2px solid white; }
    @media(prefers-reduced-motion:reduce) { .lv-search-ui * { transition:none!important; } }
  `}</style>
              {/* Tabs */}
              <div className="lv-search-ui mb-4 inline-flex gap-1 rounded-full border border-white/15 bg-white/10 p-1" aria-label="Listing type">
                {(['Rent', 'Lease'] as Tab[]).map(t => (
                  <button key={t} type="button" aria-pressed={activeTab === t} onClick={() => { setActiveTab(t); setOpenDropdown(null) }}
                    className={`px-5 py-2 rounded-full text-sm font-bold transition-all shrink-0 ${activeTab === t
                      ? 'bg-white text-gray-900 shadow-lg'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Desktop search bar */}
              <div className="lv-search-ui relative">
                <div className="rounded-[20px] border border-white/60 bg-white p-2 shadow-[0_18px_55px_-15px_rgba(0,0,0,0.3)]">
                  <div className="grid grid-cols-2 items-stretch gap-1 lg:grid-cols-[1.25fr_1fr_1fr_1fr_auto]">

                    {/* Location */}
                    <button type="button"
                      aria-expanded={openDropdown === 'location'} onClick={() => setOpenDropdown(o => o === 'location' ? null : 'location')}
                      className="min-w-0 rounded-xl bg-slate-50/70 px-3 py-3 text-left transition-colors hover:bg-blue-50 sm:px-4 sm:py-4">
                      <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-1.5">
                        <MapPin className="inline w-3 h-3 mr-0.5 -mt-0.5 text-blue-500" />Location
                      </span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${searchState ? 'text-blue-600' : 'text-gray-800'}`}>
                        <span className="truncate">{searchState || 'Any Location'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${openDropdown === 'location' ? 'rotate-180' : ''}`} />
                      </span>
                    </button>



                    {/* Property Type */}
                    <button type="button"
                      aria-expanded={openDropdown === 'propertyType'} onClick={() => setOpenDropdown(o => o === 'propertyType' ? null : 'propertyType')}
                      className="min-w-0 rounded-xl bg-slate-50/70 px-3 py-3 text-left transition-colors hover:bg-blue-50 sm:px-4 sm:py-4">
                      <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-1.5">Type</span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${selectedPropertyTypes.length ? 'text-blue-600' : 'text-gray-800'}`}>
                        <span className="truncate">{propertyTypeLabel}</span>
                        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${openDropdown === 'propertyType' ? 'rotate-180' : ''}`} />
                      </span>
                    </button>



                    {/* Beds & Baths */}
                    <button type="button"
                      aria-expanded={openDropdown === 'beds'} onClick={() => setOpenDropdown(o => o === 'beds' ? null : 'beds')}
                      className="min-w-0 rounded-xl bg-slate-50/70 px-3 py-3 text-left transition-colors hover:bg-blue-50 sm:px-4 sm:py-4">
                      <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-1.5">Beds &amp; Baths</span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${(searchBeds || searchBaths) ? 'text-blue-600' : 'text-gray-800'}`}>
                        <span className="truncate">{bedsBathsLabel}</span>
                        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${openDropdown === 'beds' ? 'rotate-180' : ''}`} />
                      </span>
                    </button>



                    {/* Price */}
                    <button type="button"
                      aria-expanded={openDropdown === 'price'} onClick={() => setOpenDropdown(o => o === 'price' ? null : 'price')}
                      className="min-w-0 rounded-xl bg-slate-50/70 px-3 py-3 text-left transition-colors hover:bg-blue-50 sm:px-4 sm:py-4">
                      <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-1.5">Price</span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${(priceMin > 0 || priceMax < 500_000_000) ? 'text-blue-600' : 'text-gray-800'}`}>
                        <span className="truncate">{priceLabel}</span>
                        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${openDropdown === 'price' ? 'rotate-180' : ''}`} />
                      </span>
                    </button>

                    {/* Search button */}
                    <button type="button" onClick={() => { setOpenDropdown(null); handleSearch() }}
                      className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 lg:col-span-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      Search
                    </button>
                  </div>
                </div>

                {/* Location Panel */}
                {openDropdown === 'location' && (() => {
                  const q = locationQuery.trim().toLowerCase()
                  const filteredStates = NIGERIAN_STATES.filter(s => s.toLowerCase().includes(q))
                  const filteredAreas = Object.entries(POPULAR_AREAS).flatMap(([state, areas]) =>
                    areas.filter(a => a.toLowerCase().includes(q)).map(a => ({ area: a, state }))
                  )
                  return (
                    <div className="relative z-50 mt-3 w-full rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl shadow-slate-950/10 sm:p-5 lg:absolute lg:right-0 lg:top-full lg:max-w-[420px]">
                      {/* Search input */}
                      <div className="p-3 border-b border-gray-100">
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
                          <input
                            aria-label="Search state or area"
                            type="text"
                            placeholder="Search state or area…"
                            value={locationQuery}
                            onChange={e => setLocationQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-800 placeholder:text-gray-400"
                          />
                        </div>
                      </div>

                      <div className="max-h-72 overflow-y-auto p-2">
                        {/* Any Location */}
                        {!q && (
                          <button type="button"
                            onClick={() => { setSearchState(''); setOpenDropdown(null); setLocationQuery('') }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${!searchState ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${!searchState ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                              {!searchState && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </span>
                            Any Location
                          </button>
                        )}

                        {/* States */}
                        {filteredStates.length > 0 && (
                          <>
                            <p className="px-3 pt-2 pb-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">States</p>
                            {filteredStates.map(s => (
                              <button key={s} type="button"
                                onClick={() => { setSearchState(s); setOpenDropdown(null); setLocationQuery('') }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${searchState === s ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${searchState === s ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                  {searchState === s && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                </span>
                                {s}
                              </button>
                            ))}
                          </>
                        )}

                        {/* Popular Areas */}
                        {filteredAreas.length > 0 && (
                          <>
                            <p className="px-3 pt-3 pb-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">Popular Areas</p>
                            {filteredAreas.map(({ area, state }) => (
                              <button key={`${state}-${area}`} type="button"
                                onClick={() => { setSearchState(area); setOpenDropdown(null); setLocationQuery('') }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${searchState === area ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${searchState === area ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                  {searchState === area && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                </span>
                                <span className="flex-1 text-left">{area}</span>
                                <span className="text-[10px] text-gray-400 font-medium">{state}</span>
                              </button>
                            ))}
                          </>
                        )}

                        {/* No results */}
                        {q && filteredStates.length === 0 && filteredAreas.length === 0 && (
                          <p className="px-3 py-6 text-sm text-gray-400 text-center">No locations match "{locationQuery}"</p>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Property Type Panel */}
                {openDropdown === 'propertyType' && (
                  <div className="relative z-50 mt-3 w-full rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl shadow-slate-950/10 sm:p-5 lg:absolute lg:right-0 lg:top-full lg:max-w-[420px]">
                    <p className="text-base font-bold text-gray-900 mb-1">Property Type</p>
                    <p className="text-xs text-gray-400 mb-4">Choose a property type</p>
                    <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto" role="group" aria-label="Property type">
                      {['', ...PROPERTY_TYPES].map(pt => {
                        const selected = pt === '' ? selectedPropertyTypes.length === 0 : selectedPropertyTypes.includes(pt)
                        return <button key={pt || 'any'} type="button" aria-pressed={selected}
                          onClick={() => { setSelectedPropertyTypes(pt ? [pt] : []); setOpenDropdown(null) }}
                          className={`min-h-12 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors ${selected ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-slate-50'}`}>
                          {pt || 'Any property type'}
                        </button>
                      })}
                    </div>
                  </div>
                )}

                {/* Beds & Baths Panel */}
                {openDropdown === 'beds' && (
                  <div className="relative z-50 mt-3 w-full rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl shadow-slate-950/10 sm:p-5 lg:absolute lg:right-0 lg:top-full lg:max-w-[420px]">
                    <div className="mb-5">
                      <p className="text-base font-bold text-gray-900 mb-3">Bedrooms</p>
                      <div className="flex flex-wrap gap-2">
                        {['Any', '1', '2', '3', '4', '5+'].map(v => {
                          const val = v === 'Any' ? '' : v.replace('+', '')
                          const active = v === 'Any' ? searchBeds === '' : searchBeds === val
                          return <button key={v} type="button" onClick={() => setSearchBeds(active ? '' : val)}
                            aria-pressed={active} className={`min-h-11 min-w-10 flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${active ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-700 hover:border-blue-300'}`}>{v}</button>
                        })}
                      </div>
                    </div>
                    <div className="mb-5">
                      <p className="text-base font-bold text-gray-900 mb-3">Bathrooms</p>
                      <div className="flex flex-wrap gap-2">
                        {['Any', '1', '2', '3', '4', '5', '6+'].map(v => {
                          const val = v === 'Any' ? '' : v.replace('+', '')
                          const active = v === 'Any' ? searchBaths === '' : searchBaths === val
                          return <button key={v} type="button" onClick={() => setSearchBaths(active ? '' : val)}
                            aria-pressed={active} className={`min-h-11 min-w-10 flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${active ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-700 hover:border-blue-300'}`}>{v}</button>
                        })}
                      </div>
                    </div>
                    <button type="button" onClick={() => setOpenDropdown(null)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm">Apply</button>
                  </div>
                )}

                {/* Price Panel */}
                {openDropdown === 'price' && (
                  <div className="relative z-50 mt-3 w-full rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl shadow-slate-950/10 sm:p-5 lg:absolute lg:right-0 lg:top-full lg:max-w-[420px]">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-base font-bold text-gray-900">Price Range</p>
                      <button type="button" onClick={() => { setPriceMin(0); setPriceMax(500_000_000) }} className="text-xs font-semibold text-blue-600">Reset</button>
                    </div>
                    <div className="flex gap-3 mb-5">
                      <div className="flex-1 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Min (₦)</p>
                        <input type="number" min={0} max={priceMax} step={1} aria-label="Minimum price in naira" value={priceMin === 0 ? '' : priceMin} placeholder="0"
                          onChange={e => { const v = Number(e.target.value); if (Number.isFinite(v) && v >= 0 && v <= priceMax) setPriceMin(v) }}
                          className="w-full text-sm font-bold text-gray-900 outline-none bg-transparent" />
                      </div>
                      <div className="flex items-center text-gray-300 font-bold">—</div>
                      <div className="flex-1 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Max (₦)</p>
                        <input type="number" min={priceMin} max={500_000_000} step={1} aria-label="Maximum price in naira" value={priceMax === 500_000_000 ? '' : priceMax} placeholder="500,000,000"
                          onChange={e => { const v = e.target.value === '' ? 500_000_000 : Number(e.target.value); if (Number.isFinite(v) && v >= priceMin && v <= 500_000_000) setPriceMax(v) }}
                          className="w-full text-sm font-bold text-gray-900 outline-none bg-transparent" />
                      </div>
                    </div>
                    <div className="relative h-5 mb-2">
                      <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-gray-200 rounded-full" />
                      <div className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-blue-600 rounded-full"
                        style={{ left: `${(priceMin / 500_000_000) * 100}%`, right: `${100 - (priceMax / 500_000_000) * 100}%` }} />
                      <input type="range" min={0} max={500_000_000} step={500_000} aria-label="Minimum price" value={priceMin}
                        onChange={e => { const v = Number(e.target.value); if (v < priceMax) setPriceMin(v) }}
                        className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer" />
                      <input type="range" min={0} max={500_000_000} step={500_000} aria-label="Maximum price" value={priceMax}
                        onChange={e => { const v = Number(e.target.value); if (v > priceMin) setPriceMax(v) }}
                        className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer" />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 font-medium mb-5"><span>₦0</span><span>₦500M</span></div>
                    <button type="button" onClick={() => setOpenDropdown(null)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm">Apply</button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/80">
                <span>Choose any filter, or search all properties.</span>
                {(searchState || selectedPropertyTypes.length > 0 || searchBeds || searchBaths || priceMin > 0 || priceMax < 500_000_000) && (
                  <button type="button" onClick={() => {
                    setSearchState(''); setLocationQuery(''); setSelectedPropertyTypes([]);
                    setSearchBeds(''); setSearchBaths(''); setPriceMin(0); setPriceMax(500_000_000); setOpenDropdown(null)
                  }} className="min-h-11 rounded-lg px-2 font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">Clear filters</button>
                )}
              </div>
            </div>

            {/* Trust badges row */}
            <p className="text-xs text-white/60">Serving renters across Lagos and Ogun.</p>
          </div>


        </div>
      </section>

      {/* ── TRUST BADGES ── */}
      <section className="lv-trust-strip bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: ShieldCheck, label: 'Verified Listings', desc: 'Every listing reviewed by Livarex' },
              { icon: Users, label: 'Screened Landlords', desc: 'Identity checks before publishing' },
              { icon: Building2, label: 'Inspection Support', desc: 'Request and coordinate viewings' },
              { icon: CheckCircle2, label: 'Transparent Process', desc: 'Clear next steps from search to move-in' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="lv-trust-item flex items-start gap-3 p-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROPERTIES ── */}
      <section className="lv-listings bg-[#F8F8F6] py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-blue-600 font-bold text-[11px] uppercase tracking-[0.15em]">Fresh Listings</span>
              </div>
              <h2 className="text-3xl md:text-[2.6rem] font-black text-gray-900 tracking-tight leading-[1.1]">
                Newly listed homes
              </h2>
              <p className="text-gray-400 mt-2.5 text-sm font-medium">
                Explore recently verified properties available on Livarex.
              </p>
            </div>
            <Link href="/listings?type=rent"
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold whitespace-nowrap shrink-0 shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30 transition-all active:scale-95"
            >
              View all properties
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>

          {/* Filter tabs */}
          <div className="lv-listing-filter flex flex-wrap gap-2 mb-8 pb-1">
            {(['Rent', 'Lease'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-200 shrink-0 ${activeTab === t
                  ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/15'
                  : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200 hover:text-gray-800 hover:shadow-sm'
                  }`}
              >
                {t}
              </button>
            ))}
            <span className="self-center text-xs text-gray-400 ml-1">Buying &amp; Commercial properties coming soon</span>
          </div>

          {loading ? (
            <div className="lv-property-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl overflow-hidden border border-gray-100 animate-pulse">
                  <div className="h-56 bg-gray-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
                    <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
                    <div className="h-px bg-gray-50" />
                    <div className="flex gap-3">
                      <div className="h-3 bg-gray-100 rounded w-16" />
                      <div className="h-3 bg-gray-100 rounded w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : properties.length > 0 ? (
            <div className="lv-property-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map(p => (
                <div key={p.id} className="lv-property-frame"><PropertyCard property={p} saved={savedIds.has(p.id)} isAuthenticated={isAuthenticated} /></div>
              ))}
            </div>
          ) : (
            <div className="min-h-[190px] flex items-center justify-center bg-white rounded-3xl border border-gray-100 px-5 py-8 text-center shadow-sm">
              <div className="flex flex-col items-center">
                <Building2 className="w-7 h-7 text-gray-300 mb-3" strokeWidth={1.5} />
                <h3 className="text-base font-bold text-gray-700">No properties yet</h3>
                <p className="text-gray-500 mt-1 text-sm">New verified homes are being added.</p>
              </div>
            </div>
          )}

          {/* ── Featured Off-Plan Developments ── */}
          {(() => {
            const tabType = typeMap[activeTab]
            const tabProjects = allProjects.filter(p =>
              (p.type ?? 'sale') === tabType &&
              (p.status === 'active' || p.status === 'coming_soon')
            )
            if (tabProjects.length === 0) return null
            return (
              <div className="mt-16">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
                  <div>
                    <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-2">Off-Plan</p>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                      Featured Developments
                    </h2>
                    <p className="text-gray-500 mt-1.5 text-sm">New build & off-plan projects available under {activeTab}.</p>
                  </div>
                  <Link href="/listings"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all whitespace-nowrap shadow-sm">
                    View all <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="lv-property-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {tabProjects.map(proj => {
                    const soldPct = proj.units > 0 ? Math.round((proj.sold / proj.units) * 100) : 0
                    return (
                      <div key={proj.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
                        {/* Image */}
                        <div className="relative h-48 overflow-hidden bg-gray-100">
                          {proj.image ? (
                            <img src={proj.image} alt={proj.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e: any) => { e.currentTarget.style.display = 'none' }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-12 h-12 text-gray-300" />
                            </div>
                          )}
                          {/* Status badge */}
                          <div className="absolute top-3 left-3">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${proj.status === 'coming_soon'
                              ? 'bg-blue-600 text-white'
                              : 'bg-emerald-500 text-white'
                              }`}>
                              {proj.status === 'coming_soon' ? 'Coming Soon' : 'Active'}
                            </span>
                          </div>
                          {/* Category */}
                          <div className="absolute top-3 right-3">
                            <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[11px] font-bold text-gray-700">
                              {proj.category}
                            </span>
                          </div>
                        </div>
                        {/* Body */}
                        <div className="p-5">
                          <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{proj.name}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1 mb-3">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{proj.location}</span>
                            <span className="text-gray-300">·</span>
                            <span>{proj.developer}</span>
                            {proj.map_link && (
                              <>
                                <span className="text-gray-300">·</span>
                                <a href={proj.map_link} target="_blank" rel="noopener noreferrer"
                                  className="text-blue-600 font-semibold hover:underline shrink-0">
                                  View on map
                                </a>
                              </>
                            )}
                          </div>

                          {proj.description && (
                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{proj.description}</p>
                          )}

                          {/* Progress bar */}
                          {proj.progress > 0 && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                                <span className="font-semibold">Construction progress</span>
                                <span className="font-bold text-gray-700">{proj.progress}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${progressColor(proj.progress)}`}
                                  style={{ width: `${proj.progress}%` }} />
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                            <div>
                              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">From</p>
                              <p className="text-sm font-extrabold text-gray-900 mt-0.5">
                                {proj.price > 0 ? `₦${(proj.price / 1_000_000).toFixed(0)}M` : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Down</p>
                              <p className="text-sm font-extrabold text-gray-900 mt-0.5">{proj.down}%</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Completion</p>
                              <p className="text-sm font-extrabold text-gray-900 mt-0.5 flex items-center gap-1">
                                {proj.completion ? (
                                  <><Calendar className="w-3 h-3 text-gray-400" />{proj.completion}</>
                                ) : '—'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      </section>

      {/* ── CITIES ── */}
      <section className="lv-cities bg-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-2">Top Locations</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Explore by location</h2>
              <p className="text-gray-400 mt-2 text-sm">Discover verified homes in the markets we currently support.</p>
            </div>
            <Link href="/listings" className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors">
              View all listings <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Bento grid — 3 col desktop: Lagos (2/3) | right col (1/3) with Ogun + Expanding */}
          <div className="lv-location-grid grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Lagos — large feature card, full height */}
            <Link
              href="/listings?city=Lagos"
              className="relative group overflow-hidden rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500"
              style={{ minHeight: '420px' }}
            >
              <img
                src="https://images.pexels.com/photos/36622013/pexels-photo-36622013.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Lagos aerial view"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 absolute inset-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <div className="absolute bottom-7 left-7">
                <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-3 shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80 inline-block" />
                  Most Popular
                </span>
                <h3 className="text-4xl font-black text-white tracking-tight leading-none">Lagos</h3>
                <p className="text-blue-300 text-sm font-semibold mt-2">Commercial Capital</p>
              </div>
              <div className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </Link>

            {/* Right column: Ogun + Expanding stacked */}
            <div className="lv-location-secondary contents">

              {/* Ogun */}
              <Link
                href="/listings?city=Ogun"
                className="relative group overflow-hidden rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 flex-1"
                style={{ minHeight: '420px' }}
              >
                <img
                  src="/og/abeokuta.jpg"
                  alt="Abeokuta, Ogun State"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 absolute inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-5 left-5">
                  <h3 className="text-xl font-black text-white tracking-tight">Ogun</h3>
                  <p className="text-blue-300 text-xs font-semibold mt-1">Gateway State</p>
                </div>
                <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </div>
              </Link>

              {/* Expanding Across Nigeria */}
              <div className="lv-expansion relative overflow-hidden rounded-3xl bg-[#0f172a] shadow-sm flex flex-col items-center justify-center p-8 text-center flex-1" style={{ minHeight: '200px' }}>
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #3b82f6 0%, transparent 70%)' }} />
                <div className="w-11 h-11 rounded-2xl bg-blue-600/20 border border-blue-500/25 flex items-center justify-center mb-4">
                  <MapPin className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-[17px] font-extrabold text-white mb-2 leading-snug">Expanding Across Nigeria</h3>
                <p className="text-gray-400 text-[13px] leading-relaxed max-w-[200px] mb-5">
                  Abuja, Port Harcourt, Ibadan and more cities are joining soon. Be the first to know.
                </p>
                <a
                  href="/contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20"
                >
                  Get notified <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

            </div>
          </div>

          {/* Second row — smaller cities, all coming soon */}
          {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-3 md:mt-4">
            {[
              { name: 'Kano', sub: 'Northern Hub', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800' },
              { name: 'Ibadan', sub: 'Cultural Centre', img: 'https://images.unsplash.com/photo-1553194588-ecc5e217ebf0?w=800' },
              { name: 'Enugu', sub: 'Coal City', img: 'https://images.unsplash.com/photo-1448630360428-65456885c650?w=800' },
              { name: 'Benin City', sub: 'Ancient Kingdom', img: 'https://images.unsplash.com/photo-1613545325278-f24b0cae1224?w=800' },
            ].map(loc => (
              <div
                key={loc.name}
                className="relative overflow-hidden rounded-2xl h-36 shadow-sm cursor-default"
              >
                <img src={loc.img} alt={loc.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60" />
                <div className="absolute bottom-3 left-4">
                  <h3 className="text-base font-bold text-white/60">{loc.name}</h3>
                  <p className="text-white/40 text-xs font-medium">{loc.sub}</p>
                </div>
                <div className="absolute top-2.5 right-2.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Coming Soon
                </div>
              </div>
            ))}
          </div> */}
        </div>
      </section>

      {/* ── WHY LIVAREX ── */}
      <section className="bg-slate-950 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.18em] mb-4">A clearer way to rent</p>
            <h2 className="text-3xl md:text-5xl font-black leading-tight text-white">Renting shouldn&apos;t feel risky.</h2>
            <p className="mt-5 max-w-xl text-sm md:text-base leading-relaxed text-slate-300">
              Fake listings, unavailable properties and unclear processes waste renters&apos; time. Livarex helps create a safer property search by verifying listings and landlords before connecting renters.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Traditional property search</p>
              <ul className="space-y-3 text-sm text-slate-300">
                {['Unknown listing status', 'Unverified information', 'Unclear inspection process', 'Too many disconnected conversations'].map(item => <li key={item} className="flex gap-2"><span className="text-slate-500">−</span>{item}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-blue-400/30 bg-blue-600/15 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-300 mb-4">With Livarex</p>
              <ul className="space-y-3 text-sm text-white">
                {['Reviewed listings', 'Screened landlords', 'Coordinated inspections', 'Clearer communication'].map(item => <li key={item} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-blue-300" />{item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lv-process-section relative bg-[#fcfcfd] pt-16 pb-20 md:pt-20 md:pb-14 overflow-hidden">
        {/* ── Ambient Background Elements ── */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* Subtle Moving Spotlight */}
        <div
          className="absolute pointer-events-none blur-[120px] opacity-20 transition-all duration-1000 ease-in-out"
          style={{
            width: '600px',
            height: '600px',
            left: activeHiwStep !== null ? `${activeHiwStep * 20}%` : '50%',
            top: '20%',
            background: activeHiwStep !== null
              ? ['#2563eb', '#2563eb', '#2563eb', '#2563eb', '#2563eb'][activeHiwStep]
              : '#cbd5e1',
            transform: 'translate(-50%, -50%)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">

          {/* ── Header ── */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-100 shadow-sm mb-5">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Security-First Process</span>
              </div>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-950 tracking-tight leading-[1.0] md:leading-[0.95]">
                How Livarex <br />
                <span className="text-slate-500">works.</span>
              </h2>
            </div>

            <div className="hidden md:block text-right">
              <div className="text-[4rem] font-black text-slate-100 leading-none select-none">
                {activeHiwStep !== null ? `0${activeHiwStep + 1}` : '00'}
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest -mt-2">Step Phase</p>
            </div>
          </div>

          {/* ── The Connector Line (Desktop) ── */}
          <div className="hidden lg:block relative h-px w-full bg-slate-100 mb-[-1px] z-0">
            <div
              className="absolute top-0 left-0 h-px transition-all duration-700 ease-in-out bg-gradient-to-r from-blue-600 to-indigo-500"
              style={{ width: activeHiwStep !== null ? `${(activeHiwStep + 1) * 25}%` : '0%' }}
            />
          </div>

          {/* ── Step Grid ── */}
          <div className="lv-steps-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
            {([
              { step: '01', Icon: Search, title: 'Discover', desc: 'Browse available verified properties.' },
              { step: '02', Icon: ShieldCheck, title: 'Verify', desc: 'Review clear property and landlord information.' },
              { step: '03', Icon: Calendar, title: 'Inspect', desc: 'Request and coordinate your property inspection.' },
              { step: '04', Icon: Home, title: 'Move In', desc: 'Complete the process with greater confidence.' },
            ] as const).map((item, i) => {
              const isActive = activeHiwStep === i
              const colors = ['#2563eb', '#2563eb', '#2563eb', '#2563eb']

              return (
                <div
                  key={item.step}
                  data-hiw-index={i}
                  onMouseEnter={() => setActiveHiwStep(i)}
                  onMouseLeave={() => setActiveHiwStep(null)}
                  className="relative group cursor-default transition-all duration-500"
                  style={{ transitionDelay: `${i * 70}ms` }}
                >
                  {/* Hover Background Effect */}
                  <div
                    className={`absolute inset-0 transition-all duration-500 rounded-3xl lg:rounded-none ${isActive ? 'bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] z-20' : 'bg-transparent'}`}
                  />

                  <div className="relative p-5 md:p-7 flex flex-col h-full z-30">
                    {/* Step Label */}
                    <div className="flex items-center justify-between mb-5">
                      <span className={`text-[10px] font-black tracking-widest transition-colors duration-300 ${isActive ? 'text-blue-600' : 'text-slate-300'}`}>
                        PHASE {item.step}
                      </span>
                      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive ? 'scale-150' : 'bg-slate-200'}`} style={{ backgroundColor: isActive ? colors[i] : '' }} />
                    </div>

                    {/* Icon Circle */}
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all duration-500 ${isActive ? 'shadow-lg' : 'bg-slate-50'}`}
                      style={{
                        backgroundColor: isActive ? colors[i] : '',
                        boxShadow: isActive ? `0 10px 25px -5px ${colors[i]}50` : ''
                      }}
                    >
                      <item.Icon
                        className={`w-6 h-6 transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-400'}`}
                        strokeWidth={2}
                      />
                    </div>

                    <h3 className={`font-black text-lg leading-tight mb-4 whitespace-pre-line transition-colors duration-300 ${isActive ? 'text-slate-900' : 'text-slate-800'}`}>
                      {item.title}
                    </h3>

                    <p className={`text-[13px] leading-relaxed transition-all duration-300 ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
                      {item.desc}
                    </p>

                    {/* Decorative Number (Active only) */}
                    <div className={`absolute bottom-6 right-8 text-4xl font-black transition-all duration-500 select-none ${isActive ? 'opacity-10 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ color: colors[i] }}>
                      {item.step}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </section>


      {/* ── CTA BANNER ── */}
      <section className="lv-main-cta py-8 md:py-12 px-5 sm:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="lv-closing-panel relative overflow-hidden rounded-[2rem] bg-gray-950">
            <div className="relative z-10 p-6 sm:p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 text-xs font-semibold uppercase tracking-widest text-blue-400 mb-6">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Platform
                </div>
                <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
                  Your next home<br />shouldn&apos;t be a gamble.
                </h2>
                <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-md">
                  Explore verified properties and find a place that fits your needs.
                </p>
                <ul className="space-y-2 mb-8">
                  {['Verified properties only', 'Transparent pricing', 'Secure inspection booking'].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-gray-400 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/listings" className="px-7 py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all text-center text-sm shadow-xl">
                    Browse Verified Homes
                  </Link>
                  <Link href="/landlord/register" className="px-7 py-3.5 bg-white/10 border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/15 transition-all text-center text-sm whitespace-nowrap">
                    List Your Property
                  </Link>
                </div>
              </div>

              <div className="lv-closing-image relative flex items-end shrink-0 overflow-hidden rounded-2xl px-7 py-5">
                <img src={HERO_IMAGES[0].src} alt={HERO_IMAGES[0].alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-transparent" />
                <div className="relative z-10 text-left">
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Currently available in</p>
                  <p className="font-extrabold text-white text-lg leading-snug mt-1">Lagos <span className="text-white/40">•</span> Ogun</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LANDLORD CTA ── */}
      <section className="lv-landlord-cta bg-white py-14 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-blue-50 border border-blue-100 rounded-3xl px-8 py-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-gray-900">Own a property? List it free.</h3>
                <p className="text-gray-500 text-sm mt-1 max-w-md">Reach prospective tenants while Livarex helps coordinate the process.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link href="/landlord/register" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all text-sm text-center shadow-lg shadow-blue-600/20 whitespace-nowrap">
                List Your Property <ArrowRight className="inline w-4 h-4 ml-1" />
              </Link>
              <Link href="/landlord/verify" className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 transition-all text-sm text-center whitespace-nowrap">
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

const homeStyles = `
.lv-home-hero{isolation:isolate;background:#081a30;min-height:740px;padding-bottom:68px}
.lv-hero-content{min-height:610px;padding-top:40px;padding-bottom:28px}
.lv-hero-copy{max-width:960px}
.lv-hero-title{font-size:clamp(44px,5.8vw,78px);max-width:690px;font-weight:650;line-height:1.035;letter-spacing:-.055em;text-wrap:balance;text-shadow:0 2px 25px #00000012}
.lv-home-hero .lv-search-ui{max-width:950px}
.lv-home-hero .lv-search-ui>div:first-child{box-shadow:0 20px 65px -22px #0009;border-radius:18px}
.lv-home-hero .lv-search-ui button{min-height:44px}
.lv-home-hero .lv-search-ui input{min-height:36px}
.lv-hero-controls{position:absolute;bottom:22px;right:max(24px,calc((100vw - 1184px)/2));display:flex;align-items:center;gap:3px;z-index:30;padding:4px;border:1px solid #ffffff30;background:#10213b75;backdrop-filter:blur(16px);border-radius:99px}
.lv-hero-controls>button{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;color:white;transition:background .2s}
.lv-hero-controls>button:hover{background:#ffffff20}
.lv-hero-dots{display:flex;align-items:center;padding-inline:5px}
.lv-hero-dots button{height:40px;width:28px;display:grid;place-items:center}
.lv-hero-dots span{display:block;width:6px;height:6px;border-radius:99px;background:#ffffff65;transition:width .3s,background .3s}
.lv-hero-dots span.is-active{width:21px;background:#fff}
.lv-home>section a:focus-visible,.lv-home>section button:focus-visible{outline:3px solid #60a5fa;outline-offset:4px}
.lv-listings{background:#f5f7fa!important;border-bottom:1px solid #e8edf4;padding-block:80px}
.lv-listings h2,.lv-cities h2{font-weight:650;letter-spacing:-.045em}
.lv-listings .text-gray-400,.lv-cities .text-gray-400{color:#64748b}
.lv-listings .grid>div{box-shadow:0 8px 24px -20px #172b4d30}
.lv-listings img{transition:transform .6s}
.lv-listings .grid>div:hover img{transform:scale(1.025)}
.lv-listings .overflow-x-auto{gap:10px;align-items:center;border-bottom:1px solid #e1e8f0;padding-bottom:20px;margin-bottom:30px}
.lv-listings .overflow-x-auto button{border-radius:10px;min-height:44px}
.lv-listings .overflow-x-auto span{white-space:normal}
.lv-cities{padding-block:85px}
.lv-cities .group{border:1px solid #e8edf4;border-radius:20px}
.lv-cities .group h3{font-weight:650;letter-spacing:-.035em}
.lv-cities .group:focus-visible{outline-offset:5px}
.lv-why{background:linear-gradient(120deg,#0c2346,#0f172a)!important;padding-block:80px}
.lv-why h2{font-weight:600;letter-spacing:-.04em;line-height:1.12}
.lv-why .grid>.rounded-2xl{padding:27px;border-radius:18px}
.lv-why li{line-height:1.65;align-items:flex-start}
.lv-why li svg{margin-top:3px}
.lv-process-section{padding-block:80px!important;background:#fff!important}
.lv-process-section h2{font-size:clamp(34px,4.3vw,54px);font-weight:650;letter-spacing:-.045em;line-height:1.08}
.lv-process-section [data-hiw-index]{border:1px solid #e5ebf3;border-radius:16px;background:#fff;overflow:hidden}
.lv-process-section .grid{gap:16px}
.lv-process-section [data-hiw-index] .text-slate-400{color:#64748b}
.lv-process-section [data-hiw-index] .text-slate-300{color:#64748b}
.lv-process-section [data-hiw-index] h3{font-size:20px;font-weight:600;letter-spacing:-.025em;margin-bottom:12px}
.lv-process-section [data-hiw-index] p{font-size:14px;line-height:1.8}
.lv-main-cta{background:#f5f7fa!important;padding-block:32px 60px}
.lv-main-cta>div>div{background:radial-gradient(ellipse at 100% 0%,#2357a8,#0c2244 65%);border-radius:24px;border:1px solid #1d3b65}
.lv-main-cta h2{font-weight:600;letter-spacing:-.04em}
.lv-main-cta .text-gray-400{color:#c1cee1}
.lv-main-cta a,.lv-landlord-cta a{border-radius:12px;min-height:48px}
.lv-landlord-cta{padding-block:44px 60px}
.lv-landlord-cta>div{max-width:1280px}
.lv-landlord-cta>div>div{border-radius:20px;background:#f5f9ff;padding:32px}
@media(max-width:1023px){.lv-home-hero{min-height:0}.lv-hero-content{min-height:0;padding-top:35px}.lv-hero-copy{max-width:720px}.lv-hero-title{max-width:620px}.lv-listings,.lv-cities,.lv-why,.lv-process-section{padding-block:60px!important}}
@media(max-width:639px){.lv-home-hero{padding-bottom:65px}.lv-hero-content{padding-top:8px;padding-bottom:0}.lv-hero-title{font-size:46px;max-width:400px}.lv-hero-copy{padding-bottom:10px}.lv-home-hero .uppercase{letter-spacing:.08em}.lv-hero-controls{bottom:17px;right:20px}.lv-listings,.lv-cities,.lv-why,.lv-process-section{padding-block:45px!important}.lv-cities a[style]{min-height:300px!important}.lv-why .grid>.rounded-2xl{padding:22px}.lv-landlord-cta>div>div{padding:24px;align-items:stretch}.lv-main-cta .relative.z-10{align-items:flex-start}}
@media(prefers-reduced-motion:reduce){.lv-home>section *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}

/* Lower-page redesign. Hero selectors and behaviour are intentionally untouched. */
.lv-trust-strip{background:#fff}
.lv-trust-strip .grid{gap:0}
.lv-trust-item{padding:18px 22px!important}
.lv-trust-item+.lv-trust-item{border-left:1px solid #e7edf5}
.lv-trust-item>div:first-child{background:#eff5ff;border:1px solid #e2ebfb;border-radius:14px}
.lv-trust-item p:last-child{line-height:1.7;margin-top:5px}
.lv-listings{background:#fafbfd!important;border:0;padding-block:78px 86px}
.lv-listings>div>div:first-child{margin-bottom:28px}
.lv-listings h2{font-size:clamp(30px,3.4vw,44px);font-weight:600}
.lv-listing-filter{align-items:center;padding:12px;border:1px solid #e2e9f3;border-radius:16px;background:#fff}
.lv-listing-filter button{min-width:90px;min-height:44px;border-radius:10px;font-weight:600;box-shadow:none}
.lv-listing-filter button.bg-gray-900{background:#2563eb}
.lv-listing-filter>span{margin-left:auto;padding:8px;color:#64748b}
.lv-property-frame{min-width:0;border-radius:20px;background:#fff;border:1px solid #e4eaf2;overflow:hidden;transition:box-shadow .25s,border-color .25s;box-shadow:0 8px 24px -18px #17365d20!important}
.lv-property-frame:hover{border-color:#bad0f0;box-shadow:0 16px 36px -22px #17365d45!important}
.lv-property-frame>div,.lv-property-frame>article,.lv-property-frame>a{height:100%;border:0!important;box-shadow:none!important;border-radius:0!important}
.lv-property-frame img{aspect-ratio:4/3;object-fit:cover}
.lv-property-frame a:focus-visible,.lv-property-frame button:focus-visible{outline-offset:-3px!important}
.lv-cities{background:#fff;padding-block:80px}
.lv-location-grid>a,.lv-location-secondary>a{min-height:410px!important}
.lv-location-secondary>a h3{font-size:36px;line-height:1.1}
.lv-location-secondary>a .absolute.bottom-5{bottom:28px;left:28px}
.lv-location-grid .group{border:0;border-radius:22px}
.lv-location-grid .group .opacity-0{opacity:1;transform:none}
.lv-expansion{grid-column:1/-1;display:grid!important;grid-template-columns:auto 1fr auto;align-items:center!important;gap:6px 22px;text-align:left!important;min-height:0!important;padding:26px 30px!important;border:1px solid #dce7f7;border-radius:18px;background:#f0f6ff!important}
.lv-expansion>div.w-11{grid-row:1/3;margin:0;background:white;border-color:#d6e4fa;width:48px;height:48px}
.lv-expansion h3{grid-column:2;grid-row:1;color:#172b4d;margin:0;font-size:19px}
.lv-expansion p{grid-column:2;grid-row:2;max-width:620px;color:#607087;margin:0}
.lv-expansion a{grid-column:3;grid-row:1/3;border-radius:10px;box-shadow:none}
.lv-why{background:#f7f9fc!important;border-block:1px solid #e6ecf4;padding-block:76px}
.lv-why>div{gap:50px}
.lv-why h2{color:#13243e;font-size:clamp(32px,3.7vw,47px)}
.lv-why>div>div:first-child>p:first-child{color:#2563eb}
.lv-why>div>div:first-child>p:last-child{color:#607087;line-height:1.9;font-size:15px}
.lv-comparison{border:1px solid #dde6f2;border-radius:20px;overflow:hidden;box-shadow:0 12px 35px -25px #1c355b30}
.lv-comparison>.rounded-2xl{border:0!important;border-radius:0!important;background:white;padding:28px!important}
.lv-comparison>.rounded-2xl:first-child p{color:#68778c;line-height:1.7;font-size:10px}
.lv-comparison>.rounded-2xl:first-child li{color:#68778c;font-size:13px}
.lv-comparison>.rounded-2xl:nth-child(2){background:#1f5bda}
.lv-comparison>.rounded-2xl:nth-child(2) p{color:#dceaff;line-height:1.7;font-size:10px}
.lv-comparison>.rounded-2xl:nth-child(2) li{color:white;font-size:13px}
.lv-comparison li{padding-block:7px}
.lv-process-section{padding-block:76px!important;background:#fff!important}
.lv-process-section>.blur-\[120px\]{display:none}
.lv-steps-grid{gap:0!important;border:1px solid #e0e8f3;border-radius:22px;overflow:hidden;background:#f8faff}
.lv-steps-grid [data-hiw-index]{border:0;border-radius:0;background:transparent}
.lv-steps-grid [data-hiw-index]+[data-hiw-index]{border-left:1px solid #e0e8f3}
.lv-steps-grid [data-hiw-index]>.relative{padding:30px 24px;min-height:270px}
.lv-steps-grid [data-hiw-index] .rounded-2xl{background:#eaf2ff;color:#2563eb}
.lv-steps-grid [data-hiw-index] svg{color:#2563eb}
.lv-steps-grid [data-hiw-index]:hover svg{color:white}
.lv-main-cta{background:#fff!important;padding-block:10px 30px}
.lv-closing-panel{background:#0d2347!important;border-radius:24px!important}
.lv-closing-panel>.relative{display:grid;grid-template-columns:1.1fr .9fr;align-items:stretch;padding:36px;gap:44px}
.lv-closing-panel>.relative>div:first-child{padding:12px}
.lv-closing-image{min-height:390px;width:100%;border:1px solid #ffffff15;border-radius:16px}
.lv-closing-image>div:last-child{padding-bottom:8px}
.lv-closing-image p:last-child{font-size:27px;letter-spacing:-.03em}
.lv-landlord-cta{padding-block:0 64px;border:0}
.lv-landlord-cta>div>div{border:0;border-radius:0;background:#fff;padding:30px 0;border-bottom:1px solid #e5ebf4;gap:24px}
@media(max-width:1023px){.lv-trust-item:nth-child(3){border-left:0}.lv-trust-item:nth-child(n+3){border-top:1px solid #e7edf5}.lv-closing-panel>.relative{gap:24px;padding:26px}.lv-closing-image{min-height:350px}.lv-steps-grid [data-hiw-index]:nth-child(3){border-left:0}.lv-steps-grid [data-hiw-index]:nth-child(n+3){border-top:1px solid #e0e8f3}}
@media(max-width:767px){.lv-expansion{grid-template-columns:auto 1fr;padding:24px!important}.lv-expansion a{grid-column:2;grid-row:3;width:fit-content;margin-top:10px}.lv-closing-panel>.relative{grid-template-columns:1fr;padding:24px}.lv-closing-image{min-height:250px}.lv-location-grid>a,.lv-location-secondary>a{min-height:320px!important}.lv-trust-item{padding:18px 12px!important}}
@media(max-width:639px){.lv-trust-item+.lv-trust-item{border-left:0;border-top:1px solid #e7edf5}.lv-listing-filter>span{flex-basis:100%;margin:0;padding:6px 2px;font-size:11px}.lv-comparison>.rounded-2xl{padding:24px!important}.lv-steps-grid [data-hiw-index]+[data-hiw-index]{border-left:0;border-top:1px solid #e0e8f3}.lv-steps-grid [data-hiw-index]>.relative{min-height:230px;padding:25px}.lv-closing-panel>.relative>div:first-child{padding:0}.lv-landlord-cta>div>div{padding:24px 0;align-items:stretch}.lv-location-secondary>a h3{font-size:32px}}
`
