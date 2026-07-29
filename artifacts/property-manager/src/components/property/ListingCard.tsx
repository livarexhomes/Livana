import { useState } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import { MapPin, BedDouble, Bath, Bookmark, ShieldCheck, Building2, Phone, MessageCircle } from 'lucide-react'
import type { PropertyWithLandlord } from '@/types'
import { getSupabaseImageUrl, createClient } from '@/lib/supabase'
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
  sale:       'bg-blue-600 text-white',
  lease:      'bg-slate-700 text-white',
  commercial: 'bg-slate-700 text-white',
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
  const [saved, setSaved]     = useState(initialSaved)
  const [saving, setSaving]   = useState(false)

  const images   = p.property_images ?? []
  const cover    = images.find(i => i.is_cover) ?? images[0]
  const coverUrl = cover ? getSupabaseImageUrl(cover.storage_path) : null
  const typeLabel = TYPE_LABEL[p.type] ?? 'Property'
  const typeColor = TYPE_COLOR[p.type] ?? 'bg-blue-600 text-white'
  const period    = PERIOD[p.type] ?? ''
  const timeAgo   = formatDistanceToNow(new Date(p.created_at), { addSuffix: false })

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
    } finally { setSaving(false) }
  }

  return (
    <Link
      href={`/listings/${p.id}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`block group outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl ${
        highlighted ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
    >
      <article className={`bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-200 ${
        highlighted
          ? 'shadow-xl shadow-blue-500/10'
          : 'shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-0.5'
      }`}>

        {/* ── IMAGE ── */}
        <div className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden flex-shrink-0">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={p.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 gap-2">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                <Building2 className="w-7 h-7 text-slate-200" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-slate-300 tracking-wide">No photo</span>
            </div>
          )}

          {/* Top-left: time + type badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-900/75 backdrop-blur-sm text-white text-xs font-semibold">
              {timeAgo} ago
            </span>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold backdrop-blur-sm ${typeColor}`}>
              {typeLabel}
            </span>
          </div>

          {/* Top-right: save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            aria-label={saved ? 'Unsave' : 'Save'}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
              saved
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white/80 backdrop-blur-sm text-slate-400 hover:text-slate-700 hover:bg-white shadow'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* ── DETAILS ── */}
        <div className="flex flex-col p-4 gap-2.5 min-w-0">

          {/* Price row */}
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xl font-extrabold text-slate-900 leading-none">
              {formatPrice(Number(p.price))}
              {period && <span className="text-xs text-slate-400 font-medium ml-1">{period === '/yr' ? '/yr' : ''}</span>}
            </p>
            {p.landlords?.is_verified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
            {p.title}
          </p>

          {/* Location */}
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <p className="text-xs text-slate-500 truncate">{p.address ? `${p.address}, ` : ''}{p.city}</p>
          </div>

          {/* Specs */}
          {(p.bedrooms != null || p.bathrooms != null || p.property_type) && (
            <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
              {p.bedrooms != null && (
                <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                  <BedDouble className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                  {p.bedrooms} {p.bedrooms === 1 ? 'Bed' : 'Beds'}
                </span>
              )}
              {p.bathrooms != null && (
                <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                  <Bath className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                  {p.bathrooms} {p.bathrooms === 1 ? 'Bath' : 'Baths'}
                </span>
              )}
              {p.property_type && (
                <span className="text-xs text-slate-400 ml-auto">{p.property_type}</span>
              )}
            </div>
          )}

          {/* Landlord / Livarex contact row */}
          {(() => {
            const LIVAREX_WA = '07061370742'
            const contactNum  = p.landlords?.whatsapp ?? LIVAREX_WA
            const displayName = p.landlords?.full_name ?? 'Livarex'
            const avatarUrl   = p.landlords?.avatar_url ?? null
            const initials    = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            return (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500">{initials}</span>
                  )}
                </div>
                {/* Name */}
                <p className="text-xs font-semibold text-slate-600 truncate flex-1 min-w-0">
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
                  className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors active:scale-90 shrink-0"
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
                  className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors active:scale-90 shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })()}
        </div>

      </article>
    </Link>
  )
}
