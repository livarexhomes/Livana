import { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Compact stat card for mobile 2×2 grids.
 * Use in conjunction with a `grid grid-cols-2 gap-2` container on mobile.
 */
export function MobileStatCard({
  label,
  value,
  color,
  icon,
  unit,
}: {
  label: string
  value: string | number
  color?: string
  icon?: ReactNode
  unit?: string
}) {
  return (
    <div className="rounded-[11px] bg-slate-50 border border-slate-200/70 px-3 py-2.5 flex flex-col items-center text-center min-h-[72px]">
      {icon && <div className="mb-1 text-slate-400">{icon}</div>}
      <p className={cn('text-xl font-extrabold leading-tight tabular-nums', color ?? 'text-slate-900')}>
        {value}{unit}
      </p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400 leading-none">
        {label}
      </p>
    </div>
  )
}

/**
 * Compact page intro for mobile — replaces the large desktop hero card.
 */
export function MobilePageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="px-4 pt-3 pb-2">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0 flex items-center gap-1.5">{action}</div>}
      </div>
    </div>
  )
}

/**
 * Compact empty state for mobile — used inside list containers.
 */
export function MobileEmptyState({
  title = 'Nothing here yet',
  description = 'No items match your current filters.',
  icon,
  action,
}: {
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
        {icon ?? <div className="w-4 h-4 rounded-full bg-slate-200" />}
      </div>
      <p className="text-[13px] font-semibold text-slate-600">{title}</p>
      <p className="text-[12px] text-slate-400 mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/**
 * Header bar for full-screen mobile detail pages.
 * Shows a back button, title, and optional status badge.
 */
export function MobileDetailHeader({
  title,
  subtitle,
  status,
  onBack,
  actions,
  sticky = true,
}: {
  title: string
  subtitle?: string
  status?: ReactNode
  onBack: () => void
  actions?: ReactNode
  sticky?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-4 border-b border-slate-100 bg-white shrink-0',
        sticky ? 'sticky top-0 z-10' : '',
      )}
      style={{ height: 56 }}
    >
      <button
        onClick={onBack}
        className="p-1 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
        aria-label="Back"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-slate-900 truncate">{title}</p>
        {subtitle && <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>}
      </div>
      {status && <div className="shrink-0">{status}</div>}
      {actions && <div className="shrink-0 flex items-center gap-1">{actions}</div>}
    </div>
  )
}

/**
 * Mobile stat grid — renders a 2×2 grid on mobile, horizontal on desktop.
 */
export function MobileStatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 px-4 py-3">
      {children}
    </div>
  )
}
