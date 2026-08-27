import { createElement, isValidElement, ReactNode, type ElementType, type ReactElement } from 'react'
import { ChevronLeft, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  MobileSidebarProvider,
  useMobileSidebar,
} from '@/components/ui/mobile-sidebar-context'

export { MobileSidebarProvider }

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
  icon?: ElementType
  unit?: string
}) {
  const Icon = icon
  return (
    <div className="rounded-[11px] bg-slate-50 border border-slate-200/70 px-3 py-2.5 flex flex-col items-center text-center min-h-[72px]">
      {Icon && <div className="mb-1 text-slate-400"><Icon className="w-4 h-4" /></div>}
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
  icon?: ElementType | ReactElement
  action?: ReactNode
}) {
  const iconNode = isValidElement(icon)
    ? icon
    : icon
      ? createElement(icon as ElementType, { className: 'w-5 h-5 text-slate-400' })
      : <div className="w-4 h-4 rounded-full bg-slate-200" />
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
        {iconNode}
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

/**
 * Compact search input for mobile page-level filtering.
 * Renders a full-width input with search icon and clear button.
 */
export function MobileSearch({
  placeholder = 'Search...',
  value,
  onChange,
  onClear,
  className,
}: {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  className?: string
}) {
  return (
    <div className={cn('relative px-4 mb-3', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
        />
        {value && (
          <button
            type="button"
            onClick={onClear ?? (() => onChange(''))}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Compact filter bar for mobile.
 * Wraps filter controls in a horizontal scrollable row with consistent spacing.
 */
export function MobileFilterBar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 px-4 mb-3', className)}>
      {children}
    </div>
  )
}

/**
 * Reusable list card for mobile.
 * Provides consistent styling for list item cards with optional image, title,
 * subtitle, badge, content area, and actions.
 */
export function MobileListCard({
  image,
  title,
  subtitle,
  badge,
  children,
  actions,
  className,
  onClick,
  testid,
}: {
  image?: ReactNode
  title: string
  subtitle?: string
  badge?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  className?: string
  onClick?: () => void
  testid?: string
}) {
  return (
    <article
      className={cn(
        'bg-white border border-slate-200 rounded-[11px] p-3.5 mb-2 last:mb-0',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
      data-testid={testid}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {image && <div className="flex-shrink-0">{image}</div>}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 text-sm truncate">{title}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{subtitle}</p>}
            {badge && <div className="mt-1">{badge}</div>}
            {children && <div className="mt-2">{children}</div>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
      </div>
    </article>
  )
}

/**
 * Mobile admin header — 56px mobile-only header with hamburger toggle.
 * Use on pages that don't need the full AdminHeader (search results, notifications).
 */
export function MobileAdminHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}) {
  const { setOpen } = useMobileSidebar()
  return (
    <header
      className={cn(
        'sm:hidden h-14 flex items-center px-3 border-b border-slate-200 bg-white',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-10 h-10 rounded-xl text-slate-600 hover:bg-slate-100 flex items-center justify-center -ml-1"
        aria-label="Open navigation menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="flex-1 min-w-0 px-2">
        <h1 className="text-[15px] font-semibold text-slate-900 truncate">{title}</h1>
        {subtitle && <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </header>
  )
}
