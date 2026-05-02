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
      const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single()
      if (!tenant) { navigate('/user'); return }
      if (saved) {
        await supabase.from('saved_properties').delete().eq('tenant_id', tenant.id).eq('property_id', p.id)
        setSaved(false)
      } else {
        await supabase.from('saved_properties').insert({ tenant_id: tenant.id, property_id: p.id })
        setSaved(true)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Link href={`/listings/${p.id}`} className="block group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300">
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 bg-white/95 text-gray-800 text-[11px] font-bold uppercase tracking-wider rounded-full shadow-sm">
            {typeLabel[p.type] ?? p.type}
          </span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`absolute top-3 right-3 p-2 rounded-full shadow-sm transition-all ${
            saved ? 'bg-red-500 text-white' : 'bg-white/95 text-gray-400 hover:text-red-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
        </button>
        {p.landlords?.is_verified && (
          <div className="absolute bottom-3 left-3">
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#aadb5a] text-gray-900 text-[10px] font-bold rounded-full">
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="text-xl font-bold text-gray-900">₦{Number(p.price).toLocaleString()}</p>
        <p className="text-sm font-medium text-gray-700 truncate mt-0.5">{p.title}</p>
        <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{p.city}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1.5"><BedDouble className="w-4 h-4" />{p.bedrooms} bed{p.bedrooms !== 1 ? 's' : ''}</span>
          <span className="flex items-center gap-1.5"><Bath className="w-4 h-4" />{p.bathrooms} bath</span>
          {p.area_sqft && <span className="ml-auto text-xs text-gray-400">{p.area_sqft.toLocaleString()} sqft</span>}
        </div>
      </div>
    </Link>
  )
}
