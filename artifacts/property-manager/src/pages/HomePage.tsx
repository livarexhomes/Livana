import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { ArrowRight, ShieldCheck, Building2 } from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import Footer from '../components/Footer'
import PropertyCard from '../components/PropertyCard'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import type { PropertyWithLandlord } from '../lib/types'

type Tab = 'Buy' | 'Rent' | 'Lease' | 'Commercial'

const typeMap: Record<Tab, string> = { Buy: 'sale', Rent: 'rent', Lease: 'lease', Commercial: 'commercial' }

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('Buy')
  const [properties, setProperties] = useState<PropertyWithLandlord[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [location, setLocation] = useState('')
  const [searchCity, setSearchCity] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setIsAuthenticated(!!user)
      if (user) {
        const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single()
        if (tenant) {
          const { data: saved } = await supabase.from('saved_properties').select('property_id').eq('tenant_id', tenant.id)
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
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative min-h-[560px] md:min-h-[680px] flex flex-col items-center justify-center px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1553194588-ecc5e217ebf0?q=85&w=1600"
            alt="Luxury Real Estate"
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-[#FAFAFA]" />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center pt-12 pb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold tracking-wide uppercase mb-8">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            </span>
            Premium Nigerian Real Estate
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-5 text-white tracking-tight leading-tight">
            Discover a place you'll<br className="hidden md:block" />
            <span className="text-[#aadb5a]"> love to live.</span>
          </h1>
          <p className="text-lg text-gray-200 mb-10 max-w-xl font-light">
            Search verified properties, connect directly with owners, and move in without the hassle.
          </p>

          {/* Search card */}
          <div className="w-full max-w-3xl bg-white rounded-3xl p-3 shadow-2xl">
            {/* Tabs */}
            <div className="flex gap-1 mb-3 bg-[#aadb5a] rounded-2xl p-1">
              {(['Buy', 'Rent', 'Lease', 'Commercial'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all ${activeTab === t ? 'bg-white text-gray-900 shadow' : 'text-gray-800/80 hover:bg-white/40'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search by city or location..."
                value={searchCity}
                onChange={e => setSearchCity(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b9e6e]"
              />
              <button type="submit" className="bg-[#0a1020] text-white px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-800 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Latest Properties */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#0a1020] tracking-tight">Newly Listed Properties</h2>
              <p className="text-[#64748b] mt-1.5 font-medium text-[15px]">Fresh opportunities from verified landlords.</p>
            </div>
            <Link
              href={`/listings?type=${typeMap[activeTab]}`}
              className="px-6 py-3 rounded-2xl bg-[#f8fafc] text-sm font-bold hover:bg-[#f1f5f9] transition-colors text-[#0f172a] whitespace-nowrap border border-gray-100"
            >
              View all properties
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="animate-spin w-8 h-8 border-4 border-[#aadb5a] border-t-transparent rounded-full"></div>
            </div>
          ) : properties.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {properties.map(p => (
                <PropertyCard key={p.id} property={p} saved={savedIds.has(p.id)} isAuthenticated={isAuthenticated} />
              ))}
            </div>
          ) : (
            <div className="bg-[#f9fafb] rounded-3xl border border-gray-50 py-24 text-center flex flex-col items-center">
              <Building2 className="w-12 h-12 text-gray-300 mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-bold text-gray-900">No properties available</h3>
              <p className="text-gray-500 mt-1 text-sm">Check back later for new listings.</p>
            </div>
          )}
        </div>
      </section>

      {/* Cities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Explore Destinations</h2>
            <p className="text-gray-500 mt-2">Find properties in Nigeria's most sought-after cities.</p>
          </div>
          <Link href="/listings" className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-600 transition-colors">
            View all
            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Lagos', query: 'Lagos', img: 'https://images.pexels.com/photos/36622013/pexels-photo-36622013.jpeg?auto=compress&cs=tinysrgb&w=800' },
            { name: 'Abuja', query: 'Abuja', img: 'https://images.unsplash.com/photo-1567985207911-725f4e7c8926?w=800' },
            { name: 'Port Harcourt', query: 'Port Harcourt', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800' },
            { name: 'Ibadan', query: 'Ibadan', img: 'https://images.unsplash.com/photo-1553194588-ecc5e217ebf0?w=800' },
          ].map(loc => (
            <Link key={loc.name} href={`/listings?city=${loc.query}`} className="relative group overflow-hidden rounded-3xl h-48 shadow-sm hover:shadow-xl transition-all duration-500">
              <img src={loc.img} alt={loc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <h3 className="absolute bottom-5 left-5 text-xl font-bold text-white">{loc.name}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-[#0A0A0A] text-white flex flex-col md:flex-row items-center min-h-[380px]">
          <div className="absolute top-0 right-0 w-full md:w-1/2 h-full z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] to-transparent z-10 hidden md:block" />
            <img src="https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=800" className="w-full h-full object-cover opacity-50" alt="Listing" />
          </div>
          <div className="relative z-20 p-8 md:p-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-widest text-gray-300 mb-6">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Platform
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              Find your next home<br />with confidence.
            </h2>
            <p className="text-gray-400 mb-8 text-base max-w-md">
              Every landlord on Livana is reviewed and approved. No agents, no hidden fees — just direct connections.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/listings" className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors text-center text-sm">
                Browse listings
              </Link>
              <Link href="/register" className="px-6 py-3 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 transition-colors text-center border border-white/10 text-sm">
                List a property
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
