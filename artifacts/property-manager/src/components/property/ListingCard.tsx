import { useState, useEffect } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import { MapPin, BedDouble, Bath, Bookmark, ShieldCheck, Building2, Phone, MessageCircle } from 'lucide-react'
import type { PropertyWithLandlord } from '@/types'
import { getSupabaseImageUrl, createClient } from '@/lib/supabase'
import { DEFAULT_PLATFORM, getPlatformSettings } from '@/lib/platform-settings'
import { formatDistanceToNow } from 'date-fns'

function waLink(raw: string) {
  const digits = raw.replace(/\D/g, '')
  const normalized = digits.startsWith('0') ? '234' + digits.slice(1) : digits
  return `https://wa.me/${normalized}`
}
function telLink(raw: string) {
  const digits = raw.replace(/\D/g, '')
  const normalized = digits.startsWith('0') ? '+234' + digits.slice(1) : '+' + digits
  return `tel:${normalized}`
}

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
  sale:       'For Sale',
  rent:       'For Rent',
  lease:      'Lease',
  commercial: 'Commercial',
}

const TYPE_COLOR: Record<string, string> = {
  rent:       'bg-blue-600 text-white',
  sale:       'bg-emerald-600 text-white',
  lease:      'bg-violet-600 text-white',
  commercial: 'bg-orange-500 text-white',
}

const PERIOD: Record<string, string> = {
  rent:  '/yr',
  lease: '/yr',
}

function formatPrice(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}K`
  return `₦${n.toLocaleString('en-NG')}`
}

export default function ListingCard({
  property: p,
  saved: initialSaved = false,
  isAuthenticated = false,
  highlighted = false,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const [, navigate] = useLocation()
  const [saved, setSaved]   = useState(initialSaved)
  const [saving, setSaving] = useState(false)
  const [fallbackNum, setFallbackNum] = useState(DEFAULT_PLATFORM.phone)

  // Load the admin phone (Admin → Settings) as the WhatsApp fallback when a
  // landlord has no number of their own — single source of truth.
  useEffect(() => {
    let active = true
    getPlatformSettings().then(s => { if (active) setFallbackNum(s.phone) })
    return () => { active = false }
  }, [])

  const images   = p.property_images ?? []
  const cover    = images.find(i => i.is_cover) ?? images[0]
  const coverUrl = cover ? getSupabaseImageUrl(cover.storage_path) : null
  const typeLabel = TYPE_LABEL[p.type] ?? 'Property'
  const typeColor = TYPE_COLOR[p.type] ?? 'bg-blue-600 text-white'
  const period    = PERIOD[p.type] ?? ''
  const timeAgo   = formatDistanceToNow(new Date(p.created_at), { addSuffix: false })

  const contactNum  = fallbackNum
  const displayName = p.landlords?.full_name ?? 'Livarex'
  const avatarUrl   = p.landlords?.avatar_url ?? null
  const initials    = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
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
    } finally { setSaving(false) }
  }

  return (
    /* h-full so grid row stretches all cards to equal height */
    <Link
      href={`/listings/${p.id}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`block h-full group outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl ${
        highlighted ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
    >
      <article className={`h-full bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-200 ${
        highlighted
          ? 'shadow-xl shadow-blue-500/10 border border-blue-100'
          : 'border border-slate-100 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-0.5'
      }`}>

        {/* ── IMAGE ── */}
        <div className="relative w-full aspect-[16/10] bg-slate-100 overflow-hidden flex-shrink-0">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={p.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 gap-2">
              <Building2 className="w-10 h-10 text-slate-200" strokeWidth={1} />
              <span className="text-[11px] text-slate-300 tracking-wide">No photo</span>
            </div>
          )}

          {/* Gradient fade at bottom of image */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

          {/* Price pill — overlaid on image bottom-left */}
          <div className="absolute bottom-3 left-3">
            <div className="flex items-baseline gap-1 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-sm shadow-lg shadow-black/10">
              <span className="text-base font-black text-slate-900 leading-none">{formatPrice(Number(p.price))}</span>
              {period && <span className="text-[11px] text-slate-400 font-medium">{period}</span>}
            </div>
          </div>

          {/* Type badge — top-left */}
          <div className="absolute top-3 left-3">
            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${typeColor}`}>
              {typeLabel}
            </span>
          </div>

          {/* Save button — top-right */}
          <button
            onClick={handleSave}
            disabled={saving}
            aria-label={saved ? 'Unsave' : 'Save'}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
              saved
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white/90 backdrop-blur-sm text-slate-400 hover:text-slate-700 shadow'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* ── BODY — grows to fill remaining space ── */}
        <div className="flex flex-col flex-1 p-4 min-w-0">

          {/* Title + verified */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-[13px] font-bold text-slate-800 leading-snug line-clamp-2 flex-1">
              {p.title}
            </p>
            {p.landlords?.is_verified && (
              <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <ShieldCheck className="w-3 h-3" /> Verified
              </span>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 mb-3 min-w-0">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <p className="text-[11px] text-slate-400 truncate">
              {p.address ? `${p.address}, ` : ''}{p.city}
            </p>
          </div>

          {/* Specs */}
          {(p.bedrooms != null || p.bathrooms != null) && (
            <div className="flex items-center gap-3 mb-3">
              {p.bedrooms != null && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <BedDouble className="w-3.5 h-3.5 text-slate-300" strokeWidth={2} />
                  {p.bedrooms} {p.bedrooms === 1 ? 'Bed' : 'Beds'}
                </span>
              )}
              {p.bathrooms != null && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <Bath className="w-3.5 h-3.5 text-slate-300" strokeWidth={2} />
                  {p.bathrooms} {p.bathrooms === 1 ? 'Bath' : 'Baths'}
                </span>
              )}
              {p.property_type && (
                <span className="ml-auto text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                  {p.property_type}
                </span>
              )}
            </div>
          )}

          {/* Spacer pushes contact row to bottom */}
          <div className="flex-1" />

          {/* ── CONTACT ROW ── */}
          <div className="flex items-center gap-2 pt-3 mt-1 border-t border-slate-100">
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 overflow-hidden shrink-0 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-black text-blue-600">{initials}</span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 truncate flex-1 min-w-0">
              {displayName}
            </p>
            {/* Call */}
            <button
              onClick={e => {
                e.preventDefault(); e.stopPropagation()
                if (!isAuthenticated) { navigate('/login'); return }
                window.location.href = telLink(contactNum)
              }}
              aria-label="Call"
              className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-100 flex items-center justify-center text-blue-600 transition-all active:scale-90 shrink-0"
            >
              <Phone className="w-3.5 h-3.5" />
            </button>
            {/* WhatsApp */}
            <button
              onClick={e => {
                e.preventDefault(); e.stopPropagation()
                if (!isAuthenticated) { navigate('/login'); return }
                window.open(waLink(contactNum), '_blank', 'noopener')
              }}
              aria-label="WhatsApp"
              className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 flex items-center justify-center text-emerald-600 transition-all active:scale-90 shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </article>
    </Link>
  )
}
