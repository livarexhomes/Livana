import { ShieldCheck, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const BRAND = '#2563EB'
const BRAND_D = '#1D4ED8'

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
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {/* Identity Checks tab */}
      <TabCard
        active={active === 'identity'}
        onClick={() => onChange('identity')}
        icon={ShieldCheck}
        title="Identity Checks"
        description="Review landlord KYC, verify documents & approve identities"
        count={kycCount}
      />
      {/* Listing Approvals tab */}
      <TabCard
        active={active === 'listings'}
        onClick={() => onChange('listings')}
        icon={Building2}
        title="Listing Approvals"
        description="Review new property submissions and approve or reject"
        count={listingsCount}
      />
    </div>
  )
}

interface TabCardProps {
  active: boolean
  onClick: () => void
  icon: typeof ShieldCheck
  title: string
  description: string
  count: number
}

function TabCard({ active, onClick, icon: Icon, title, description, count }: TabCardProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-4 rounded-2xl border-2 p-5 text-left',
        'transition-all duration-200 ease-out hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        active
          ? 'border-transparent shadow-lg shadow-slate-900/10'
          : 'border-slate-200 bg-white shadow-sm shadow-slate-900/5 hover:border-slate-300 hover:shadow-md',
      )}
      style={
        active
          ? {
              background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_D} 100%)`,
              borderColor: 'transparent',
            }
          : undefined
      }
    >
      {/* Active: white overlay card */}
      {active && (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl border border-white/10"
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-colors',
          active
            ? 'bg-white/20 text-white'
            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200',
        )}
        style={active ? { background: 'rgba(255,255,255,0.2)' } : undefined}
      >
        <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 1.8} />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <h3
            className={cn(
              'truncate text-[15px] font-bold tracking-tight',
              active ? 'text-white' : 'text-slate-900',
            )}
          >
            {title}
          </h3>
          {count > 0 && (
            <span
              className={cn(
                'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black',
                active ? 'bg-white/30 text-white' : 'bg-slate-900 text-white',
              )}
              aria-label={`${count} pending`}
            >
              {count}
            </span>
          )}
        </div>
        <p
          className={cn(
            'mt-1 truncate text-[12px] font-medium leading-snug',
            active ? 'text-white/80' : 'text-slate-500',
          )}
        >
          {description}
        </p>
      </div>

      {/* Active arrow */}
      <svg
        className={cn('h-4 w-4 shrink-0 transition-transform duration-200', active ? 'text-white/60' : 'text-slate-300')}
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M6 4l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
