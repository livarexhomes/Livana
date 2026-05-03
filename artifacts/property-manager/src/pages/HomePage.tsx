import { useState, useEffect, useRef } from 'react'
import { Link } from 'wouter'
import { ArrowRight, ShieldCheck, Building2, Users, TrendingUp, Star, CheckCircle2, CheckCircle, MapPin, ChevronRight } from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import Footer from '../components/Footer'
import PropertyCard from '../components/PropertyCard'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import type { PropertyWithLandlord } from '../lib/types'

type Tab = 'Buy' | 'Rent' | 'Lease' | 'Commercial'
const typeMap: Record<Tab, string> = { Buy: 'sale', Rent: 'rent', Lease: 'lease', Commercial: 'commercial' }

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
  const [activeTab, setActiveTab] = useState<Tab>('Buy')
  const [properties, setProperties] = useState<PropertyWithLandlord[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [searchCity, setSearchCity] = useState('')

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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('type', typeMap[activeTab])
    if (searchCity) params.set('city', searchCity)
    window.location.href = `/listings?${params.toString()}`
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />

      {/* ── HERO ── */}
      <section className="relative min-h-screen bg-white flex overflow-hidden">
        {/* Left Column */}
        <div className="w-full lg:w-[55%] flex flex-col justify-center px-6 sm:px-10 lg:px-16 xl:px-24 pt-28 pb-16 lg:py-0">
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
            <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgb(0,0,0,0.09)] border border-gray-100 p-3 mb-12">
              <div className="flex gap-1 mb-1 px-1 pt-1 pb-3 border-b border-gray-100">
                {(['Buy', 'Rent', 'Lease', 'Commercial'] as Tab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      activeTab === t
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-400 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 p-1 pt-3">
                <div className="relative flex-1">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Lagos, Abuja, Port Harcourt…"
                    value={searchCity}
                    onChange={e => setSearchCity(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm text-gray-900 placeholder-gray-400"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-7 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/25 whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  Search
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
        <div className="hidden lg:block lg:w-[45%] h-screen relative p-4 pl-0">
          <div className="w-full h-full relative rounded-l-[3rem] overflow-hidden shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1400&q=85"
              alt="Modern luxury home"
              className="w-full h-full object-cover"
            />
            {/* Verified badge */}
            <div className="absolute top-8 right-8 bg-white/95 backdrop-blur-sm shadow-xl rounded-full px-4 py-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-gray-900">Verified Landlord</span>
            </div>
            {/* Property card */}
            <div className="absolute bottom-12 left-8 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl p-6 w-72 border border-white/30">
              <div className="bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-block mb-3">
                Just Listed
              </div>
              <h3 className="font-bold text-base text-gray-900 mb-1">3 Bed Detached • Lekki</h3>
              <p className="text-blue-600 font-extrabold text-xl mb-4">
                ₦4,500,000<span className="text-sm text-gray-400 font-normal">/yr</span>
              </p>
              <Link
                href="/listings"
                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                View Listings <ArrowRight className="w-4 h-4" />
              </Link>
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
            {(['Buy', 'Rent', 'Lease', 'Commercial'] as Tab[]).map(t => (
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
            ))}
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
        </div>
      </section>

      {/* ── CITIES ── */}
      <section className="bg-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-2">Top Locations</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Explore by City</h2>
              <p className="text-gray-500 mt-2">Nigeria's most sought-after real estate markets.</p>
            </div>
            <Link href="/listings" className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group">
              View all cities
              <span className="w-8 h-8 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-[200px_160px_160px_140px] md:grid-rows-[280px_200px] gap-3 md:gap-4">
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
              { name: 'Adebayo O.', role: 'Tenant', city: 'Lagos', text: 'Found my perfect 3-bedroom in Lekki within a week. The landlord verification gave me total peace of mind. Absolutely recommend Livana!', avatar: 'AO', featured: false },
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
                  Join over 10,000 Nigerians who've found their ideal property on Livana. Start your search today — it's completely free.
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
