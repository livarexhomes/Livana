import { useState, useEffect, useRef } from 'react'
import { Link } from 'wouter'
import { ArrowRight, ShieldCheck, Building2, Users, TrendingUp, Star, CheckCircle2, CheckCircle, MapPin, ChevronRight, Calendar, ChevronDown } from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import Footer from '../components/Footer'
import PropertyCard from '../components/PropertyCard'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import type { PropertyWithLandlord } from '../lib/types'
import { NIGERIAN_STATES, POPULAR_AREAS } from '../lib/nigerianStates'

type Tab = 'Buy' | 'Rent' | 'Lease' | 'Commercial'
const typeMap: Record<Tab, string> = { Buy: 'sale', Rent: 'rent', Lease: 'lease', Commercial: 'commercial' }

type Project = {
  id: string; name: string; developer: string; location: string
  description: string; image: string; price: number; down: number
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
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0
        const duration = 2000
        const step = target / (duration / 16)
        const timer = setInterval(() => {
          start += step
          if (start >= target) { setCount(target); clearInterval(timer) }
          else setCount(Math.floor(start))
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
  const [locationQuery, setLocationQuery] = useState('')
  const searchBarRef = useRef<HTMLDivElement>(null)
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [heroIdx, setHeroIdx] = useState(0)
  const [heroVisible, setHeroVisible] = useState(true)

  const HERO_LISTINGS = [
    { label: 'Just Listed', title: '3 Bed Detached • Lekki', price: '₦4,500,000', suffix: '/yr' },
    { label: 'New Build', title: '4 Bed Semi-Detached • Ikoyi', price: '₦85,000,000', suffix: '' },
    { label: 'Hot Deal', title: '2 Bed Apartment • VI', price: '₦2,800,000', suffix: '/yr' },
    { label: 'Off-Plan', title: '5 Bed Duplex • Abuja', price: '₦120,000,000', suffix: '' },
    { label: 'Just Listed', title: '3 Bed Terrace • Lekki Phase 2', price: '₦3,200,000', suffix: '/yr' },
  ]

  useEffect(() => {
    const id = setInterval(() => {
      setHeroVisible(false)
      setTimeout(() => {
        setHeroIdx(i => (i + 1) % HERO_LISTINGS.length)
        setHeroVisible(true)
      }, 350)
    }, 3500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { setAllProjects(loadProjects()) }, [])

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

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      {/* ── HERO ── */}
      <section
        className="relative"
        style={{ minHeight: 'calc(100vh - 80px)', marginTop: '80px', paddingTop: '4rem', paddingBottom: '4rem' }}
      >
        {/* Full-bleed background image */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1800&q=90"
            alt=""
            className="w-full h-full object-cover object-center"
          />
          {/* Multi-layer overlay: dark left, lighter right */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>

        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 flex flex-col justify-center"
          style={{ minHeight: 'calc(100vh - 80px)' }}>

          <div className="max-w-2xl pt-12 pb-16 lg:pt-0 lg:pb-0" ref={searchBarRef}>

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
            <h1 className="text-5xl sm:text-6xl xl:text-7xl font-black leading-[1.0] tracking-tight text-white mb-6">
              Nigeria's Verified<br />
              <span className="relative inline-block">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-300 to-indigo-400">
                  Property Marketplace
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-60" />
              </span>
              <br />
              <span className="text-white/90">in Nigeria</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-white/70 mb-10 leading-relaxed max-w-lg font-light">
              Find verified homes directly from verified landlords. No agents. No middlemen. No hidden fees.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/listings" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition-all">
                Browse Properties
              </Link>
              <Link href="/for-landlords" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-8 py-4 text-sm font-semibold text-white hover:bg-white/15 transition-all">
                List Your Property
              </Link>
            </div>

            {/* Search card */}
            <div className="mb-12">
              {/* Tabs */}
              <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
                {(['Rent', 'Lease', 'Buy', 'Commercial'] as Tab[]).map(t => {
                  const comingSoon = t === 'Buy' || t === 'Commercial'
                  return comingSoon ? (
                    <span key={t} className="px-3 py-2 rounded-full text-sm font-semibold text-white/25 cursor-default select-none flex items-center gap-1.5 shrink-0">
                      {t}
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-white/10 text-white/30 px-1.5 py-0.5 rounded-md">Soon</span>
                    </span>
                  ) : (
                    <button key={t} type="button" onClick={() => setActiveTab(t)}
                      className={`px-5 py-2 rounded-full text-sm font-bold transition-all shrink-0 ${activeTab === t
                          ? 'bg-white text-gray-900 shadow-lg'
                          : 'text-white/50 hover:text-white hover:bg-white/10'
                        }`}>
                      {t}
                    </button>
                  )
                })}
              </div>

              {/* Desktop search bar */}
              <div className="hidden sm:block relative">
                <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.35)] p-1.5">
                  <div className="flex items-center gap-0">

                    {/* Location */}
                    <button type="button"
                      onClick={() => setOpenDropdown(o => o === 'location' ? null : 'location')}
                      className="flex-1 min-w-0 px-4 py-2.5 text-left hover:bg-gray-50 rounded-xl transition-colors">
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                        <MapPin className="inline w-2.5 h-2.5 mr-0.5 -mt-0.5 text-blue-500" />Location
                      </span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${searchState ? 'text-blue-600' : 'text-gray-800'}`}>
                        <span className="truncate">{searchState || 'Any Location'}</span>
                        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'location' ? 'rotate-180' : ''}`} />
                      </span>
                    </button>

                    <div className="w-px h-8 bg-gray-200 shrink-0" />

                    {/* Property Type */}
                    <button type="button"
                      onClick={() => setOpenDropdown(o => o === 'propertyType' ? null : 'propertyType')}
                      className="flex-1 min-w-0 px-4 py-2.5 text-left hover:bg-gray-50 rounded-xl transition-colors">
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Type</span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${selectedPropertyTypes.length ? 'text-blue-600' : 'text-gray-800'}`}>
                        <span className="truncate">{propertyTypeLabel}</span>
                        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'propertyType' ? 'rotate-180' : ''}`} />
                      </span>
                    </button>

                    <div className="w-px h-8 bg-gray-200 shrink-0" />

                    {/* Beds & Baths */}
                    <button type="button"
                      onClick={() => setOpenDropdown(o => o === 'beds' ? null : 'beds')}
                      className="flex-1 min-w-0 px-4 py-2.5 text-left hover:bg-gray-50 rounded-xl transition-colors">
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Beds &amp; Baths</span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${(searchBeds || searchBaths) ? 'text-blue-600' : 'text-gray-800'}`}>
                        <span className="truncate">{bedsBathsLabel}</span>
                        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'beds' ? 'rotate-180' : ''}`} />
                      </span>
                    </button>

                    <div className="w-px h-8 bg-gray-200 shrink-0" />

                    {/* Price */}
                    <button type="button"
                      onClick={() => setOpenDropdown(o => o === 'price' ? null : 'price')}
                      className="flex-1 min-w-0 px-4 py-2.5 text-left hover:bg-gray-50 rounded-xl transition-colors">
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Price</span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${(priceMin > 0 || priceMax < 500_000_000) ? 'text-blue-600' : 'text-gray-800'}`}>
                        <span className="truncate">{priceLabel}</span>
                        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${openDropdown === 'price' ? 'rotate-180' : ''}`} />
                      </span>
                    </button>

                    {/* Search button */}
                    <button type="button" onClick={() => handleSearch()}
                      className="shrink-0 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all ml-1">
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
                    <div className="absolute top-[calc(100%+10px)] left-0 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 w-80">
                      {/* Search input */}
                      <div className="p-3 border-b border-gray-100">
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
                          <input
                            autoFocus
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
                  <div className="absolute top-[calc(100%+10px)] left-0 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-72">
                    <p className="text-base font-bold text-gray-900 mb-1">Property Type</p>
                    <p className="text-xs text-gray-400 mb-4">Select one or more types</p>
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${selectedPropertyTypes.length === 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}
                          onClick={() => togglePropertyType('')}>
                          {selectedPropertyTypes.length === 0 && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                        <span className="text-sm font-medium text-gray-800">Any</span>
                      </label>
                      {PROPERTY_TYPES.map(pt => (
                        <label key={pt} className="flex items-center gap-3 cursor-pointer group">
                          <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${selectedPropertyTypes.includes(pt) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}
                            onClick={() => togglePropertyType(pt)}>
                            {selectedPropertyTypes.includes(pt) && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </div>
                          <span className="text-sm text-gray-700">{pt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Beds & Baths Panel */}
                {openDropdown === 'beds' && (
                  <div className="absolute top-[calc(100%+10px)] left-[30%] z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-80">
                    <div className="mb-5">
                      <p className="text-base font-bold text-gray-900 mb-3">Bedrooms</p>
                      <div className="flex gap-2">
                        {['Any', '1', '2', '3', '4', '5+'].map(v => {
                          const val = v === 'Any' ? '' : v.replace('+', '')
                          const active = v === 'Any' ? searchBeds === '' : searchBeds === val
                          return <button key={v} type="button" onClick={() => setSearchBeds(active ? '' : val)}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${active ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-700 hover:border-blue-300'}`}>{v}</button>
                        })}
                      </div>
                    </div>
                    <div className="mb-5">
                      <p className="text-base font-bold text-gray-900 mb-3">Bathrooms</p>
                      <div className="flex gap-2">
                        {['Any', '1', '2', '3', '4', '5', '6+'].map(v => {
                          const val = v === 'Any' ? '' : v.replace('+', '')
                          const active = v === 'Any' ? searchBaths === '' : searchBaths === val
                          return <button key={v} type="button" onClick={() => setSearchBaths(active ? '' : val)}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${active ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-700 hover:border-blue-300'}`}>{v}</button>
                        })}
                      </div>
                    </div>
                    <button type="button" onClick={() => setOpenDropdown(null)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm">Apply</button>
                  </div>
                )}

                {/* Price Panel */}
                {openDropdown === 'price' && (
                  <div className="absolute top-[calc(100%+10px)] right-14 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-80">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-base font-bold text-gray-900">Price Range</p>
                      <button type="button" onClick={() => { setPriceMin(0); setPriceMax(500_000_000) }} className="text-xs font-semibold text-blue-600">Reset</button>
                    </div>
                    <div className="flex gap-3 mb-5">
                      <div className="flex-1 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Min (₦)</p>
                        <input type="number" min={0} max={priceMax - 500_000} step={100_000} value={priceMin === 0 ? '' : priceMin} placeholder="0"
                          onChange={e => { const v = Number(e.target.value) || 0; if (v < priceMax) setPriceMin(v) }}
                          className="w-full text-sm font-bold text-gray-900 outline-none bg-transparent" />
                      </div>
                      <div className="flex items-center text-gray-300 font-bold">—</div>
                      <div className="flex-1 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Max (₦)</p>
                        <input type="number" min={priceMin + 500_000} max={500_000_000} step={100_000} value={priceMax === 500_000_000 ? '' : priceMax} placeholder="500,000,000"
                          onChange={e => { const v = Number(e.target.value) || 500_000_000; if (v > priceMin) setPriceMax(v) }}
                          className="w-full text-sm font-bold text-gray-900 outline-none bg-transparent" />
                      </div>
                    </div>
                    <div className="relative h-5 mb-2">
                      <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-gray-200 rounded-full" />
                      <div className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-blue-600 rounded-full"
                        style={{ left: `${(priceMin / 500_000_000) * 100}%`, right: `${100 - (priceMax / 500_000_000) * 100}%` }} />
                      <input type="range" min={0} max={500_000_000} step={500_000} value={priceMin}
                        onChange={e => { const v = Number(e.target.value); if (v < priceMax) setPriceMin(v) }}
                        className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer" />
                      <input type="range" min={0} max={500_000_000} step={500_000} value={priceMax}
                        onChange={e => { const v = Number(e.target.value); if (v > priceMin) setPriceMax(v) }}
                        className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer" />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 font-medium mb-5"><span>₦0</span><span>₦500M</span></div>
                    <button type="button" onClick={() => setOpenDropdown(null)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm">Apply</button>
                  </div>
                )}
              </div>

              {/* Mobile search */}
              <form onSubmit={handleSearch} className="sm:hidden bg-white rounded-2xl shadow-2xl p-3 space-y-2">
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
                  <select value={searchState} onChange={e => setSearchState(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 text-sm text-gray-800 outline-none appearance-none">
                    <option value="">Location — Any State</option>
                    {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={selectedPropertyTypes[0] ?? ''} onChange={e => setSelectedPropertyTypes(e.target.value ? [e.target.value] : [])}
                    className="w-full px-3 py-3 rounded-xl bg-gray-50 text-sm text-gray-800 outline-none appearance-none">
                    <option value="">Property Type</option>
                    {PROPERTY_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                  </select>
                  <select value={searchBeds} onChange={e => setSearchBeds(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl bg-gray-50 text-sm text-gray-800 outline-none appearance-none">
                    <option value="">Beds</option>
                    {['1', '2', '3', '4', '5'].map(n => <option key={n} value={n}>{n}+ Beds</option>)}
                  </select>
                </div>
                <button type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  Search Properties
                </button>
              </form>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-8">
              {[
                { value: 2400, suffix: '+', label: 'Properties' },
                { value: 850, suffix: '+', label: 'Landlords' },
                { value: 0, prefix: '₦', label: 'Agent Fees' },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-8">
                  {i > 0 && <div className="w-px h-8 bg-white/20" />}
                  <div>
                    <p className="font-black text-white text-2xl leading-none tracking-tight">
                      {s.prefix ?? ''}<AnimatedCounter target={s.value} suffix={s.suffix ?? ''} />
                    </p>
                    <p className="text-xs text-white/40 mt-1 font-medium">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Floating property card — bottom right */}
          <div className="hidden lg:block absolute bottom-10 right-10 w-72">
            <div className="bg-white rounded-2xl shadow-2xl p-5 border border-white/20">
              <div
                className="transition-all duration-300"
                style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(8px)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                    {HERO_LISTINGS[heroIdx].label}
                  </span>
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1 leading-snug">{HERO_LISTINGS[heroIdx].title}</h3>
                <p className="text-blue-600 font-black text-xl mb-4">
                  {HERO_LISTINGS[heroIdx].price}
                  {HERO_LISTINGS[heroIdx].suffix && <span className="text-xs text-gray-400 font-normal ml-1">{HERO_LISTINGS[heroIdx].suffix}</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/listings"
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                  View Listings <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <div className="flex items-center gap-1">
                  {HERO_LISTINGS.map((_, i) => (
                    <button key={i}
                      onClick={() => { setHeroVisible(false); setTimeout(() => { setHeroIdx(i); setHeroVisible(true) }, 200) }}
                      className={`rounded-full transition-all duration-300 ${i === heroIdx ? 'w-4 h-1.5 bg-blue-600' : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── TRUST BADGES ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: ShieldCheck, label: 'Verified Landlords', desc: 'Every landlord reviewed & approved' },
              { icon: Building2, label: 'Genuine Listings', desc: 'Real properties, real prices' },
              { icon: Users, label: 'Direct Contact', desc: 'No middlemen or agent fees' },
              { icon: TrendingUp, label: 'Market Insights', desc: 'Stay ahead with price trends' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-4">
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
      <section className="bg-[#F8F8F6] py-20 md:py-25">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-blue-600 font-bold text-[11px] uppercase tracking-[0.15em]">Fresh Listings</span>
              </div>
              <h2 className="text-3xl md:text-[2.6rem] font-black text-gray-900 tracking-tight leading-[1.1]">
                Newly Listed Properties
              </h2>
              <p className="text-gray-400 mt-2.5 text-sm font-medium">
                Hand-picked from verified landlords across Nigeria.
              </p>
            </div>
            <button
              onClick={() => {
                if (isAuthenticated) {
                  window.location.href = 'https://www.livarex.com.ng/listings?type=rent'
                } else {
                  window.location.href = '/login'
                }
              }}
              className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-all whitespace-nowrap shrink-0 shadow-lg shadow-gray-900/10 active:scale-95"
            >
              View all listings
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-10 overflow-x-auto no-scrollbar pb-1">
            {(['Rent', 'Lease', 'Buy', 'Commercial'] as Tab[]).map(t => {
              const comingSoon = t === 'Buy' || t === 'Commercial'
              return comingSoon ? (
                <span
                  key={t}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap bg-white text-gray-300 border border-gray-100 cursor-default select-none shrink-0"
                >
                  {t}
                  <span className="text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-300 px-1.5 py-0.5 rounded-md">Soon</span>
                </span>
              ) : (
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
              )
            })}
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {properties.map(p => (
                <PropertyCard key={p.id} property={p} saved={savedIds.has(p.id)} isAuthenticated={isAuthenticated} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 py-24 text-center flex flex-col items-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-bold text-gray-700">No properties yet</h3>
              <p className="text-gray-400 mt-1 text-sm max-w-xs">Check back soon — new listings are added regularly.</p>
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
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
      <section className="bg-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="mb-12">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-2">Top Locations</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Explore by City</h2>
            <p className="text-gray-500 mt-2">Nigeria's most sought-after real estate markets.</p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[140px] md:grid-rows-[280px_200px] gap-3 md:gap-4">
            {/* Lagos — large feature cell (2 cols × 2 rows) — ACTIVE */}
            <Link
              href="/listings?city=Lagos"
              className="relative group overflow-hidden rounded-3xl col-span-2 row-span-2 shadow-sm hover:shadow-2xl transition-all duration-500"
            >
              <img src="https://images.pexels.com/photos/36622013/pexels-photo-36622013.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="Lagos" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <span className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">Most Popular</span>
                <h3 className="text-3xl font-extrabold text-white">Lagos</h3>
                <p className="text-blue-300 text-sm font-medium mt-1">Commercial Capital</p>
              </div>
              <div className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 duration-300">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </Link>

            {/* Abuja — coming soon */}
            <div className="relative overflow-hidden rounded-3xl col-span-1 shadow-sm cursor-default">
              <img src="https://images.unsplash.com/photo-1567985207911-725f4e7c8926?w=800" alt="Abuja" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60" />
              <div className="absolute bottom-4 left-4">
                <h3 className="text-lg font-bold text-white/60">Abuja</h3>
                <p className="text-white/40 text-xs font-medium mt-0.5">Federal Capital</p>
              </div>
              <div className="absolute top-3 right-3 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                Coming Soon
              </div>
            </div>

            {/* Ogun — ACTIVE */}
            <Link
              href="/listings?city=Ogun"
              className="relative group overflow-hidden rounded-3xl col-span-1 shadow-sm hover:shadow-2xl transition-all duration-500"
            >
              <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800" alt="Ogun" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h3 className="text-lg font-bold text-white">Ogun</h3>
                <p className="text-blue-300 text-xs font-medium mt-0.5">Gateway State</p>
              </div>
              <div className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 duration-300">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </Link>

            {/* Port Harcourt — coming soon (2 cols) */}
            <div className="relative overflow-hidden rounded-3xl col-span-2 shadow-sm cursor-default">
              <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1000" alt="Port Harcourt" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60" />
              <div className="absolute bottom-4 left-5">
                <h3 className="text-xl font-bold text-white/60">Port Harcourt</h3>
                <p className="text-white/40 text-xs font-medium mt-0.5">Oil City Hub</p>
              </div>
              <div className="absolute top-3 right-3 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                Coming Soon
              </div>
            </div>
          </div>

          {/* Second row — smaller cities, all coming soon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-3 md:mt-4">
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
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="bg-gray-950 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="mb-14">
            <p className="text-blue-500 font-semibold text-sm uppercase tracking-widest mb-3">What People Say</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight max-w-sm">Real stories from real people.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Adebayo O.', role: 'Tenant', city: 'Lagos', text: 'Found my perfect 3-bedroom in Lekki within a week. The landlord verification gave me total peace of mind. Absolutely recommend LIVAREX!', avatar: 'AO', featured: false },
              { name: 'Chidinma E.', role: 'Landlord', city: 'Abuja', text: 'Listed my property on a Friday, had 3 serious enquiries by Monday. The platform is slick and my tenants are quality people.', avatar: 'CE', featured: true },
              { name: 'Emeka N.', role: 'Tenant', city: 'Port Harcourt', text: 'No agent stress, no fake listings. I contacted the landlord directly on WhatsApp and moved in within two weeks. Game changer.', avatar: 'EN', featured: false },
            ].map((t, i) => (
              <div
                key={i}
                className={`relative rounded-3xl p-8 flex flex-col gap-6 transition-all duration-300 ${t.featured
                    ? 'bg-blue-600 shadow-2xl shadow-blue-600/30 scale-[1.02]'
                    : 'bg-white/5 border border-white/10 hover:bg-white/8'
                  }`}
              >
                {/* Big decorative quote */}
                <span className={`absolute top-6 right-7 text-8xl font-serif leading-none select-none ${t.featured ? 'text-blue-400/40' : 'text-white/8'}`}>"</span>

                {/* Stars */}
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className={`w-4 h-4 ${t.featured ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'}`} />
                  ))}
                </div>

                {/* Quote */}
                <p className={`text-base leading-relaxed flex-1 relative z-10 ${t.featured ? 'text-white' : 'text-gray-300'}`}>
                  "{t.text}"
                </p>

                {/* Person */}
                <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${t.featured ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${t.featured ? 'text-white' : 'text-white'}`}>{t.name}</p>
                    <p className={`text-xs ${t.featured ? 'text-blue-200' : 'text-gray-500'}`}>{t.role} • {t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20 md:py-28 px-5 sm:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-[2rem] bg-gray-950">
            <div className="relative z-10 p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 text-xs font-semibold uppercase tracking-widest text-blue-400 mb-6">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Platform
                </div>
                <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
                  Ready to find your<br />perfect home?
                </h2>
                <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-md">
                  Join over 10,000 Nigerians who've found their ideal property on LIVAREX. Start your search today — it's completely free.
                </p>
                <ul className="space-y-2 mb-8">
                  {['Verified landlords only', 'Zero agent fees', 'Direct WhatsApp contact'].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-gray-400 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/listings" className="px-7 py-3.5 bg-white text-gray-900 font-bold rounded-2xl hover:bg-gray-100 transition-all text-center text-sm shadow-xl">
                    Browse Listings
                  </Link>
                  <Link href="/register" className="px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all text-center text-sm">
                    List Your Property
                  </Link>
                </div>
              </div>

              <div className="hidden md:grid grid-cols-2 gap-3 shrink-0">
                {[
                  { num: '10K+', label: 'Happy Tenants' },
                  { num: '850+', label: 'Landlords' },
                  { num: '₦0', label: 'Agent Fees' },
                  { num: '4.9★', label: 'Average Rating' },
                ].map(item => (
                  <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-center hover:bg-white/8 transition-all">
                    <p className="text-2xl font-extrabold text-white">{item.num}</p>
                    <p className="text-gray-500 text-xs mt-1 font-medium">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
