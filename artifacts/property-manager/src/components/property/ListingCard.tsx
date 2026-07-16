import { useState } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import { MapPin, BedDouble, Bath, Bookmark, ShieldCheck, Building2, Phone, MessageCircle } from 'lucide-react'
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
  sale:       { label: 'For Sale',   cls: 'bg-blue-600/95 text-white' },
  rent:       { label: 'For Rent',   cls: 'bg-blue-600/95 text-white' },
  lease:      { label: 'Lease',      cls: 'bg-slate-800/95 text-white' },
  commercial: { label: 'Commercial', cls: 'bg-slate-800/95 text-white' },
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
  const [activeImageIdx, setActiveImageIdx] = useState(0)

  const images = p.property_images ?? []
  const cover = images.find(i => i.is_cover) ?? images[0]
  const coverUrl = cover ? getSupabaseImageUrl(cover.storage_path) : null
  const cfg = TYPE_CONFIG[p.type] ?? TYPE_CONFIG.rent
  const period = PERIOD[p.type] ?? ''
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`block group outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-3xl h-full ${
        highlighted ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
    >
      <article className={`bg-white rounded-3xl overflow-hidden h-full flex transition-all duration-200 ease-out ${
        highlighted
          ? 'shadow-xl shadow-blue-500/10'
          : 'shadow-sm border border-slate-100 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1'
      }`}>

        {/* LEFT SIDE: IMAGE CAROUSEL */}
        <div className="flex-shrink-0 w-80 h-80 bg-slate-100 overflow-hidden relative group/img">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={p.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover/img:scale-[1.05] transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 gap-2">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                <Building2 className="w-7 h-7 text-slate-200" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-slate-300 tracking-wide">No photo</span>
            </div>
          )}

          {/* Image carousel indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.preventDefault(); setActiveImageIdx(i) }}
                  className={`w-2 h-2 rounded-full transition-all ${i === activeImageIdx ? 'bg-white w-6' : 'bg-white/50'}`}
                />
              ))}
            </div>
          )}

          {/* "Listed X ago" badge */}
          <div className="absolute top-4 left-4">
            <div className="inline-flex items-center px-3 py-2 rounded-2xl bg-slate-900/80 backdrop-blur-sm text-white text-xs font-semibold">
              Listed {timeAgo} ago
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: DETAILS PANEL */}
        <div className="flex-1 flex flex-col p-6 gap-6">
          
          {/* Top row: Price + Save button */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-4xl font-extrabold text-slate-900">
                {formatPrice(Number(p.price))}
              </p>
              {period && (
                <p className="text-sm text-slate-500 font-medium mt-1">{period === '/yr' ? 'annually' : 'period'}</p>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              aria-label={saved ? 'Unsave' : 'Save'}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 shrink-0 ${
                saved
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-lg font-semibold text-slate-900">{p.address ? `${p.address}` : p.city}</p>
              <p className="text-sm text-slate-500">{p.city}{p.state ? `, ${p.state}` : ''}</p>
            </div>
          </div>

          {/* Property specs */}
          <div className="flex items-center gap-4 py-4 border-y border-slate-200">
            {p.bedrooms != null && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <BedDouble className="w-4 h-4 text-slate-600" strokeWidth={1.5} />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-slate-900">{p.bedrooms}</p>
                  <p className="text-xs text-slate-500">Bed{p.bedrooms !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )}

            {p.bathrooms != null && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Bath className="w-4 h-4 text-slate-600" strokeWidth={1.5} />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-slate-900">{p.bathrooms}</p>
                  <p className="text-xs text-slate-500">Bath</p>
                </div>
              </div>
            )}

            {p.property_type && (
              <div className="text-sm">
                <p className="font-semibold text-slate-900">{p.property_type}</p>
                <p className="text-xs text-slate-500">Type</p>
              </div>
            )}
          </div>

          {/* Owner's Agent section */}
          <div className="mt-auto pt-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {p.landlords?.avatar_url ? (
                <img
                  src={getSupabaseImageUrl(p.landlords.avatar_url)}
                  alt={p.landlords.full_name}
                  className="w-12 h-12 rounded-full object-cover bg-slate-100"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  {p.landlords?.full_name?.[0] ?? 'A'}
                </div>
              )}
              <div className="text-sm">
                <p className="font-semibold text-slate-900">{p.landlords?.full_name ?? 'Owner'}</p>
                <p className="text-xs text-slate-500">
                  {p.landlords?.is_verified ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    'Agent'
                  )}
                </p>
              </div>
            </div>

            {/* Contact buttons */}
            <div className="flex items-center gap-2">
              <a
                href={`tel:+234${p.landlords?.whatsapp?.replace(/\D/g, '').slice(-10) ?? ''}`}
                onClick={e => e.stopPropagation()}
                className="w-10 h-10 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-600 flex items-center justify-center transition-colors"
                aria-label="Call"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/234${p.landlords?.whatsapp?.replace(/\D/g, '').slice(-10) ?? ''}?text=Hi, I'm interested in your property`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
