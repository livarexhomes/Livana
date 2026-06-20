import { useState } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import { MapPin, BedDouble, Bath, Heart, ShieldCheck, Building2, Maximize2, Zap, Star } from 'lucide-react'
import type { PropertyWithLandlord } from '@/types'
import { getSupabaseImageUrl, createClient } from '@/lib/supabase'
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

const TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  sale:       { label: 'For Sale',   cls: 'bg-blue-600 text-white' },
  rent:       { label: 'For Rent',   cls: 'bg-violet-600 text-white' },
  lease:      { label: 'Lease',      cls: 'bg-emerald-600 text-white' },
  commercial: { label: 'Commercial', cls: 'bg-slate-700 text-white' },
}

const PERIOD: Record<string, string> = {
  rent: '/yr',
  lease: '/yr',
  sale: '',
  commercial: '',
}

function formatPrice(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`
  return `₦${n.toLocaleString('en-NG')}`
}

export default function ListingCard({
  property: p,
  saved: initialSaved = false,
  isAuthenticated = false,
  highlighted = false,
  onMouseEnter,
  onMouseLeave,
  layout = 'grid',
}: Props) {
  const [, navigate] = useLocation()
  const [saved, setSaved] = useState(initialSaved)
  const [saving, setSaving] = useState(false)

  const cover = p.property_images?.find(i => i.is_cover) ?? p.property_images?.[0]
  const coverUrl = cover ? getSupabaseImageUrl(cover.storage_path) : null
  const cfg = TYPE_CONFIG[p.type] ?? TYPE_CONFIG.rent
  const period = PERIOD[p.type] ?? ''
  const timeAgo = formatDistanceToNow(new Date(p.created_at), { addSuffix: false })
  const isVerified = p.landlords?.is_verified

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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`block group outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-3xl h-full ${
        highlighted ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
      }`}
    >
      <article className={`bg-white rounded-3xl overflow-hidden h-full flex flex-col transition-all duration-300 ease-out ${
        highlighted
          ? 'shadow-2xl shadow-emerald-500/10'
          : 'shadow-sm border border-gray-100/80 hover:shadow-2xl hover:shadow-gray-200/80 hover:-translate-y-1.5'
      }`}>

        {/* IMAGE BLOCK */}
        <div className="relative flex-shrink-0 h-56 bg-gray-100 overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={p.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 gap-2">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                <Building2 className="w-7 h-7 text-gray-200" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-gray-300 tracking-wide">No photo</span>
            </div>
          )}

          {/* Gradient scrim — stronger at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

          {/* TOP ROW: type badge + save */}
          <div className="absolute top-3.5 left-3.5 right-3.5 flex items-start justify-between">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg ${cfg.cls}`}>
              {cfg.label}
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              aria-label={saved ? 'Unsave' : 'Save'}
              className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90 ${
                saved
                  ? 'bg-rose-500 text-white shadow-rose-500/40'
                  : 'bg-white/90 backdrop-blur-sm text-gray-400 hover:text-rose-500 hover:bg-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* FEATURED ribbon */}
          {p.featured && (
            <div className="absolute top-12 left-0">
              <div className="flex items-center gap-1 bg-amber-400 text-amber-900 text-[9px] font-black uppercase tracking-widest px-3 py-1 shadow-lg">
                <Star className="w-2.5 h-2.5 fill-current" /> Featured
              </div>
            </div>
          )}

          {/* BOTTOM OVERLAY: verified + price */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10 flex items-end justify-between gap-2">
            <div className="flex flex-col gap-1.5">
              {isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg w-fit shadow-sm">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              )}
              <span className="text-white/60 text-[10px] font-medium">
                Listed {timeAgo} ago
              </span>
            </div>
            <div className="text-right shrink-0">
              <p className="text-white font-black text-2xl leading-none tracking-tight drop-shadow-lg">
                {formatPrice(Number(p.price))}
              </p>
              {period && (
                <p className="text-white/60 text-[10px] font-semibold mt-0.5">{period}</p>
              )}
            </div>
          </div>
        </div>

        {/* CONTENT BLOCK */}
        <div className="p-4 flex flex-col flex-1">
          {/* Title */}
          <h3 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-1 mb-1.5 group-hover:text-violet-700 transition-colors duration-200">
            {p.title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 text-gray-400 text-xs mb-4">
            <MapPin className="w-3 h-3 shrink-0 text-violet-400" />
            <span className="truncate">{p.address ? `${p.address}, ${p.city}` : p.city}</span>
          </div>

          {/* Specs row */}
          <div className="flex items-center gap-3 mt-auto pt-3 border-t border-gray-50">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center">
                <BedDouble className="w-3 h-3 text-gray-400" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-bold text-gray-800">{p.bedrooms}</span>
              <span className="text-xs text-gray-400">bed{p.bedrooms !== 1 ? 's' : ''}</span>
            </div>

            <span className="w-px h-3 bg-gray-100" />

            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center">
                <Bath className="w-3 h-3 text-gray-400" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-bold text-gray-800">{p.bathrooms}</span>
              <span className="text-xs text-gray-400">bath</span>
            </div>

            {p.area_sqft ? (
              <>
                <span className="w-px h-3 bg-gray-100" />
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center">
                    <Maximize2 className="w-3 h-3 text-gray-400" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs text-gray-400">{p.area_sqft.toLocaleString()} sqft</span>
                </div>
              </>
            ) : null}

            {/* Arrow CTA */}
            <div className="ml-auto w-7 h-7 rounded-xl bg-gray-50 group-hover:bg-violet-600 flex items-center justify-center transition-all duration-300 shrink-0">
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
