import { useRef } from 'react'
import { Loader2, Users, SearchX } from 'lucide-react'
import ApplicantCard from './ApplicantCard'
import type { VettingLandlord } from './mockData'

interface ApplicantListProps {
  landlords: VettingLandlord[]
  selectedId?: string
  onSelect: (landlord: VettingLandlord) => void
  loading?: boolean
  toolbar?: React.ReactNode
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
      className={`flex h-full min-h-0 flex-col overflow-hidden bg-white ${className ?? ''}`}
    >
      {/* Toolbar area */}
      {toolbar && (
        <div className="shrink-0">
          {toolbar}
        </div>
      )}

      {/* List */}
      <div
        ref={containerRef}
        role="listbox"
        aria-label="Vetting applicants"
        className="flex-1 overflow-y-auto"
      >
        {loading ? (
          <div className="flex min-h-[min(55vh,520px)] items-center justify-center px-5" aria-busy="true">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
              <p className="text-sm font-medium text-slate-500">Loading applicants…</p>
            </div>
          </div>
        ) : landlords.length === 0 ? (
          <div className="flex min-h-[min(55vh,520px)] flex-col items-center justify-center px-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <SearchX className="h-6 w-6" />
            </div>
            <div className="mt-4 max-w-[220px]">
              <p className="text-sm font-semibold text-slate-800">
                No applicants in this queue
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                New landlord applications will appear here when they’re submitted.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500">
                <Users className="h-3.5 w-3.5" />
                Applications are listed here
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
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