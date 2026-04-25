'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PropertyCard from '@/components/public/PropertyCard'
import type { PropertyWithLandlord } from '@/lib/types/database'
import { Building2 } from 'lucide-react'

export default function LatestProperties({ initialProperties }: { initialProperties: PropertyWithLandlord[] }) {
  const [tab, setTab] = useState<'Buy' | 'Rent' | 'Lease' | 'Commercial'>('Buy')
  const [properties, setProperties] = useState<PropertyWithLandlord[]>(initialProperties)
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  
  // Use useMemo or state for client to avoid hydration mismatch if needed
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    if (initialLoad) {
      setInitialLoad(false)
      if (tab === 'Buy') return // skip fetch if it's the initial load and tab is 'Buy'
    }

    async function fetchProperties() {
      setLoading(true)
      const typeMap: Record<string, string> = {
        'Buy': 'sale',
        'Rent': 'rent',
        'Lease': 'lease',
        'Commercial': 'commercial'
      }
      
      try {
        const { data } = await supabase
          .from('properties')
          .select('*, landlords(full_name, whatsapp, is_verified), property_images(storage_path, alt_text, is_cover)')
          .eq('status', 'available')
          .eq('type', typeMap[tab])
          .order('created_at', { ascending: false })
          .limit(8)
          
        setProperties((data as PropertyWithLandlord[]) || [])
      } catch (e) {
        setProperties([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchProperties()
  }, [tab, supabase]) // removed initialLoad from deps to avoid re-triggering

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6">
        
        {/* Green Tabs */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-[#aadb5a] rounded-[2.5rem] p-1.5 shadow-sm overflow-x-auto max-w-full no-scrollbar border border-[#a2d354]">
            {(['Buy', 'Rent', 'Lease', 'Commercial'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 md:px-8 py-2.5 rounded-[2rem] text-[15px] md:text-[16px] font-bold transition-all whitespace-nowrap ${
                  tab === t
                    ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] text-[#0f172a]'
                    : 'text-[#0f172a]/80 hover:bg-white/40'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Heading & View All Button */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0a1020] tracking-tight">Newly Listed Properties</h2>
            <p className="text-[#64748b] mt-1.5 font-medium text-[15px]">Fresh opportunities from verified landlords.</p>
          </div>
          <Link 
            href={`/listings?type=${tab.toLowerCase() === 'buy' ? 'sale' : tab.toLowerCase()}`} 
            className="px-6 py-3 rounded-[1.25rem] bg-[#f8fafc] text-[14px] font-bold hover:bg-[#f1f5f9] transition-colors text-[#0f172a] whitespace-nowrap self-start sm:self-auto border border-gray-100"
          >
            View all properties
          </Link>
        </div>
        
        {/* Properties Grid or Empty State */}
        {loading ? (
          <div className="bg-[#fcfcfd] rounded-[2.5rem] border border-[#f1f5f9] p-24 text-center flex items-center justify-center min-h-[400px]">
            <div className="animate-spin w-8 h-8 border-4 border-[#aadb5a] border-t-transparent rounded-full"></div>
          </div>
        ) : properties.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        ) : (
          <div className="bg-[#f9fafb] rounded-[2.5rem] border border-gray-50 py-28 px-4 text-center flex flex-col items-center justify-center min-h-[400px] shadow-[inset_0_2px_10px_rgba(0,0,0,0.01)]">
            <div className="w-[64px] h-[64px] bg-white rounded-full shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center justify-center mb-6">
              <Building2 className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
            </div>
            <h3 className="text-[20px] font-bold text-[#0a1020] tracking-tight">No properties available</h3>
            <p className="text-[#64748b] mt-1.5 text-sm font-medium">Check back later for new listings.</p>
          </div>
        )}
      </div>
    </section>
  )
}
