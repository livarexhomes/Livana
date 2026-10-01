import { ShieldCheck, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type VettingTab = 'identity' | 'listings'

interface VettingTabsProps {
  active: VettingTab
  onChange: (tab: VettingTab) => void
  kycCount: number
  listingsCount: number
}

// Segmented control container that wraps the tab buttons in a single,
// premium glassy pill.
export default function VettingTabs({
  active, onChange, kycCount, listingsCount,
}: VettingTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Vetting workspace"
      className="relative inline-flex items-center gap-1 rounded-2xl border border-slate-200/70 bg-slate-100/60 p-1 shadow-inner shadow-slate-900/[0.04]"
    >
      <TabBtn
        active={active === 'identity'}
        onClick={() => onChange('identity')}
        icon={ShieldCheck}
        label="Identity Checks"
        count={kycCount}
      />
      <TabBtn
        active={active === 'listings'}
        onClick={() => onChange('listings')}
        icon={Building2}
        label="Listing Approvals"
        count={listingsCount}
      />
    </div>
  )
}

function TabBtn({
  active, onClick, icon: Icon, label, count,
}: {
  active: boolean
  onClick: () => void
  icon: typeof ShieldCheck
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-100',
        active
          ? 'bg-white text-slate-900 shadow-md shadow-slate-900/[0.08] ring-1 ring-slate-200/80'
          : 'text-slate-500 hover:text-slate-800',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-md transition-colors',
          active
            ? 'bg-gradient-to-br from-blue-500 to-blue-500 text-white shadow-sm shadow-blue-500/30'
            : 'text-slate-400',
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.4 : 1.8} />
      </span>
      {label}
      {count > 0 && (
        <span
          className={cn(
            'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold transition-colors',
            active
              ? 'bg-gradient-to-br from-blue-500 to-blue-500 text-white shadow-sm shadow-blue-500/30'
              : 'bg-slate-200/70 text-slate-500',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}