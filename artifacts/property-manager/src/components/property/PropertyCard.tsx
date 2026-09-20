
import { useState } from 'react'
import { Link, useLocation } from '@/lib/navigation'
import { MapPin, BedDouble, Bath, Heart, Building2, Maximize2, ShieldCheck, Flag, X } from 'lucide-react'
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
  rent:       { label: 'For Rent',   cls: 'bg-blue-600 text-white' },
  lease:      { label: 'Lease',      cls: 'bg-sky-600 text-white' },
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
  const [reportOpen, setReportOpen] = useState(false)
  const [reported, setReported] = useState(false)

  const REPORT_REASONS = [
    'Fake or scam listing',
    'Already rented / not available',
    'Wrong price or misleading info',
    'Duplicate listing',
    'Inappropriate content',
    'Other',
  ]

  async function handleReport(e: React.MouseEvent, reason: string) {
    e.preventDefault()
    e.stopPropagation()
    try {
      const supabase = createClient()
      await supabase.from('property_reports').insert({ property_id: p.id, reason })
    } catch (_) {}
    setReported(true)
    setReportOpen(false)
  }

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
    <article className="group relative flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-sm transition-shadow duration-300 hover:shadow-lg hover:shadow-slate-200/60 motion-reduce:transition-none">
      {/* Separate links and buttons keep save/report actions accessible. */}
      <div className="relative isolate aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
        <Link href={`/listings/${p.id}`} aria-label={p.title}
          className="absolute inset-0 block focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-blue-600">
          {coverUrl ? (
            <img src={coverUrl} alt={p.title} loading="lazy" decoding="async"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                <Building2 className="h-7 w-7 text-slate-400" strokeWidth={1.5} />
              </span>
              <span className="text-xs font-medium text-slate-500">No photo</span>
            </div>
          )}
        </Link>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-slate-950/10" />
        <span className={`pointer-events-none absolute left-3 top-3 inline-flex rounded-lg px-3 py-1.5 text-[11px] font-bold shadow-sm ${cfg.cls}`}>
          {cfg.label}
        </span>
        <button type="button" onClick={handleSave} disabled={saving}
          aria-label={saved ? 'Unsave property' : 'Save property'} aria-pressed={saved} aria-busy={saving}
          className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/80 shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60 ${saved ? 'bg-rose-50 text-rose-600' : 'bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-600'}`}>
          <Heart className={`h-[18px] w-[18px] ${saved ? 'fill-current' : ''}`} strokeWidth={1.8} />
        </button>
        {p.landlords?.is_verified && (
          <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-3 pb-2 pt-4 sm:px-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="min-w-0 break-words text-[23px] font-extrabold leading-tight tracking-tight text-blue-700">
            {formatPrice(Number(p.price))}
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot}`} />
            {availableNow ? 'Available now' : statusLabel}
          </span>
        </div>
        <h3 className="text-base font-bold leading-snug tracking-[-0.015em] text-slate-900">
          <Link href={`/listings/${p.id}`} className="line-clamp-2 rounded-sm hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
            {p.title}
          </Link>
        </h3>
        <div className="mb-4 mt-2 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{p.city}</span>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-slate-100 py-3.5">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <BedDouble className="h-4 w-4 text-slate-400" strokeWidth={1.7} />
            <strong className="font-semibold text-slate-800">{p.bedrooms}</strong> bed{p.bedrooms !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <Bath className="h-4 w-4 text-slate-400" strokeWidth={1.7} />
            <strong className="font-semibold text-slate-800">{p.bathrooms}</strong> bath
          </span>
          {p.area_sqft && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <Maximize2 className="h-4 w-4 text-slate-400" strokeWidth={1.7} />
              {p.area_sqft.toLocaleString()} sqft
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1">
          <span className="text-[11px] text-slate-500">{listedLabel}</span>
          {!reported && !reportOpen && (
            <button type="button"
              onClick={e => { e.preventDefault(); e.stopPropagation(); setReportOpen(true) }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg text-[11px] font-medium text-slate-500 transition-colors hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
              <Flag className="h-3 w-3" /> Report listing
            </button>
          )}
        </div>

        {reported ? (
          <p role="status" className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs font-medium leading-relaxed text-emerald-700">
            ✓ Report received — we'll review within 24 hours
          </p>
        ) : reportOpen ? (
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
            onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setReportOpen(false) } }}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-800">Why are you reporting?</p>
              <button type="button" aria-label="Close report"
                onClick={e => { e.preventDefault(); e.stopPropagation(); setReportOpen(false) }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {REPORT_REASONS.map(r => (
                <button type="button" key={r} onClick={e => handleReport(e, r)}
                  className="min-h-[44px] rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-600 transition-colors hover:bg-white hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                  {r}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}
