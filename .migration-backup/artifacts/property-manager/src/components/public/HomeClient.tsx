'use client'

import { useState } from 'react'
import HeroSearch from '@/components/public/HeroSearch'
import LatestProperties from '@/components/public/LatestProperties'
import type { PropertyWithLandlord } from '@/lib/types/database'

type Tab = 'Buy' | 'Rent' | 'Lease' | 'Commercial'

/**
 * Owns the active tab state so that selecting a tab in HeroSearch
 * immediately filters the LatestProperties section below.
 */
export default function HomeClient({
  initialProperties,
  initialSavedIds = [],
  isAuthenticated = false,
  heroSlot,
}: {
  initialProperties: PropertyWithLandlord[]
  /** Property IDs the current user has saved (serialisable for RSC → client boundary). */
  initialSavedIds?: string[]
  isAuthenticated?: boolean
  heroSlot: React.ReactNode
}) {
  const [activeTab, setActiveTab] = useState<Tab>('Buy')

  return (
    <>
      {/* Hero — background/text from server, search card injected here */}
      <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        {heroSlot}
        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center mt-auto">
          <HeroSearch activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </section>

      {/* Listings — reacts to tab selection in the hero search */}
      <LatestProperties
        initialProperties={initialProperties}
        initialSavedIds={initialSavedIds}
        isAuthenticated={isAuthenticated}
        activeTab={activeTab}
      />
    </>
  )
}
