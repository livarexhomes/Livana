import { type LucideIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ActionVariant = 'approve' | 'reject' | 'suspend' | 'reset'

interface ReviewActionCardProps {
  variant: ActionVariant
  icon: LucideIcon
  title: string
  description: string
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
}

const VARIANT_STYLES: Record<
  ActionVariant,
  { border: string; hover: string; iconBg: string; iconText: string; title: string; sub: string }
> = {
  approve: {
    border: 'border-[#b8d7c3] dark:border-emerald-800/60',
    hover: 'hover:border-[#4c9874] hover:bg-[#edf5ef] dark:hover:bg-emerald-950/30',
    iconBg: 'bg-[#dfece4] text-[#2f7560] dark:bg-emerald-950/60 dark:text-emerald-300',
    iconText: 'text-[#2f7560] dark:text-emerald-300',
    title: 'text-[#245b49] dark:text-emerald-200',
    sub: 'text-[#4a7964] dark:text-emerald-300/80',
  },
  reject: {
    border: 'border-red-200 dark:border-red-800/60',
    hover: 'hover:border-red-400 hover:bg-red-50/60 dark:hover:bg-red-950/30',
    iconBg: 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300',
    iconText: 'text-red-700 dark:text-red-300',
    title: 'text-red-900 dark:text-red-200',
    sub: 'text-red-600/80 dark:text-red-300/80',
  },
  suspend: {
    border: 'border-amber-200 dark:border-amber-800/60',
    hover: 'hover:border-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/30',
    iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300',
    iconText: 'text-amber-700 dark:text-amber-300',
    title: 'text-amber-900 dark:text-amber-200',
    sub: 'text-amber-700/80 dark:text-amber-300/80',
  },
  reset: {
    border: 'border-blue-200 dark:border-blue-800/60',
    hover: 'hover:border-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/30',
    iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300',
    iconText: 'text-blue-700 dark:text-blue-300',
    title: 'text-blue-900 dark:text-blue-200',
    sub: 'text-blue-700/80 dark:text-blue-300/80',
  },
}

export default function ReviewActionCard({
  variant,
  icon: Icon,
  title,
  description,
  onClick,
  loading = false,
  disabled = false,
  fullWidth = false,
}: ReviewActionCardProps) {
  const styles = VARIANT_STYLES[variant]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-label={`${title} — ${description}`}
      className={cn(
        'group flex flex-col items-start gap-2 rounded-2xl border-2 bg-[#fbfcfa] p-4 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d9b87] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 motion-reduce:transform-none motion-reduce:transition-none',
        styles.border,
        styles.hover,
        fullWidth ? 'w-full' : 'flex-1 min-w-0',
      )}
    >
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', styles.iconBg)}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0">
        <p className={cn('text-[14px] font-semibold leading-tight', styles.title)}>{title}</p>
        <p className={cn('mt-0.5 text-[12px] leading-snug', styles.sub)}>{description}</p>
      </div>
    </button>
  )
}
