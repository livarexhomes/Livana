import { type LucideIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const BRAND = '#2563EB'
const BRAND_D = '#1D4ED8'

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

const VARIANT_STYLES: Record<ActionVariant, {
  border: string; hover: string; iconBg: string; title: string; sub: string
}> = {
  approve: {
    border: 'border-emerald-200',
    hover: 'hover:border-emerald-400 hover:bg-emerald-50/60',
    iconBg: 'bg-emerald-100 text-emerald-600',
    title: 'text-emerald-800',
    sub: 'text-emerald-600/80',
  },
  reject: {
    border: 'border-red-200',
    hover: 'hover:border-red-400 hover:bg-red-50/60',
    iconBg: 'bg-red-100 text-red-600',
    title: 'text-red-800',
    sub: 'text-red-600/80',
  },
  suspend: {
    border: 'border-amber-200',
    hover: 'hover:border-amber-400 hover:bg-amber-50/60',
    iconBg: 'bg-amber-100 text-amber-600',
    title: 'text-amber-800',
    sub: 'text-amber-600/80',
  },
  reset: {
    border: 'border-slate-200',
    hover: 'hover:border-slate-400 hover:bg-slate-50',
    iconBg: 'bg-slate-100 text-slate-600',
    title: 'text-slate-800',
    sub: 'text-slate-500',
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
      className={cn(
        'group flex flex-col items-start gap-3 rounded-2xl border-2 bg-white p-4 transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        styles.border, styles.hover,
        fullWidth ? 'w-full' : 'flex-1 min-w-0',
      )}
    >
      <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', styles.iconBg)}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      </div>
      <div className="min-w-0">
        <p className={cn('text-[14px] font-bold leading-tight', styles.title)}>{title}</p>
        <p className={cn('mt-0.5 text-[12px] leading-snug', styles.sub)}>{description}</p>
      </div>
    </button>
  )
}
