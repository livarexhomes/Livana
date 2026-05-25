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
  try { const r = localStorage.getItem('livana_admin_projects'); if (r) return JSON.parse(r) } catch {}
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
  const [openDropdown, setOpenDropdown] = useState<'propertyType' | 'beds' | 'price' | null>(null)
  const searchBarRef = useRef<HTMLDivElement>(null)
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [heroIdx, setHeroIdx] = useState(0)
  const [heroVisible, setHeroVisible] = useState(true)

  const HERO_LISTINGS = [
    { label: 'Just Listed', title: '3 Bed Detached • Lekki', price: '₦4,500,000', suffix: '/yr' },
    { label: 'New Build',   title: '4 Bed Semi-Detached • Ikoyi', price: '₦85,000,000', suffix: '' },
    { label: 'Hot Deal',    title: '2 Bed Apartment • VI', price: '₦2,800,000', suffix: '/yr' },
    { label: 'Off-Plan',   title: '5 Bed Duplex • Abuja', price: '₦120,000,000', suffix: '' },
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
      <section className="relative bg-white flex" style={{ minHeight: 'calc(100vh - 80px)', marginTop: '80px' }}>
        {/* Left Column */}
        <div className="w-full lg:w-[55%] flex flex-col justify-center px-6 sm:px-10 lg:px-16 xl:px-24 pt-12 pb-16">
          <div className="max-w-xl">
            {/* Label */}
            <div className="flex items-center gap-2.5 mb-7">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600" />
              </span>
              <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                Nigeria's Leading Property Platform
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl xl:text-7xl font-extrabold leading-[1.08] mb-6 tracking-tight text-gray-900">
              Find Your Next<br />Home in Nigeria
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-gray-500 mb-10 leading-relaxed max-w-md">
              Browse verified listings. Contact landlords directly. No agent fees.
            </p>

            {/* Search Card */}
            <div className="mb-12" ref={searchBarRef}>
              {/* Tabs */}
              <div className="flex gap-1 mb-3">
                {(['Buy', 'Rent', 'Lease', 'Commercial'] as Tab[]).map(t => {
                  const comingSoon = t === 'Buy' || t === 'Lease'
                  return comingSoon ? (
                    <span key={t} className="px-4 py-2 rounded-full text-sm font-semibold text-gray-300 cursor-default select-none flex items-center gap-1.5">
                      {t}
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md">Soon</span>
                    </span>
                  ) : (
                    <button key={t} type="button" onClick={() => setActiveTab(t)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        activeTab === t
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                      }`}>
                      {t}
                    </button>
                  )
                })}
              </div>

              {/* ── Desktop search card ── */}
              <div className="hidden sm:block relative">
                <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgb(0,0,0,0.10)] border border-gray-100 p-3">
                  <div className="flex items-stretch gap-2">

                    {/* Location */}
                    <div className="relative flex-1 min-w-0 bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl px-4 py-3 cursor-pointer">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 pointer-events-none">
                        <MapPin className="inline w-3 h-3 mr-1 -mt-0.5" />Location
                      </label>
                      <select value={searchState} onChange={e => setSearchState(e.target.value)}
                        className="w-full bg-transparent text-sm text-gray-800 font-semibold outline-none appearance-none cursor-pointer leading-tight">
                        <option value="">Any Location</option>
                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Property Type trigger */}
                    <button type="button"
                      onClick={() => setOpenDropdown(o => o === 'propertyType' ? null : 'propertyType')}
                      className="relative flex-1 min-w-0 bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl px-4 py-3 text-left">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Property Type</span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${selectedPropertyTypes.length ? 'text-blue-600' : 'text-gray-700'}`}>
                        <span className="truncate">{propertyTypeLabel}</span>
                        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${openDropdown === 'propertyType' ? 'rotate-180' : ''}`} />
                      </span>
                    </button>

                    {/* Beds & Baths trigger */}
                    <button type="button"
                      onClick={() => setOpenDropdown(o => o === 'beds' ? null : 'beds')}
                      className="relative flex-1 min-w-0 bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl px-4 py-3 text-left">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Beds &amp; Baths</span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${(searchBeds || searchBaths) ? 'text-blue-600' : 'text-gray-700'}`}>
                        <span className="truncate">{bedsBathsLabel}</span>
                        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${openDropdown === 'beds' ? 'rotate-180' : ''}`} />
                      </span>
                    </button>

                    {/* Price trigger */}
                    <button type="button"
                      onClick={() => setOpenDropdown(o => o === 'price' ? null : 'price')}
                      className="relative flex-1 min-w-0 bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl px-4 py-3 text-left">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Price</span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${(priceMin > 0 || priceMax < 500_000_000) ? 'text-blue-600' : 'text-gray-700'}`}>
                        <span className="truncate">{priceLabel}</span>
                        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${openDropdown === 'price' ? 'rotate-180' : ''}`} />
                      </span>
                    </button>

                    {/* Search button */}
                    <button type="button" onClick={() => handleSearch()}
                      className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all active:scale-95">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      Search
                    </button>
                  </div>
                </div>

                {/* ── Property Type Panel ── */}
                {openDropdown === 'propertyType' && (
                  <div className="absolute top-[calc(100%+10px)] left-[25%] z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 w-72">
                    <p className="text-base font-bold text-gray-900 mb-1">Property Type</p>
                    <p className="text-xs text-gray-400 mb-4">You can select multiple property types</p>
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {/* Any */}
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${selectedPropertyTypes.length === 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}
                          onClick={() => togglePropertyType('')}>
                          {selectedPropertyTypes.length === 0 && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-800">Any</span>
                      </label>
                      {PROPERTY_TYPES.map(pt => (
                        <label key={pt} className="flex items-center gap-3 cursor-pointer group">
                          <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${selectedPropertyTypes.includes(pt) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}
                            onClick={() => togglePropertyType(pt)}>
                            {selectedPropertyTypes.includes(pt) && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            )}
                          </div>
                          <span className="text-sm text-gray-700">{pt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Beds & Baths Panel ── */}
                {openDropdown === 'beds' && (
                  <div className="absolute top-[calc(100%+10px)] left-[50%] -translate-x-1/4 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 w-80">
                    <div className="mb-5">
                      <div className="flex items-baseline gap-2 mb-3">
                        <p className="text-base font-bold text-gray-900">Beds</p>
                        <p className="text-xs text-gray-400">Tap two numbers to select a range</p>
                      </div>
                      <div className="flex gap-2">
                        {['Any', '1', '2', '3', '4', '5+'].map(v => {
                          const val = v === 'Any' ? '' : v.replace('+', '')
                          const active = v === 'Any' ? searchBeds === '' : searchBeds === val
                          return (
                            <button key={v} type="button" onClick={() => setSearchBeds(active ? '' : val)}
                              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
                                active ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600'
                              }`}>
                              {v}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="mb-5">
                      <p className="text-base font-bold text-gray-900 mb-3">Baths</p>
                      <div className="flex gap-2">
                        {['Any', '1', '2', '3', '4', '5', '6+'].map(v => {
                          const val = v === 'Any' ? '' : v.replace('+', '')
                          const active = v === 'Any' ? searchBaths === '' : searchBaths === val
                          return (
                            <button key={v} type="button" onClick={() => setSearchBaths(active ? '' : val)}
                              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
                                active ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600'
                              }`}>
                              {v}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <button type="button" onClick={() => { setOpenDropdown(null) }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-all">
                      Apply Filter
                    </button>
                  </div>
                )}

                {/* ── Price Panel ── */}
                {openDropdown === 'price' && (
                  <div className="absolute top-[calc(100%+10px)] right-14 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 w-80">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-base font-bold text-gray-900">Price</p>
                      <button type="button" onClick={() => { setPriceMin(0); setPriceMax(500_000_000) }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700">Reset</button>
                    </div>
                    <div className="flex gap-3 mb-5">
                      <div className="flex-1 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Min (₦)</p>
                        <input
                          type="number" min={0} max={priceMax - 500_000} step={100_000}
                          value={priceMin === 0 ? '' : priceMin}
                          placeholder="0"
                          onChange={e => { const v = Number(e.target.value) || 0; if (v < priceMax) setPriceMin(v) }}
                          className="w-full text-sm font-bold text-gray-900 outline-none bg-transparent"
                        />
                      </div>
                      <div className="flex items-center text-gray-300 font-bold">—</div>
                      <div className="flex-1 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Max (₦)</p>
                        <input
                          type="number" min={priceMin + 500_000} max={500_000_000} step={100_000}
                          value={priceMax === 500_000_000 ? '' : priceMax}
                          placeholder="500,000,000"
                          onChange={e => { const v = Number(e.target.value) || 500_000_000; if (v > priceMin) setPriceMax(v) }}
                          className="w-full text-sm font-bold text-gray-900 outline-none bg-transparent"
                        />
                      </div>
                    </div>
                    {/* Dual range slider */}
                    <div className="relative h-5 mb-2">
                      <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-gray-200 rounded-full" />
                      <div className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-blue-600 rounded-full"
                        style={{
                          left: `${(priceMin / 500_000_000) * 100}%`,
                          right: `${100 - (priceMax / 500_000_000) * 100}%`
                        }} />
                      <input type="range" min={0} max={500_000_000} step={500_000}
                        value={priceMin}
                        onChange={e => { const v = Number(e.target.value); if (v < priceMax) setPriceMin(v) }}
                        className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer" />
                      <input type="range" min={0} max={500_000_000} step={500_000}
                        value={priceMax}
                        onChange={e => { const v = Number(e.target.value); if (v > priceMin) setPriceMax(v) }}
                        className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer" />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 font-medium mb-5">
                      <span>₦0</span>
                      <span>₦500,000,000</span>
                    </div>
                    <button type="button" onClick={() => setOpenDropdown(null)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-all">
                      Apply Filter
                    </button>
                  </div>
                )}
              </div>

              {/* ── Mobile stacked search ── */}
              <form onSubmit={handleSearch}
                className="sm:hidden bg-white rounded-2xl shadow-[0_4px_24px_rgb(0,0,0,0.10)] border border-gray-100 p-3 space-y-2">
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
                    {['1','2','3','4','5'].map(n => <option key={n} value={n}>{n}+ Beds</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={searchBaths} onChange={e => setSearchBaths(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl bg-gray-50 text-sm text-gray-800 outline-none appearance-none">
                    <option value="">Baths</option>
                    {['1','2','3','4','5','6'].map(n => <option key={n} value={n}>{n}+ Baths</option>)}
                  </select>
                  <select
                    value={priceMax === 500_000_000 ? '' : String(priceMax)}
                    onChange={e => { const v = e.target.value; setPriceMin(0); setPriceMax(v ? Number(v) : 500_000_000) }}
                    className="w-full px-3 py-3 rounded-xl bg-gray-50 text-sm text-gray-800 outline-none appearance-none">
                    <option value="">Price Range</option>
                    <option value="500000">Under ₦500k</option>
                    <option value="1500000">Under ₦1.5M</option>
                    <option value="5000000">Under ₦5M</option>
                    <option value="20000000">Under ₦20M</option>
                  </select>
                </div>
                <button type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-600/25">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  Search Properties
                </button>
              </form>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 text-sm text-gray-400">
              {[
                { value: 2400, suffix: '+', label: 'Properties' },
                { value: 850, suffix: '+', label: 'Landlords' },
                { value: 0, prefix: '₦', label: 'Agent Fees' },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-8">
                  {i > 0 && <div className="w-px h-10 bg-gray-200" />}
                  <div className="flex flex-col gap-0.5">
                    <span className="font-extrabold text-gray-900 text-xl leading-none">
                      {s.prefix ?? ''}<AnimatedCounter target={s.value} suffix={s.suffix ?? ''} />
                    </span>
                    <span className="text-xs text-gray-400">{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column — Image */}
        <div className="hidden lg:block lg:w-[45%] relative p-4 pl-0" style={{ height: 'calc(100vh - 80px)', marginTop: '80px' }}>
          <div className="w-full h-full relative rounded-l-[3rem] overflow-hidden shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1400&q=85"
              alt="Modern Nigerian home"
              className="w-full h-full object-cover"
            />
            {/* Verified badge */}
            <div className="absolute top-8 right-8 bg-white/95 backdrop-blur-sm shadow-xl rounded-full px-4 py-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-gray-900">Verified Landlord</span>
            </div>
            {/* Property card — auto-cycling */}
            <div className="absolute bottom-12 left-8 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl p-6 w-72 border border-white/30">
              <div
                className="transition-all duration-350"
                style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(6px)' }}
              >
                <div className="bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-block mb-3">
                  {HERO_LISTINGS[heroIdx].label}
                </div>
                <h3 className="font-bold text-base text-gray-900 mb-1">{HERO_LISTINGS[heroIdx].title}</h3>
                <p className="text-blue-600 font-extrabold text-xl mb-4">
                  {HERO_LISTINGS[heroIdx].price}
                  {HERO_LISTINGS[heroIdx].suffix && (
                    <span className="text-sm text-gray-400 font-normal">{HERO_LISTINGS[heroIdx].suffix}</span>
                  )}
                </p>
              </div>
              <Link
                href="/listings"
                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                View Listings <ArrowRight className="w-4 h-4" />
              </Link>
              {/* Dot indicators */}
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {HERO_LISTINGS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setHeroVisible(false); setTimeout(() => { setHeroIdx(i); setHeroVisible(true) }, 200) }}
                    className={`rounded-full transition-all duration-300 ${
                      i === heroIdx ? 'w-4 h-1.5 bg-blue-600' : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BADGES ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: ShieldCheck, label: 'Verified Landlords', desc: 'Every landlord reviewed & approved' },
              { icon: Building2, label: 'Genuine Listings', desc: 'Real properties, real prices' },
              { icon: Users, label: 'Direct Contact', desc: 'No middlemen or agent fees' },
              { icon: TrendingUp, label: 'Market Insights', desc: 'Stay ahead with price trends' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4 p-4">
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
      <section className="bg-gray-50 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-2">Fresh Listings</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Newly Listed Properties
              </h2>
              <p className="text-gray-500 mt-2 text-base">Hand-picked opportunities from verified landlords.</p>
            </div>
            <Link
              href={`/listings?type=${typeMap[activeTab]}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all whitespace-nowrap shadow-sm"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar">
            {(['Buy', 'Rent', 'Lease', 'Commercial'] as Tab[]).map(t => {
              const comingSoon = t === 'Buy' || t === 'Lease'
              return comingSoon ? (
                <span key={t} className="px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap bg-white text-gray-300 border border-gray-100 cursor-default select-none flex items-center gap-1.5">
                  {t}
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md">Soon</span>
                </span>
              ) : (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    activeTab === t
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-200 hover:text-blue-600'
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[300px] gap-3">
              <div className="animate-spin w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full" style={{ borderWidth: '3px' }}></div>
              <span className="text-gray-500 text-sm font-medium">Loading properties...</span>
            </div>
          ) : properties.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {properties.map(p => (
                <PropertyCard key={p.id} property={p} saved={savedIds.has(p.id)} isAuthenticated={isAuthenticated} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 py-24 text-center flex flex-col items-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-blue-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No properties yet</h3>
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
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              proj.status === 'coming_soon'
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
          <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-[180px_140px_140px_120px] md:grid-rows-[280px_200px] gap-3 md:gap-4">
            {/* Lagos — large feature cell (2 cols × 2 rows) */}
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

            {/* Abuja — top right */}
            <Link
              href="/listings?city=Abuja"
              className="relative group overflow-hidden rounded-3xl col-span-1 shadow-sm hover:shadow-2xl transition-all duration-500"
            >
              <img src="https://images.unsplash.com/photo-1567985207911-725f4e7c8926?w=800" alt="Abuja" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h3 className="text-lg font-bold text-white">Abuja</h3>
                <p className="text-blue-300 text-xs font-medium mt-0.5">Federal Capital</p>
              </div>
            </Link>

            {/* Ibadan — top far-right */}
            <Link
              href="/listings?city=Ibadan"
              className="relative group overflow-hidden rounded-3xl col-span-1 shadow-sm hover:shadow-2xl transition-all duration-500"
            >
              <img src="https://images.unsplash.com/photo-1553194588-ecc5e217ebf0?w=800" alt="Ibadan" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h3 className="text-lg font-bold text-white">Ibadan</h3>
                <p className="text-blue-300 text-xs font-medium mt-0.5">Cultural Centre</p>
              </div>
            </Link>

            {/* Port Harcourt — bottom center (2 cols) */}
            <Link
              href="/listings?city=Port Harcourt"
              className="relative group overflow-hidden rounded-3xl col-span-2 shadow-sm hover:shadow-2xl transition-all duration-500"
            >
              <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1000" alt="Port Harcourt" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-5 flex items-end justify-between w-full pr-10">
                <div>
                  <h3 className="text-xl font-bold text-white">Port Harcourt</h3>
                  <p className="text-blue-300 text-xs font-medium mt-0.5">Oil City Hub</p>
                </div>
              </div>
              <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 duration-300">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </Link>
          </div>

          {/* Second row — smaller cities */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-3 md:mt-4">
            {[
              { name: 'Kano', sub: 'Northern Hub', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800' },
              { name: 'Enugu', sub: 'Coal City', img: 'https://images.unsplash.com/photo-1448630360428-65456885c650?w=800' },
              { name: 'Benin City', sub: 'Ancient Kingdom', img: 'https://images.unsplash.com/photo-1613545325278-f24b0cae1224?w=800' },
              { name: 'Kaduna', sub: 'Industrial Centre', img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800' },
            ].map(loc => (
              <Link
                key={loc.name}
                href={`/listings?city=${loc.name}`}
                className="relative group overflow-hidden rounded-2xl h-36 shadow-sm hover:shadow-xl transition-all duration-500"
              >
                <img src={loc.img} alt={loc.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <h3 className="text-base font-bold text-white">{loc.name}</h3>
                  <p className="text-blue-300 text-xs font-medium">{loc.sub}</p>
                </div>
              </Link>
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
                className={`relative rounded-3xl p-8 flex flex-col gap-6 transition-all duration-300 ${
                  t.featured
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
