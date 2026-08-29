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
    <div role="tablist" aria-label="Vetting workspace" className="flex items-center gap-1.5">
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
        'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150',
        active
          ? 'bg-primary text-white shadow-sm shadow-primary/25'
          : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800',
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 1.8} />
      {label}
      {count > 0 && (
        <span className={cn(
          'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
        )}>
          {count}
        </span>
      )}
    </button>
  )
}
