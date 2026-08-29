import { useRef, useEffect, useState } from 'react'
import { Search, X, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const BRAND = '#2563EB'

export type SortOrder = 'newest' | 'oldest' | 'name_asc'

interface FilterTab {
  key: string
  label: string
  count: number
}

interface VettingToolbarProps {
  search: string
  onSearch: (v: string) => void
  statusFilter: string
  onStatusFilter: (v: string) => void
  filterTabs: FilterTab[]
  sort: SortOrder
  onSort: (s: SortOrder) => void
  resultCount: number
}

export default function VettingToolbar({
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  filterTabs,
  sort,
  onSort,
  resultCount,
}: VettingToolbarProps) {
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
    { value: 'newest',   label: 'Newest first' },
    { value: 'oldest',   label: 'Oldest first' },
    { value: 'name_asc', label: 'Name A → Z'  },
  ]

  return (
    <div className="space-y-3">

      {/* Search + Sort row */}
      <div className="flex items-center gap-2">

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search by name, email or phone…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div ref={sortRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setSortOpen(o => !o)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">
              {SORT_OPTIONS.find(o => o.value === sort)?.label}
            </span>
            <ChevronDown className={cn('h-3.5 w-3.5 text-slate-400 transition-transform', sortOpen && 'rotate-180')} />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onSort(opt.value); setSortOpen(false) }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3.5 py-2.5 text-xs font-semibold transition-colors',
                    sort === opt.value
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  {opt.label}
                  {sort === opt.value && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onStatusFilter(tab.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-all duration-150',
              statusFilter === tab.key
                ? 'border-transparent text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
            )}
            style={statusFilter === tab.key ? { background: BRAND, borderColor: BRAND } : undefined}
          >
            {tab.label}
            <span
              className={cn(
                'inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-black',
                statusFilter === tab.key
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-100 text-slate-500',
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}

        {/* Result count */}
        <span className="ml-auto text-[11px] font-medium text-slate-400">
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
