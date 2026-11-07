import { ShieldCheck, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type VettingTab = 'identity' | 'listings'

interface VettingTabsProps {
  active: VettingTab
  onChange: (tab: VettingTab) => void
  kycCount: number
  listingsCount: number
}

export default function VettingTabs({
  active, onChange, kycCount, listingsCount,
}: VettingTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Vetting workspace"
      className="inline-flex max-w-full items-center gap-4 overflow-x-auto"
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
        'relative inline-flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-1 py-2 text-xs font-medium transition-colors sm:text-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2',
        active
          ? 'border-blue-600 text-slate-900'
          : 'border-transparent text-slate-500 hover:text-slate-900',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-5 w-5 items-center justify-center transition-colors',
          active
            ? 'text-blue-600'
            : 'text-slate-400',
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={active ? 2.2 : 1.8} />
      </span>
      {label}
      {count > 0 && (
        <span
          className={cn(
            'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold transition-colors',
            active
              ? 'bg-blue-50 text-blue-700'
              : 'bg-slate-100 text-slate-600',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}