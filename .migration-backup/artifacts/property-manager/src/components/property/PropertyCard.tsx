'use client'

import { useState } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import { MapPin, BedDouble, Bath, Heart, Building2, Maximize2, ShieldCheck } from 'lucide-react'
import type { PropertyWithLandlord } from '@/types'
import { getSupabaseImageUrl } from '@/lib/supabase'
import { createClient } from '@/lib/supabase'

interface PropertyCardProps {
  property: PropertyWithLandlord
  saved?: boolean
  isAuthenticated?: boolean
}

const TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  sale:       { label: 'For Sale',   cls: 'bg-blue-600 text-white' },
  rent:       { label: 'For Rent',   cls: 'bg-violet-600 text-white' },
  lease:      { label: 'Lease',      cls: 'bg-emerald-600 text-white' },
  commercial: { label: 'Commercial', cls: 'bg-slate-700 text-white' },
}

const STATUS_DOT: Record<string, string> = {
  available:         'bg-emerald-400',
  taken:             'bg-red-400',
  coming_soon:       'bg-blue-400',
  under_negotiation: 'bg-amber-400',
}

function formatPrice(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

export default function PropertyCard({ property: p, saved: initialSaved = false, isAuthenticated = false }: PropertyCardProps) {
  const [, navigate] = useLocation()
  const [saved, setSaved] = useState(initialSaved)
  const [saving, setSaving] = useState(false)

  const cover = p.property_images?.find(i => i.is_cover) ?? p.property_images?.[0]
  const coverUrl = cover ? getSupabaseImageUrl(cover.storage_path) : null
  const cfg = TYPE_CONFIG[p.type] ?? TYPE_CONFIG.sale
  const statusDot = STATUS_DOT[p.status] ?? 'bg-gray-400'
  const statusLabel = p.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const daysListed = Math.max(1, Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000))
  const listedLabel = daysListed === 1 ? 'Listed today' : `Listed ${daysListed} day${daysListed === 1 ? '' : 's'} ago`
  const availableNow = p.status === 'available'

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
    <Link href={`/listings/${p.id}`} className="block group outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-3xl">
      <article className="bg-white rounded-3xl overflow-hidden border border-gray-100/80 shadow-sm hover:shadow-2xl hover:shadow-gray-200/70 hover:-translate-y-1.5 transition-all duration-300 ease-out">

        {/* IMAGE */}
        <div className="relative h-56 bg-gray-100 overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={p.title}
              className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 gap-2">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                <Building2 className="w-6 h-6 text-gray-300" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-gray-300">No photo</span>
            </div>
          )}

          {/* Gradient scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />

          {/* Type badge — top left */}
          <div className="absolute top-3.5 left-3.5">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg ${cfg.cls}`}>
              {cfg.label}
            </span>
          </div>

          {/* Save button — top right */}
          <button
            onClick={handleSave}
            disabled={saving}
            aria-label={saved ? 'Unsave property' : 'Save property'}
            className={`absolute top-3.5 right-3.5 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90 ${
              saved
                ? 'bg-rose-500 text-white shadow-rose-500/40'
                : 'bg-white/90 backdrop-blur-sm text-gray-400 hover:text-rose-500 hover:bg-white'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
          </button>

          {/* Bottom overlay: verified + price */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex items-end justify-between gap-2">
            <div className="flex flex-col gap-1">
              {p.landlords?.is_verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/95 backdrop-blur-sm text-emerald-600 text-[10px] font-bold rounded-lg shadow-sm w-fit">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-black/30 backdrop-blur-sm text-white/80 text-[10px] font-semibold rounded-lg w-fit">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
                {statusLabel}
              </span>
            </div>
            <span className="text-white font-black text-[22px] leading-none tracking-tight drop-shadow-lg shrink-0">
              {formatPrice(Number(p.price))}
            </span>
          </div>
        </div>

        {/* BODY */}
        <div className="p-4">
          <h3 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors duration-200">
            {p.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-gray-400 text-xs mb-4">
            <div className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0 text-blue-400" />
              <span className="truncate">{p.city}</span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-gray-500">
              {availableNow ? 'Available now' : statusLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-gray-500">
              {listedLabel}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                <BedDouble className="w-3 h-3 text-gray-400" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-bold text-gray-700">{p.bedrooms}</span>
              <span className="text-xs text-gray-400">bed{p.bedrooms !== 1 ? 's' : ''}</span>
            </div>

            <span className="w-px h-3 bg-gray-100" />

            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                <Bath className="w-3 h-3 text-gray-400" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-bold text-gray-700">{p.bathrooms}</span>
              <span className="text-xs text-gray-400">bath</span>
            </div>

            {p.area_sqft && (
              <>
                <span className="w-px h-3 bg-gray-100" />
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <Maximize2 className="w-3 h-3 text-gray-400" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{p.area_sqft.toLocaleString()} sqft</span>
                </div>
              </>
            )}

            {/* Arrow CTA */}
            <div className="ml-auto w-7 h-7 rounded-xl bg-gray-50 group-hover:bg-gray-900 flex items-center justify-center transition-all duration-300 shrink-0">
              <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </div>
          </div>
        </div>

      </article>
    </Link>
  )
}
