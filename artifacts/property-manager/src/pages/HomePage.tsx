import { useState, useEffect, useRef } from 'react'
import { Link } from 'wouter'
import { ArrowRight, ShieldCheck, Building2, Users, TrendingUp, Star, CheckCircle2, MapPin, ChevronRight } from 'lucide-react'
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
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden hero-gradient">
        {/* Dot grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-60" />

        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-float pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-400/15 rounded-full blur-3xl animate-float-delayed pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-800/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 flex flex-col items-center text-center pt-28 pb-20">

          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/8 backdrop-blur border border-white/15 text-white text-xs font-semibold tracking-widest uppercase mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
            </span>
            Nigeria's #1 Property Platform
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6 max-w-4xl">
            Find Your Dream{' '}
            <span className="text-gradient">Property</span>
            <br />in Nigeria
          </h1>

          <p className="text-lg md:text-xl text-blue-100/70 mb-12 max-w-2xl font-light leading-relaxed">
            Search thousands of verified properties across Nigeria's top cities.
            Connect directly with landlords — no agents, no hidden fees.
          </p>

          {/* Search Card */}
          <div className="w-full max-w-3xl bg-white/8 backdrop-blur-2xl rounded-3xl p-2 border border-white/15 shadow-2xl mb-14">
            {/* Tab row */}
            <div className="flex gap-1 mb-2 p-1">
              {(['Buy', 'Rent', 'Lease', 'Commercial'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    activeTab === t
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <form onSubmit={handleSearch} className="flex gap-2 p-1">
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by city, state or neighbourhood..."
                  value={searchCity}
                  onChange={e => setSearchCity(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder-gray-400 font-medium shadow-sm"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-7 py-3.5 rounded-2xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 whitespace-nowrap flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Search
              </button>
            </form>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {[
              { value: 2400, suffix: '+', label: 'Properties Listed' },
              { value: 850, suffix: '+', label: 'Verified Landlords' },
              { value: 12, suffix: '', label: 'Cities Covered' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <p className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </p>
                <p className="text-blue-300/70 text-sm mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
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

      {/* ── HOW IT WORKS ── */}
      <section className="bg-white py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-16">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">How Livana Works</h2>
            <p className="text-gray-500 mt-3 text-base max-w-xl mx-auto">Finding your ideal property has never been this simple. Three easy steps to get you home.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: '🔍',
                title: 'Search & Filter',
                desc: 'Browse thousands of verified listings by city, price, type, and size. Find exactly what you\'re looking for in seconds.',
              },
              {
                step: '02',
                icon: '🤝',
                title: 'Connect Directly',
                desc: 'Contact verified landlords instantly via WhatsApp or enquiry. No agents, no delays — just real conversations.',
              },
              {
                step: '03',
                icon: '🏠',
                title: 'Move In',
                desc: 'Schedule your viewing, seal the deal, and move into your new home with complete peace of mind.',
              },
            ].map((item, i) => (
              <div key={i} className="group relative bg-gray-50 hover:bg-blue-600 rounded-3xl p-8 transition-all duration-300 overflow-hidden">
                <div className="absolute top-6 right-6 text-7xl font-black text-gray-100 group-hover:text-blue-500/20 transition-colors leading-none select-none">
                  {item.step}
                </div>
                <div className="text-4xl mb-5">{item.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-white mb-3 transition-colors">{item.title}</h3>
                <p className="text-gray-500 group-hover:text-blue-100 text-sm leading-relaxed transition-colors">{item.desc}</p>
                <div className="mt-6 flex items-center gap-2 text-blue-600 group-hover:text-white font-semibold text-sm transition-colors">
                  Learn more <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CITIES ── */}
      <section className="bg-gray-50 py-20 md:py-28">
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
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Lagos', sub: 'Commercial Capital', img: 'https://images.pexels.com/photos/36622013/pexels-photo-36622013.jpeg?auto=compress&cs=tinysrgb&w=800' },
              { name: 'Abuja', sub: 'Federal Capital', img: 'https://images.unsplash.com/photo-1567985207911-725f4e7c8926?w=800' },
              { name: 'Port Harcourt', sub: 'Oil City Hub', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800' },
              { name: 'Ibadan', sub: 'Cultural Centre', img: 'https://images.unsplash.com/photo-1553194588-ecc5e217ebf0?w=800' },
            ].map(loc => (
              <Link
                key={loc.name}
                href={`/listings?city=${loc.name}`}
                className="relative group overflow-hidden rounded-3xl h-56 shadow-sm hover:shadow-2xl transition-all duration-500"
              >
                <img src={loc.img} alt={loc.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-5 left-5">
                  <h3 className="text-xl font-bold text-white">{loc.name}</h3>
                  <p className="text-blue-300 text-xs font-medium mt-0.5">{loc.sub}</p>
                </div>
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 duration-300">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="bg-white py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Trusted by Thousands</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Adebayo O.', role: 'Tenant • Lagos', text: 'Found my perfect 3-bedroom in Lekki within a week. The landlord verification gave me total peace of mind. Absolutely recommend Livana!', avatar: 'AO', stars: 5 },
              { name: 'Chidinma E.', role: 'Landlord • Abuja', text: 'Listed my property on a Friday, had 3 serious enquiries by Monday. The platform is slick and my tenants are quality people.', avatar: 'CE', stars: 5 },
              { name: 'Emeka N.', role: 'Tenant • Port Harcourt', text: 'No agent stress, no fake listings. I contacted the landlord directly on WhatsApp and moved in within two weeks. Game changer.', avatar: 'EN', stars: 5 },
            ].map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-3xl p-7 flex flex-col gap-5 hover:shadow-lg transition-shadow duration-300 border border-gray-100">
                <div className="flex gap-1">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md shadow-blue-600/20">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-gray-400 text-xs">{t.role}</p>
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
          <div className="relative overflow-hidden rounded-[2rem] hero-gradient grid-pattern">
            {/* Glowing elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

            <div className="relative z-10 p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 text-xs font-semibold uppercase tracking-widest text-blue-300 mb-6">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Platform
                </div>
                <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
                  Ready to find your<br />perfect home?
                </h2>
                <p className="text-blue-100/70 text-base leading-relaxed mb-8 max-w-md">
                  Join over 10,000 Nigerians who've found their ideal property on Livana. Start your search today — it's completely free.
                </p>
                <ul className="space-y-2 mb-8">
                  {['Verified landlords only', 'Zero agent fees', 'Direct WhatsApp contact'].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-blue-100/80 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/listings" className="px-7 py-3.5 bg-white text-blue-700 font-bold rounded-2xl hover:bg-blue-50 transition-all text-center text-sm shadow-xl hover:shadow-white/20">
                    Browse Listings
                  </Link>
                  <Link href="/register" className="px-7 py-3.5 bg-blue-600/30 text-white font-semibold rounded-2xl hover:bg-blue-600/50 transition-all text-center border border-white/15 text-sm">
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
                  <div key={item.label} className="bg-white/8 backdrop-blur border border-white/12 rounded-2xl px-6 py-5 text-center hover:bg-white/12 transition-all">
                    <p className="text-2xl font-extrabold text-white">{item.num}</p>
                    <p className="text-blue-300/70 text-xs mt-1 font-medium">{item.label}</p>
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
