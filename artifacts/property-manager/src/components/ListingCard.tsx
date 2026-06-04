import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { MapPin, BedDouble, Bath, Bookmark, ShieldCheck, Clock } from 'lucide-react'
import type { PropertyWithLandlord } from '../lib/types'
import { getSupabaseImageUrl, createClient } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  property: PropertyWithLandlord
  saved?: boolean
  isAuthenticated?: boolean
  highlighted?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  layout?: 'list' | 'grid'
}

const TYPE_LABEL: Record<string, string> = {
  sale: 'For Sale',
  rent: 'For Rent',
  lease: 'Lease',
  commercial: 'Commercial',
}

const PERIOD: Record<string, string> = {
  rent: 'yr',
  lease: 'yr',
  sale: '',
  commercial: '',
}

export default function ListingCard({
  property: p,
  saved: initialSaved = false,
  isAuthenticated = false,
  highlighted = false,
  onMouseEnter,
  onMouseLeave,
  layout = 'list',
}: Props) {
  const isGrid = layout === 'grid'
  const [, navigate] = useLocation()
  const [saved, setSaved] = useState(initialSaved)
  const [saving, setSaving] = useState(false)

  const cover = p.property_images?.find(i => i.is_cover) ?? p.property_images?.[0]
  const coverUrl = cover ? getSupabaseImageUrl(cover.storage_path) : null

  const timeAgo = formatDistanceToNow(new Date(p.created_at), { addSuffix: false })

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) { navigate('/login'); return }
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
        await supabase.from('saved_properties').insert({ tenant_id: tenant.id, property_id: p.id })
        setSaved(true)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Link
      href={`/listings/${p.id}`}
      className={`${isGrid ? 'flex-col' : 'flex'} gap-0 bg-white rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer group h-full ${
        highlighted
          ? 'border-green-500 shadow-lg shadow-green-500/10 ring-1 ring-green-500/30'
          : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Image */}
      <div className={`relative ${isGrid ? 'w-full h-48' : 'w-28 xs:w-36 sm:w-52'} shrink-0 bg-gray-100 overflow-hidden`}>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={p.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {/* Listed badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className="flex items-center gap-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold rounded-md">
            <Clock className="w-2.5 h-2.5" />
            Listed {timeAgo} ago
          </span>
        </div>
        {/* Map pin button - hide in grid mode */}
        {!isGrid && (
          <div className="absolute bottom-2.5 right-2.5">
            <span className="flex items-center justify-center w-7 h-7 bg-white/90 rounded-full shadow">
              <MapPin className="w-3.5 h-3.5 text-gray-600" />
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
        <div>
          {/* Price + save */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className={`font-extrabold text-gray-900 tracking-tight ${isGrid ? 'text-base sm:text-lg' : 'text-lg sm:text-2xl'}`}>
                ₦{Number(p.price).toLocaleString()}
              </span>
              {PERIOD[p.type] && (
                <span className="text-sm text-gray-400 ml-1">{PERIOD[p.type]}</span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`shrink-0 p-2 rounded-xl border transition-all ${
                saved
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'border-gray-200 text-gray-400 hover:border-green-500 hover:text-green-600'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 mt-1.5 text-green-600 text-sm font-medium">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{p.address ? `${p.address}, ${p.city}` : p.city}</span>
          </div>
        </div>

        {/* Specs row */}
        <div className={`flex items-center gap-3 mt-3 flex-wrap ${isGrid ? 'text-xs' : ''}`}>
          <span className="flex items-center gap-1 text-gray-600">
            <BedDouble className={`text-gray-400 ${isGrid ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            <span className="font-medium">{p.bedrooms}</span>
            <span className="text-gray-400">{isGrid ? 'Beds' : `Bed${p.bedrooms !== 1 ? 's' : ''}`}</span>
          </span>
          {!isGrid && <span className="w-px h-4 bg-gray-200" />}
          <span className="flex items-center gap-1 text-gray-600">
            <Bath className={`text-gray-400 ${isGrid ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            <span className="font-medium">{p.bathrooms}</span>
            <span className="text-gray-400">{isGrid ? 'Baths' : 'Bath'}</span>
          </span>
          {!isGrid && <span className="w-px h-4 bg-gray-200" />}
          <span className={`bg-gray-100 text-gray-600 font-semibold rounded-md capitalize ${isGrid ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}>
            {TYPE_LABEL[p.type] ?? p.type}
          </span>
          {!isGrid && p.area_sqft && (
            <>
              <span className="w-px h-4 bg-gray-200" />
              <span className="text-xs text-gray-400">{p.area_sqft.toLocaleString()} sqft</span>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between ${isGrid ? 'mt-2 pt-2' : 'mt-3 pt-3'} border-t border-gray-50`}>
          <div className={`flex items-center gap-1.5 text-gray-500 ${isGrid ? 'text-[10px]' : 'text-xs'}`}>
            {p.landlords?.is_verified ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                <span className="text-green-700 font-semibold">{isGrid ? 'Verified' : 'Verified Owner'}</span>
              </>
            ) : (
              <span>{isGrid ? 'Owner Agent' : "Direct to Owner's Agent"}</span>
            )}
          </div>
          {p.featured && (
            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md border border-amber-200 uppercase tracking-wide">
              Featured
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
