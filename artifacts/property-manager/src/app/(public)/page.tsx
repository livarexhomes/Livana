import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import HeroSearch from '@/components/public/HeroSearch'
import LatestProperties from '@/components/public/LatestProperties'
import type { PropertyWithLandlord } from '@/lib/types/database'
import { ArrowRight, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function fetchRecent(): Promise<PropertyWithLandlord[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('properties')
      .select('*, landlords(full_name, whatsapp, is_verified), property_images(storage_path, alt_text, is_cover)')
      .eq('status', 'available')
      .eq('type', 'sale')
      .order('created_at', { ascending: false })
      .limit(8)
    return (Array.isArray(data) ? data : []) as PropertyWithLandlord[]
  } catch {
    return []
  }
}

export default async function HomePage() {
  const recent = await fetchRecent()

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-slate-900 font-sans selection:bg-black selection:text-white">
      
      {/* --- HERO SECTION --- */}
      <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        {/* Background Image & Overlays */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1553194588-ecc5e217ebf0?q=85&fm=jpg&crop=entropy&cs=srgb" 
            alt="Luxury Real Estate" 
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-[#FAFAFA]" />
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center mt-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold tracking-wide uppercase mb-8 shadow-2xl">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            </span>
            Premium Nigerian Real Estate
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white tracking-tighter leading-[1.05] text-balance drop-shadow-lg">
            Discover a place you&apos;ll <br className="hidden md:block" /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">love to live.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-200 mb-12 max-w-2xl font-light text-balance drop-shadow-md">
            Seamlessly search verified properties, connect directly with owners, and move in without the hassle.
          </p>

          {/* Client-side Search Component */}
          <HeroSearch />
        </div>
      </section>

      {/* --- FEATURED LOCATIONS --- */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Explore Destinations</h2>
            <p className="text-gray-500 mt-2 font-medium">Find properties in Nigeria&apos;s most sought-after cities.</p>
          </div>
          <Link href="/listings" className="group flex items-center gap-2 text-sm font-semibold text-black hover:text-gray-600 transition-colors">
            View all locations
            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[220px] md:auto-rows-[280px]">
          {/* Main Large Card */}
          <Link href="/listings?max_price=100000000" className="relative group overflow-hidden rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500 sm:col-span-2 sm:row-span-2">
            <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200" alt="Premium Deals" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90"></div>
            <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/80 mb-2">Curated Selection</p>
                <h3 className="text-3xl font-bold text-white tracking-tight">Premium Deals <br/>Under 100M</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>

          {/* Standard Cards */}
          {[
            { name: 'Lagos', query: 'Lagos', img: 'https://images.pexels.com/photos/36622013/pexels-photo-36622013.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940' },
            { name: 'Abuja', query: 'Abuja', img: 'https://images.unsplash.com/photo-1567985207911-725f4e7c8926?crop=entropy&cs=srgb' },
            { name: 'Port Harcourt', query: 'Port-Harcourt', img: 'https://images.unsplash.com/photo-1670771365139-a225fb074444?crop=entropy&cs=srgb' },
            { name: 'Off-Plan', query: '', param: 'off_plan=true', img: 'https://images.unsplash.com/photo-1666623565383-2843c130873d?crop=entropy&cs=srgb' }
          ].map((loc, i) => (
            <Link key={i} href={`/listings?${loc.param ? loc.param : `city=${loc.query}`}`} className="relative group overflow-hidden rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500">
              <img src={loc.img} alt={loc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90"></div>
              <div className="absolute bottom-6 left-6">
                <h3 className="text-xl font-bold text-white tracking-tight">{loc.name}</h3>
              </div>
              <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                <ArrowRight className="w-4 h-4 -rotate-45" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* --- LATEST LISTINGS CLIENT COMPONENT --- */}
      <LatestProperties initialProperties={recent} />

      {/* --- SNAGGING BANNER --- */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-24">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0A0A0A] text-white flex flex-col md:flex-row items-center min-h-[450px]">
          {/* Background Elements */}
          <div className="absolute top-0 right-0 w-full md:w-1/2 h-full z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent z-10 hidden md:block"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent z-10 md:hidden"></div>
            <img src="https://images.unsplash.com/photo-1504307651254-35680f356f27?q=85&fm=jpg&crop=entropy" className="w-full h-full object-cover opacity-60" alt="Home Inspection" />
          </div>

          {/* Content */}
          <div className="relative z-20 p-8 md:p-16 lg:p-20 flex-1 md:w-1/2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-widest text-gray-300 mb-6">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Expert Snagging
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-[1.1] tracking-tight text-balance">
              Don&apos;t let hidden defects ruin your investment.
            </h2>
            <p className="text-gray-400 mb-10 text-lg leading-relaxed max-w-md font-light text-balance">
              Our professional inspectors catch what developers hope you&apos;ll miss. Get a comprehensive 150+ point quality report before you sign.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/snagging" className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors text-center">
                Book an Inspection
              </Link>
              <Link href="/about-snagging" className="w-full sm:w-auto px-8 py-4 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 transition-colors text-center border border-white/10">
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
