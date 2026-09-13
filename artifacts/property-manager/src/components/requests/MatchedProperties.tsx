import { ArrowUpRight, Search } from 'lucide-react'
import ListingCard from '@/components/property/ListingCard'
import type { PropertyRequestMatchWithProperty } from '@/types'

interface MatchedPropertiesProps {
  matches: PropertyRequestMatchWithProperty[]
  isAuthenticated?: boolean
}

export default function MatchedProperties({ matches, isAuthenticated = true }: MatchedPropertiesProps) {
  if (!matches || matches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
          <Search className="h-5 w-5 text-blue-600" />
        </div>
        <p className="text-sm font-semibold text-gray-900">We're still searching for properties that fit your request.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">Matched Properties</h3>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{matches.length}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {matches.map(match => (
          <div key={match.id} className="rounded-2xl border border-gray-100 bg-white p-1 shadow-sm">
            <ListingCard
              property={match.properties}
              saved={false}
              isAuthenticated={isAuthenticated}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
