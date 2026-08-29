import { ShieldCheck, Building2, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type VettingTab = 'identity' | 'listings'

interface VettingTabsProps {
  active: VettingTab
  onChange: (tab: VettingTab) => void
  kycCount: number
  listingsCount: number
}

export default function VettingTabs({ active, onChange, kycCount, listingsCount }: VettingTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Vetting workspace"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4"
    >
      <TabCard
        active={active === 'identity'}
        onClick={() => onChange('identity')}
        icon={ShieldCheck}
        iconBg="bg-[#dfece4] text-[#2f7560] dark:bg-blue-950/50 dark:text-blue-300"
        title="Identity Checks"
        description="Review landlord KYC submissions and documents"
        count={kycCount}
        accent="blue"
      />
      <TabCard
        active={active === 'listings'}
        onClick={() => onChange('listings')}
        icon={Building2}
        iconBg="bg-[#dce9ed] text-[#315f6f] dark:bg-violet-950/50 dark:text-violet-300"
        title="Listing Approvals"
        description="Approve or reject new property submissions"
        count={listingsCount}
        accent="violet"
      />
    </div>
  )
}

interface TabCardProps {
  active: boolean
  onClick: () => void
  icon: typeof ShieldCheck
  iconBg: string
  title: string
  description: string
  count: number
  accent: 'blue' | 'violet'
}

function TabCard({ active, onClick, icon: Icon, iconBg, title, description, count, accent }: TabCardProps) {
  const activeRing =
    accent === 'blue'
      ? 'border-[#6d9b87] ring-1 ring-[#c9d8cf] bg-[#edf5ef] dark:border-blue-500 dark:ring-blue-900/60 dark:bg-blue-950/20'
      : 'border-[#6d9b87] ring-1 ring-[#c9d8cf] bg-[#eef5f5] dark:border-violet-500 dark:ring-violet-900/60 dark:bg-violet-950/20'

  const countTone =
    accent === 'blue'
      ? 'bg-[#2f7560] text-white'
      : 'bg-[#315f6f] text-white'

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-4 rounded-[1.25rem] border bg-[#fbfcfa] p-4 text-left shadow-[0_5px_18px_rgba(24,53,47,0.05)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(24,53,47,0.09)] motion-reduce:transform-none motion-reduce:transition-none dark:bg-slate-900',
        active
          ? activeRing
          : 'border-[#d7e0d9] hover:border-[#a7c0b0] dark:border-slate-700 dark:hover:border-slate-600',
      )}
    >
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
          iconBg,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[15px] font-semibold text-[#18352f] dark:text-white">
            {title}
          </h3>
          {count > 0 && (
            <span
              className={cn(
                'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black',
                countTone,
              )}
              aria-label={`${count} pending`}
            >
              {count}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      <ArrowUpRight
        className={cn(
          'h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-slate-600',
          active && 'text-slate-500 dark:text-slate-400',
        )}
      />
    </button>
  )
}
