import {
  Calendar, Hash, CreditCard, Mail, Phone, MapPin,
  Clock, CheckCircle, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtDate, type VettingLandlord } from './mockData'

const BRAND = '#6366F1'
const ACCENT = '#A855F7'

interface IdentityGridProps {
  landlord: VettingLandlord
}

export default function IdentityGrid({ landlord }: IdentityGridProps) {
  const fields: Array<{ icon: LucideIcon; label: string; value: string; accent?: boolean; tone?: 'indigo' | 'violet' | 'sky' | 'amber' }> = [
    { icon: Calendar,    label: 'Joined Date',     value: fmtDate(landlord.created_at),       tone: 'sky' },
    { icon: Clock,      label: 'Submitted Date',  value: fmtDate(landlord.kyc_submitted_at), accent: true, tone: 'indigo' },
    { icon: Hash,       label: 'NIN',             value: landlord.nin          || '—', tone: 'violet' },
    { icon: CreditCard, label: 'ID Type',         value: landlord.id_type      || '—', tone: 'amber' },
    { icon: Mail,       label: 'Email',           value: landlord.email        || '—', tone: 'indigo' },
    { icon: Phone,      label: 'Phone',           value: landlord.whatsapp     || '—', tone: 'violet' },
    { icon: MapPin,     label: 'Location',        value: landlord.city         || '—', tone: 'sky' },
  ]

  const TONES: Record<NonNullable<typeof fields[number]['tone']>, string> = {
    indigo: 'from-indigo-500/15 to-violet-500/15 text-indigo-600',
    violet: 'from-violet-500/15 to-purple-500/15 text-violet-600',
    sky:    'from-sky-500/15 to-indigo-500/15 text-sky-600',
    amber:  'from-amber-500/15 to-orange-500/15 text-amber-600',
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {fields.map(f => {
        const Icon = f.icon
        const tone = TONES[f.tone ?? 'indigo']
        return (
          <div
            key={f.label}
            className={cn(
              'group relative flex items-start gap-3 overflow-hidden rounded-xl border border-slate-200/70 bg-white p-3.5 shadow-sm shadow-slate-900/[0.02] transition-all hover:border-slate-300/80 hover:shadow-md hover:shadow-slate-900/[0.04]',
              f.accent && 'ring-1 ring-indigo-200/50',
            )}
          >
            {/* Subtle accent wash on hover for accent row */}
            {f.accent && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(168,85,247,0.05) 100%)',
                }}
              />
            )}
            <div
              className={cn(
                'relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm',
                tone,
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="relative min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {f.label}
              </p>
              <p className="mt-1 truncate text-[13px] font-semibold tracking-tight text-slate-800">
                {f.value}
              </p>
            </div>
          </div>
        )
      })}

      {/* Verification status */}
      <div className={cn(
        'group relative flex items-start gap-3 overflow-hidden rounded-xl border bg-white p-3.5 shadow-sm transition-all sm:col-span-2',
        landlord.is_verified
          ? 'border-emerald-200/80 shadow-emerald-500/[0.04]'
          : 'border-amber-200/80 shadow-amber-500/[0.04]',
      )}>
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 opacity-60',
            landlord.is_verified
              ? 'bg-gradient-to-br from-emerald-50/60 to-teal-50/30'
              : 'bg-gradient-to-br from-amber-50/60 to-orange-50/30',
          )}
        />
        <div
          className={cn(
            'relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm',
            landlord.is_verified
              ? 'bg-gradient-to-br from-emerald-500/15 to-teal-500/15 text-emerald-600'
              : 'bg-gradient-to-br from-amber-500/15 to-orange-500/15 text-amber-600',
          )}
        >
          {landlord.is_verified
            ? <CheckCircle className="h-4 w-4" strokeWidth={2.2} />
            : <Clock className="h-4 w-4" strokeWidth={2.2} />
          }
        </div>
        <div className="relative min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Verification Status
          </p>
          <p className={cn(
            'mt-1 text-[13px] font-extrabold tracking-tight',
            landlord.is_verified ? 'text-emerald-700' : 'text-amber-700',
          )}>
            {landlord.is_verified ? 'Verified — Identity confirmed' : 'Not verified — Pending review'}
          </p>
        </div>
      </div>
    </div>
  )
}