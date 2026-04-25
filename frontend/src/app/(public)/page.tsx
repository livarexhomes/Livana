import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PropertyCard from '@/components/public/PropertyCard'
import type { PropertyWithLandlord } from '@/lib/types/database'

export default async function HomePage() {
  const supabase = await createClient()

  // Fetch some recent properties
  const { data: recent } = await supabase
    .from('properties')
    .select('*, landlords(full_name, whatsapp, is_verified), property_images(storage_path, alt_text, is_cover)')
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(8)

  return (
    <div className="min-h-screen flex flex-col bg-white">
       {/* Hero Section */}
       <section className="relative w-full h-[500px] md:h-[600px] flex items-center justify-center text-white pt-20">
          <div className="absolute inset-0 w-full h-full z-0">
             <img src="https://images.unsplash.com/photo-1553194588-ecc5e217ebf0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwzfHxhZnJpY2FuJTIwbHV4dXJ5JTIwbWFuc2lvbnxlbnwwfHx8fDE3NzcxMzQ0NzN8MA&ixlib=rb-4.1.0&q=85" alt="Luxury Real Estate" className="w-full h-full object-cover brightness-[0.5]"/>
          </div>
          <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center mt-4 md:mt-10">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 drop-shadow-lg tracking-tight">Find your preferred property in 3 clicks not months</h1>
              <p className="text-base md:text-xl font-medium mb-10 drop-shadow-md text-gray-200">Exact Locations. Real Developers. Verified Agents.</p>

              {/* Search Box - matching Expert Listing tabs */}
              <div className="w-full bg-white rounded-2xl shadow-2xl p-4 text-gray-900 max-w-4xl mx-auto text-left">
                  <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4 mb-4">
                     {['Buy', 'Rent', 'Lease', 'Commercial'].map(tab => (
                        <button key={tab} className="px-5 py-2 font-semibold rounded-full hover:bg-gray-100 text-sm transition-colors data-[active=true]:bg-black data-[active=true]:text-white" data-active={tab === 'Buy'}>{tab}</button>
                     ))}
                  </div>

                  <form action="/listings" method="GET" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                      <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5 tracking-wider">Location</label>
                          <input name="city" type="text" placeholder="e.g. Lagos" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors" />
                      </div>
                      <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5 tracking-wider">Property Type</label>
                          <select name="type" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors appearance-none">
                              <option value="">Any</option>
                              <option value="apartment">Apartment</option>
                              <option value="detached">Detached</option>
                              <option value="terrace">Terrace</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5 tracking-wider">Beds & Baths</label>
                          <select name="beds" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-colors appearance-none">
                              <option value="">Any</option>
                              <option value="1">1+</option>
                              <option value="2">2+</option>
                              <option value="3">3+</option>
                          </select>
                      </div>
                      <div>
                          <button type="submit" className="w-full py-2.5 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors shadow-md">
                              Search
                          </button>
                      </div>
                  </form>
              </div>
          </div>
       </section>

       {/* Verified Property Listings in Nigeria (Locations grid) */}
       <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-20">
          <h2 className="text-3xl font-bold mb-8 text-gray-900 tracking-tight">Verified Property Listings for Sale & Rent in Nigeria</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <Link href="/listings?max_price=100000000" className="relative group overflow-hidden rounded-2xl h-48 md:h-[280px] col-span-2 md:col-span-2 shadow-sm">
                 <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80" alt="100 Million & Below" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                 <div className="absolute bottom-5 left-5 text-white font-bold text-2xl">100 Million & Below</div>
              </Link>
              <Link href="/listings?city=Lagos" className="relative group overflow-hidden rounded-2xl h-48 md:h-[280px] col-span-2 md:col-span-1 shadow-sm">
                 <img src="https://images.pexels.com/photos/36622013/pexels-photo-36622013.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" alt="Lagos" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                 <div className="absolute bottom-5 left-5 text-white font-bold text-xl">Lagos</div>
              </Link>
              <Link href="/listings?city=Abuja" className="relative group overflow-hidden rounded-2xl h-48 md:h-[280px] col-span-2 md:col-span-1 shadow-sm">
                 <img src="https://images.unsplash.com/photo-1567985207911-725f4e7c8926?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzV8MHwxfHNlYXJjaHwyfHxhYnVqYSUyMGNpdHl8ZW58MHx8fHwxNzc3MTM0NDY5fDA&ixlib=rb-4.1.0&q=85" alt="Abuja" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                 <div className="absolute bottom-5 left-5 text-white font-bold text-xl">Abuja</div>
              </Link>

              <Link href="/listings?city=Ibadan" className="relative group overflow-hidden rounded-2xl h-48 md:h-[280px] col-span-2 md:col-span-1 shadow-sm">
                 <img src="https://images.unsplash.com/photo-1770770155448-8461474b4e7a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHw0fHxuaWdlcmlhbiUyMGNpdHlzY2FwZXxlbnwwfHx8fDE3NzcxMzQ0ODN8MA&ixlib=rb-4.1.0&q=85" alt="Ibadan" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                 <div className="absolute bottom-5 left-5 text-white font-bold text-xl">Ibadan</div>
              </Link>
              <Link href="/listings?city=Kano" className="relative group overflow-hidden rounded-2xl h-48 md:h-[280px] col-span-2 md:col-span-1 shadow-sm">
                 <img src="https://images.pexels.com/photos/30564761/pexels-photo-30564761.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" alt="Kano" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                 <div className="absolute bottom-5 left-5 text-white font-bold text-xl">Kano</div>
              </Link>
              <Link href="/listings?city=Port-Harcourt" className="relative group overflow-hidden rounded-2xl h-48 md:h-[280px] col-span-2 md:col-span-1 shadow-sm">
                 <img src="https://images.unsplash.com/photo-1670771365139-a225fb074444?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwzfHxuaWdlcmlhbiUyMGNpdHlzY2FwZXxlbnwwfHx8fDE3NzcxMzQ0ODN8MA&ixlib=rb-4.1.0&q=85" alt="Port-Harcourt" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                 <div className="absolute bottom-5 left-5 text-white font-bold text-xl">Port-Harcourt</div>
              </Link>
              <Link href="/listings?off_plan=true" className="relative group overflow-hidden rounded-2xl h-48 md:h-[280px] col-span-2 md:col-span-1 shadow-sm">
                 <img src="https://images.unsplash.com/photo-1666623565383-2843c130873d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MTJ8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcmNoaXRlY3R1cmFsJTIwcmVuZGVyfGVufDB8fHx8MTc3NzEzNDQ3OHww&ixlib=rb-4.1.0&q=85" alt="Off-Plan Properties" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                 <div className="absolute bottom-5 left-5 text-white font-bold text-xl">Off-Plan Properties</div>
              </Link>
          </div>
       </section>

       {/* Latest Properties */}
       <section className="bg-white py-16">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Latest Properties for Sale in Nigeria</h2>
            </div>
            
            {recent && recent.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {recent.map((p) => (
                  <PropertyCard key={p.id} property={p as PropertyWithLandlord} />
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-12 text-center shadow-inner">
                <p className="text-gray-500">No properties found at the moment.</p>
              </div>
            )}
          </div>
       </section>

       {/* Snagging Banner */}
       <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-20">
          <div className="relative overflow-hidden rounded-[2rem] bg-gray-900 text-white shadow-2xl flex flex-col md:flex-row items-center min-h-[400px]">
             <div className="p-10 md:p-16 flex-1 z-10 md:w-1/2">
                <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight tracking-tight">Say goodbye to property surprises.</h2>
                <p className="text-gray-300 mb-10 max-w-lg text-lg leading-relaxed">Professional property snagging that catches defects developers hope you'll miss, ensuring your dream home meets the highest quality standards.</p>
                <Link href="/snagging" className="inline-block bg-white text-black font-bold px-10 py-4 rounded-xl hover:bg-gray-100 transition-colors shadow-lg">
                   Book Now
                </Link>
             </div>
             <div className="flex-1 w-full md:w-1/2 md:absolute md:right-0 md:top-0 md:bottom-0 relative h-64 md:h-auto">
                <img src="https://images.unsplash.com/photo-1504307651254-35680f356f27?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwxfHxob21lJTIwaW5zcGVjdGlvbnxlbnwwfHx8fDE3NzcxMzQ3MTR8MA&ixlib=rb-4.1.0&q=85" className="absolute inset-0 w-full h-full object-cover opacity-80 md:opacity-100" style={{ maskImage: 'linear-gradient(to right, transparent, black 30%)', WebkitMaskImage: '-webkit-linear-gradient(left, transparent, black 30%)' }} alt="Snagging" />
             </div>
          </div>
       </section>

    </div>
  )
}
