import { Phone, ChevronRight, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KYC_STATUS_META, daysAgo, avatarGrad, getInitials, type VettingLandlord } from './mockData'

const BRAND = '#2563EB'

interface ApplicantCardProps {
  landlord: VettingLandlord
  selected: boolean
  onSelect: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void
  tabIndex?: number
}

export default function ApplicantCard({
  landlord,
  selected,
  onSelect,
  onKeyDown,
  tabIndex,
}: ApplicantCardProps) {
  const meta = KYC_STATUS_META[landlord.status] ?? KYC_STATUS_META.pending
  const ago = landlord.status === 'pending' ? daysAgo(landlord.kyc_submitted_at) : null

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
      className={cn(
        'group relative flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        selected
          ? 'bg-white border-l-4 border-l-transparent'
          : 'hover:bg-slate-50/80',
      )}
      style={selected ? { borderLeftColor: BRAND } : undefined}
    >
      {/* Avatar */}
      <div
        className={cn(
          'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[11px] font-black text-white shadow-sm',
          avatarGrad(landlord.full_name),
        )}
        aria-hidden="true"
      >
        {getInitials(landlord.full_name)}
        {/* Status dot */}
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white',
            landlord.status === 'approved'     && 'bg-emerald-500',
            landlord.status === 'pending'     && 'bg-amber-400',
            landlord.status === 'rejected'    && 'bg-red-500',
            landlord.status === 'suspended'    && 'bg-orange-500',
            landlord.status === 'not_submitted' && 'bg-slate-300',
          )}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              'truncate text-[14px] font-bold',
              selected ? 'text-slate-900' : 'text-slate-800',
            )}
          >
            {landlord.full_name}
          </p>
          {ago && (
            <span className="shrink-0 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
              {ago}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {/* Status badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
              meta.bg, meta.text, meta.border,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
            {meta.label}
          </span>
          {/* Phone */}
          {landlord.whatsapp && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Phone className="h-2.5 w-2.5" />
              {landlord.whatsapp}
            </span>
          )}
          {/* City */}
          {landlord.city && (
            <span className="hidden items-center gap-1 text-[11px] text-slate-400 lg:inline-flex">
              <MapPin className="h-2.5 w-2.5" />
              {landlord.city}
            </span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight
        className={cn(
          'h-4 w-4 shrink-0 text-slate-300 transition-all duration-150',
          selected
            ? 'text-slate-900 translate-x-0.5'
            : 'group-hover:translate-x-0.5 group-hover:text-slate-500',
        )}
      />
    </button>
  )
}
