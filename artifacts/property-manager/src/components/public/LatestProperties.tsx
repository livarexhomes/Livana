'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import PropertyCard from '@/components/public/PropertyCard'
import type { PropertyWithLandlord } from '@/lib/types/database'
import { Building2 } from 'lucide-react'

type Tab = 'Buy' | 'Rent' | 'Lease' | 'Commercial'

export default function LatestProperties({
  initialProperties,
  initialSavedIds = [],
  isAuthenticated = false,
  activeTab,
}: {
  initialProperties: PropertyWithLandlord[]
  /** Property IDs saved by the current user (for the initial server-fetched tab). */
  initialSavedIds?: string[]
  isAuthenticated?: boolean
  activeTab: Tab
}) {
  const tab = activeTab
  const [properties, setProperties] = useState<PropertyWithLandlord[]>(initialProperties)
  // savedIds only applies to the initial server-fetched batch; client-fetched
  // tabs default to unsaved (clicking save will redirect unauthenticated users).
  const savedSet = new Set(initialSavedIds)
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

  // Only instantiate the client when Supabase is configured to avoid a
  // hard crash when env vars are absent (e.g. local dev without .env.local).
  const [supabase] = useState(() => isSupabaseConfigured() ? createClient() : null)

  useEffect(() => {
    if (initialLoad) {
      setInitialLoad(false)
      if (tab === 'Buy') return // server already fetched Buy listings as initialProperties
    }

    if (!supabase) return // Supabase not configured — keep showing initialProperties

    async function fetchProperties() {
      setLoading(true)
      const typeMap: Record<string, string> = {
        'Buy': 'sale',
        'Rent': 'rent',
        'Lease': 'lease',
        'Commercial': 'commercial'
      }
      
      try {
        const { data } = await supabase!
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
  }, [tab, supabase])

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6">
        
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
              <PropertyCard
                key={p.id}
                property={p}
                saved={savedSet.has(p.id)}
                isAuthenticated={isAuthenticated}
              />
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
