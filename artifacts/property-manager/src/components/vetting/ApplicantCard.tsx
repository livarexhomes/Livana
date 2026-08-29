import { Phone, ChevronRight, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KYC_STATUS_META, daysAgo, avatarGrad, getInitials, type VettingLandlord } from './mockData'

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
        'group relative flex min-h-[82px] w-full items-center gap-3 border-l-[3px] px-3 py-3 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d9b87] focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900 motion-reduce:transition-none',
        selected
           ? 'border-l-[#2f7560] bg-[#edf5ef] dark:border-l-blue-400 dark:bg-blue-950/30'
           : 'border-l-transparent hover:bg-[#f1f5f1] dark:hover:bg-slate-800/60',
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white shadow-sm',
          avatarGrad(landlord.full_name),
        )}
        aria-hidden="true"
      >
        {getInitials(landlord.full_name)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              'truncate text-[14px] font-semibold',
              selected
                 ? 'text-[#18352f] dark:text-blue-100'
                : 'text-slate-900 dark:text-white',
            )}
          >
            {landlord.full_name}
          </p>
          {ago && (
            <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
              {ago}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold',
              meta.bg,
              meta.text,
              meta.border,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
            {meta.label}
          </span>
          {landlord.whatsapp && (
            <span className="flex min-w-0 items-center gap-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
              <Phone className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{landlord.whatsapp}</span>
            </span>
          )}
          {landlord.city && (
            <span className="hidden min-w-0 items-center gap-1 truncate text-[11px] text-[#7b8980] lg:flex">
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{landlord.city}</span>
            </span>
          )}
        </div>
      </div>

      <ChevronRight
        className={cn(
          'h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-slate-600',
          selected && 'text-blue-500 dark:text-blue-400',
        )}
      />
    </button>
  )
}
