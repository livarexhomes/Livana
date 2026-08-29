import { useRef, type ReactNode } from 'react'
import { Loader2, Users, ListFilter } from 'lucide-react'
import ApplicantCard from './ApplicantCard'
import { MobileEmptyState } from '@/components/ui/mobile-admin'
import type { VettingLandlord } from './mockData'

interface ApplicantListProps {
  landlords: VettingLandlord[]
  selectedId?: string
  onSelect: (landlord: VettingLandlord) => void
  loading?: boolean
  toolbar?: ReactNode
  className?: string
}

export default function ApplicantList({
  landlords,
  selectedId,
  onSelect,
  loading = false,
  toolbar,
  className,
}: ApplicantListProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  function focusCardByIndex(idx: number) {
    const cards = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')
    cards?.[idx]?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (!landlords.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusCardByIndex(Math.min(idx + 1, landlords.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusCardByIndex(Math.max(idx - 1, 0))
    } else if (e.key === 'Home') {
      e.preventDefault()
      focusCardByIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      focusCardByIndex(landlords.length - 1)
    }
  }

  return (
    <div
      className={
        'flex h-full min-h-0 flex-col overflow-hidden rounded-[1.25rem] border border-[#d7e0d9] bg-[#fbfcfa] shadow-[0_5px_18px_rgba(24,53,47,0.05)] dark:border-slate-700 dark:bg-slate-900 ' +
        (className ?? '')
      }
    >
      {toolbar && (
        <div className="shrink-0 border-b border-[#e5ece6] p-3 pb-3 dark:border-slate-800">
          <div className="mb-2 flex items-center gap-2 px-1">
            <ListFilter className="h-3.5 w-3.5 text-[#6d9b87]" />
            <span className="ops-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#728279]">Review queue</span>
          </div>
          {toolbar}
        </div>
      )}

      <div
        ref={containerRef}
        role="listbox"
        aria-label="Vetting applicants"
        className="flex-1 overflow-y-auto"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20" aria-busy="true">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : landlords.length === 0 ? (
            <div className="py-12">
            <MobileEmptyState
              title="No applicants"
              description="Try a different filter or search term."
              icon={<Users className="h-5 w-5 text-slate-300" />}
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {landlords.map((l, idx) => (
              <ApplicantCard
                key={l.id}
                landlord={l}
                selected={selectedId === l.id}
                onSelect={() => onSelect(l)}
                onKeyDown={e => handleKeyDown(e, idx)}
                tabIndex={idx === 0 || selectedId === l.id ? 0 : -1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
