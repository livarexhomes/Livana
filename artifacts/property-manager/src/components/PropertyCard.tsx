import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { MapPin, BedDouble, Bath, Heart, Building2, ArrowUpRight } from 'lucide-react'
import type { PropertyWithLandlord } from '../lib/types'
import { getSupabaseImageUrl } from '../lib/supabase'
import { createClient } from '../lib/supabase'

interface PropertyCardProps {
  property: PropertyWithLandlord
  saved?: boolean
  isAuthenticated?: boolean
}

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  sale:       { label: 'For Sale',   bg: 'bg-blue-600',    text: 'text-white' },
  rent:       { label: 'For Rent',   bg: 'bg-violet-600',  text: 'text-white' },
  lease:      { label: 'Lease',      bg: 'bg-emerald-600', text: 'text-white' },
  commercial: { label: 'Commercial', bg: 'bg-slate-700',   text: 'text-white' },
}

function formatPrice(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}K`
  return `₦${n.toLocaleString()}`
}

export default function PropertyCard({ property: p, saved: initialSaved = false, isAuthenticated = false }: PropertyCardProps) {
  const [, navigate] = useLocation()
  const [saved, setSaved] = useState(initialSaved)
  const [saving, setSaving] = useState(false)

  const cover = p.property_images?.find(i => i.is_cover) ?? p.property_images?.[0]
  const coverUrl = cover ? getSupabaseImageUrl(cover.storage_path) : null
  const cfg = TYPE_CONFIG[p.type] ?? TYPE_CONFIG.sale

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
    <Link href={`/listings/${p.id}`} className="block group">
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

        {/* Image */}
        <div className="relative h-52 bg-gray-100 overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={p.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm">
                <Building2 className="w-7 h-7 text-gray-400" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-medium text-gray-400">No photo yet</span>
            </div>
          )}

          {/* Gradient scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

          {/* Type badge — top left */}
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide shadow-sm ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>
          </div>

          {/* Save button — top right */}
          <button
            onClick={handleSave}
            disabled={saving}
            aria-label={saved ? 'Unsave' : 'Save'}
            className={`absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 ${
              saved
                ? 'bg-red-500 text-white shadow-red-500/30 scale-110'
                : 'bg-white/90 backdrop-blur-sm text-gray-400 hover:text-red-500 hover:scale-110'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
          </button>

          {/* Bottom row: verified + price */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            {p.landlords?.is_verified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/95 backdrop-blur-sm text-blue-600 text-[10px] font-bold rounded-lg shadow-sm">
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            ) : <span />}
            <span className="text-white font-black text-xl leading-none drop-shadow-lg">
              {formatPrice(Number(p.price))}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1 mb-1">{p.title}</p>
          <div className="flex items-center gap-1 text-gray-400 text-xs mb-4">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-blue-400" />
            <span className="truncate">{p.city}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <BedDouble className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-700">{p.bedrooms}</span>
              <span>bed{p.bedrooms !== 1 ? 's' : ''}</span>
            </span>
            <span className="w-px h-3 bg-gray-200" />
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Bath className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-700">{p.bathrooms}</span>
              <span>bath</span>
            </span>
            {p.area_sqft && (
              <>
                <span className="w-px h-3 bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">{p.area_sqft.toLocaleString()} sqft</span>
              </>
            )}
            <span className="ml-auto w-7 h-7 rounded-lg bg-gray-50 group-hover:bg-blue-600 flex items-center justify-center transition-colors duration-300 shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors duration-300" />
            </span>
          </div>
        </div>

      </div>
    </Link>
  )
}
