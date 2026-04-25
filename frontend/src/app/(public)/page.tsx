import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PropertyCard from '@/components/public/PropertyCard'
import type { PropertyWithLandlord } from '@/lib/types/database'
import { Search, MapPin, Home, BedDouble, ArrowRight, CheckCircle2 } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: recent } = await supabase
    .from('properties')
    .select('*, landlords(full_name, whatsapp, is_verified), property_images(storage_path, alt_text, is_cover)')
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(8)

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFDFD] text-slate-900">
      {/* --- HERO SECTION --- */}
      <section className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Background with subtle zoom effect */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1553194588-ecc5e217ebf0?q=85&fm=jpg&crop=entropy&cs=srgb" 
            alt="Luxury Real Estate" 
            className="w-full h-full object-cover brightness-[0.45] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#FDFDFD]" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-medium mb-6 animate-fade-in">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Over 2,500+ Verified Properties Available
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 text-white tracking-tight leading-[1.1]">
            Find your dream home <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">
              in 3 clicks, not months.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl font-light">
            Exact Locations. Real Developers. Verified Agents. <br className="hidden md:block" />
            The most transparent real estate experience in Nigeria.
          </p>

          {/* SEARCH BOX - SLEEK DESIGN */}
          <div className="w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-2 md:p-3">
            <div className="flex flex-wrap gap-1 p-1 mb-2">
              {['Buy', 'Rent', 'Lease', 'Shortlet'].map((tab) => (
                <button 
                  key={tab} 
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${tab === 'Buy' ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <form action="/listings" method="GET" className="flex flex-col md:flex-row items-center gap-2">
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-2 px-4">
                <div className="flex flex-col items-start border-r border-gray-100 last:border-0 py-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
                    <MapPin size={12} /> Location
                  </label>
                  <input name="city" type="text" placeholder="Where are you looking?" className="w-full bg-transparent border-none text-sm focus:ring-0 placeholder:text-gray-400 font-medium" />
                </div>
                
                <div className="flex flex-col items-start border-r border-gray-100 last:border-0 py-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
                    <Home size={12} /> Property Type
                  </label>
                  <select name="type" className="w-full bg-transparent border-none text-sm focus:ring-0 font-medium appearance-none cursor-pointer">
                    <option value="">All Types</option>
                    <option value="apartment">Modern Apartment</option>
                    <option value="detached">Detached Duplex</option>
                    <option value="terrace">Terrace Building</option>
                  </select>
                </div>

                <div className="flex flex-col items-start py-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">
                    <BedDouble size={12} /> Bedrooms
                  </label>
                  <select name="beds" className="w-full bg-transparent border-none text-sm focus:ring-0 font-medium appearance-none cursor-pointer">
                    <option value="">Any Size</option>
                    <option value="1">1+ Bedrooms</option>
                    <option value="2">2+ Bedrooms</option>
                    <option value="4">4+ Bedrooms</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full md:w-auto px-10 py-4 bg-black text-white rounded-[1.5rem] font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] active:scale-95">
                <Search size={18} />
                <span>Search</span>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* --- LOCATION BENTO GRID --- */}
      <section className="max-w-7xl mx-auto w-full px-6 py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">Destinations</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-2 tracking-tight">Explore Top Locations</h2>
          </div>
          <Link href="/listings" className="group flex items-center gap-2 text-sm font-bold border-b-2 border-black pb-1 hover:text-gray-600 transition-colors">
            View all cities <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[240px]">
          <LocationCard href="/listings?max_price=100000000" title="Premium Deals" subtitle="Under 100M" img="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800" className="col-span-2 md:row-span-2" />
          <LocationCard href="/listings?city=Lagos" title="Lagos" subtitle="1.2k+ Properties" img="https://images.pexels.com/photos/36622013/pexels-photo-36622013.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" />
          <LocationCard href="/listings?city=Abuja" title="Abuja" subtitle="800+ Properties" img="https://images.unsplash.com/photo-1567985207911-725f4e7c8926?crop=entropy&cs=srgb" />
          <LocationCard href="/listings?city=Port-Harcourt" title="PH City" subtitle="450+ Properties" img="https://images.unsplash.com/photo-1670771365139-a225fb074444?crop=entropy&cs=srgb" />
          <LocationCard href="/listings?off_plan=true" title="Off-Plan" subtitle="New Developments" img="https://images.unsplash.com/photo-1666623565383-2843c130873d?crop=entropy&cs=srgb" className="md:col-span-2" />
        </div>
      </section>

      {/* --- LATEST LISTINGS --- */}
      <section className="bg-[#F8F9FA] py-24">
        <div className="max-w-7xl mx-auto w-full px-6">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Latest Residences</h2>
            <div className="flex gap-2">
               {/* Custom scroll buttons could go here */}
            </div>
          </div>
          
          {recent && recent.length > 0 ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {recent.map((p) => (
                <PropertyCard key={p.id} property={p as PropertyWithLandlord} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 p-20 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Home className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">New properties arriving soon. Stay tuned.</p>
            </div>
          )}
        </div>
      </section>

      {/* --- SNAGGING BANNER --- */}
      <section className="max-w-7xl mx-auto w-full px-6 py-24">
        <div className="relative overflow-hidden rounded-[3rem] bg-zinc-900 text-white min-h-[500px] flex items-center">
          <div className="relative z-20 p-8 md:p-20 md:w-3/5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-widest mb-6">
              <CheckCircle2 size={20} /> Professional Inspections
            </div>
            <h2 className="text-4xl md:text-6xl font-extrabold mb-8 leading-tight tracking-tight">
              Say goodbye to property surprises.
            </h2>
            <p className="text-zinc-400 mb-12 text-lg md:text-xl leading-relaxed max-w-lg">
              Our professional snagging catches defects developers hope you'll miss. 
              <strong> 150+ point inspection</strong> guaranteed.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/snagging" className="px-10 py-5 bg-white text-black font-bold rounded-2xl hover:bg-emerald-50 transition-all shadow-xl hover:scale-105 active:scale-95">
                Book Inspection Now
              </Link>
              <div className="flex -space-x-3 items-center ml-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-zinc-700 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" />
                  </div>
                ))}
                <span className="pl-6 text-sm text-zinc-400 font-medium">Joined by 200+ owners this month</span>
              </div>
            </div>
          </div>
          
          <div className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 z-10">
             <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-900/40 to-transparent z-20" />
             <img 
               src="https://images.unsplash.com/photo-1504307651254-35680f356f27?q=85&fm=jpg&crop=entropy" 
               className="w-full h-full object-cover" 
               alt="Snagging" 
             />
          </div>
        </div>
      </section>
    </div>
  )
}

/* Helper Component for Location Grid */
function LocationCard({ title, subtitle, img, href, className = "" }: { title: string, subtitle: string, img: string, href: string, className?: string }) {
  return (
    <Link href={href} className={`relative group overflow-hidden rounded-[2rem] shadow-sm transition-all duration-500 hover:shadow-2xl ${className}`}>
      <img src={img} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-8 left-8 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 mb-1">{subtitle}</p>
        <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
      </div>
      <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all duration-300">
        <ArrowRight size={20} className="text-white" />
      </div>
    </Link>
  )
}