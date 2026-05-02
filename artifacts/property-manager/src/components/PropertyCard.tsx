import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { MapPin, BedDouble, Bath, Heart } from 'lucide-react'
import type { PropertyWithLandlord } from '../lib/types'
import { getSupabaseImageUrl } from '../lib/supabase'
import { createClient } from '../lib/supabase'

interface PropertyCardProps {
  property: PropertyWithLandlord
  saved?: boolean
  isAuthenticated?: boolean
}

export default function PropertyCard({ property: p, saved: initialSaved = false, isAuthenticated = false }: PropertyCardProps) {
  const [, navigate] = useLocation()
  const [saved, setSaved] = useState(initialSaved)
  const [saving, setSaving] = useState(false)

  const cover = p.property_images?.find(i => i.is_cover) ?? p.property_images?.[0]
  const coverUrl = cover ? getSupabaseImageUrl(cover.storage_path) : null

  const typeLabel: Record<string, string> = {
    sale: 'For Sale',
    rent: 'For Rent',
    lease: 'Lease',
    commercial: 'Commercial',
  }

  const typeBadgeColors: Record<string, string> = {
    sale: 'bg-blue-600 text-white',
    rent: 'bg-indigo-600 text-white',
    lease: 'bg-violet-600 text-white',
    commercial: 'bg-slate-700 text-white',
  }

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single() as { data: { id: string } | null }
      if (!tenant) { navigate('/user'); return }
      if (saved) {
        await supabase.from('saved_properties').delete().eq('tenant_id', tenant.id).eq('property_id', p.id)
        setSaved(false)
      } else {
        await (supabase.from('saved_properties').insert({ tenant_id: tenant.id, property_id: p.id }) as unknown as Promise<unknown>)
        setSaved(true)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Link href={`/listings/${p.id}`} className="block group bg-white rounded-2xl overflow-hidden border border-gray-100 card-hover shadow-sm">
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700" style={{ '--tw-scale-x': 'var(--scale)', '--tw-scale-y': 'var(--scale)' } as React.CSSProperties} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <svg className="w-14 h-14 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )}

        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide rounded-lg shadow-sm ${typeBadgeColors[p.type] ?? 'bg-gray-800 text-white'}`}>
            {typeLabel[p.type] ?? p.type}
          </span>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`absolute top-3 right-3 p-2.5 rounded-xl shadow-md transition-all ${
            saved
              ? 'bg-red-500 text-white shadow-red-500/30'
              : 'bg-white/95 text-gray-400 hover:text-red-500 hover:scale-110'
          }`}
        >
          <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
        </button>

        {p.landlords?.is_verified && (
          <div className="absolute bottom-3 left-3">
            <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-sm shadow-blue-600/30">
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-2xl font-bold text-gray-900 tracking-tight">₦{Number(p.price).toLocaleString()}</p>
        </div>
        <p className="text-sm font-semibold text-gray-800 truncate">{p.title}</p>
        <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-blue-400" />
          <span className="truncate">{p.city}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-4 pt-4 border-t border-gray-50">
          <span className="flex items-center gap-1.5">
            <BedDouble className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-gray-700">{p.bedrooms}</span>
            <span className="text-xs text-gray-400">bed{p.bedrooms !== 1 ? 's' : ''}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Bath className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-gray-700">{p.bathrooms}</span>
            <span className="text-xs text-gray-400">bath</span>
          </span>
          {p.area_sqft && (
            <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">
              {p.area_sqft.toLocaleString()} sqft
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
