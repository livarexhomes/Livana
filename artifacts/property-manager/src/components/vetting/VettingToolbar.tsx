import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KYC_STATUS_META, type VettingStatus } from './mockData'

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

const SORT_LABELS: Record<SortOrder, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  name_asc: 'Name A–Z',
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
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:gap-3 sm:p-3">
      <div className="flex flex-1 items-center gap-2 sm:max-w-xs">
        <StatusFilter
          value={statusFilter}
          onChange={onStatusFilter}
          tabs={filterTabs}
        />
      </div>

      <div className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-colors focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-blue-500 dark:focus-within:bg-slate-900 dark:focus-within:ring-blue-900/40">
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search name or phone…"
          aria-label="Search applicants"
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch('')}
            className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <SortDropdown value={sort} onChange={onSort} />

      <p className="shrink-0 text-[11px] font-medium text-slate-400 sm:ml-1">
        {resultCount} {resultCount === 1 ? 'result' : 'results'}
      </p>
    </div>
  )
}

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-amber-400',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
  suspended: 'bg-slate-500',
  not_submitted: 'bg-slate-400',
  all: 'bg-blue-500',
}

function StatusFilter({
  value,
  onChange,
  tabs,
}: {
  value: string
  onChange: (v: string) => void
  tabs: FilterTab[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = tabs.find(t => t.key === value) ?? tabs[0]

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  return (
    <div ref={ref} className="relative w-full sm:w-44">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              STATUS_DOT[selected?.key ?? 'all'] ?? 'bg-slate-400',
            )}
          />
          <span className="truncate">{selected?.label}</span>
          {typeof selected?.count === 'number' && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-900/10 px-1 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {selected.count}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          {tabs.map(tab => {
            const meta = tab.key === 'all' ? null : KYC_STATUS_META[tab.key as VettingStatus]
            const dot = STATUS_DOT[tab.key] ?? 'bg-slate-400'
            return (
              <li key={tab.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={tab.key === value}
                  onClick={() => {
                    onChange(tab.key)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-3.5 py-2 text-xs font-semibold transition-colors',
                    tab.key === value
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {meta && (
                    <span className="ml-2 text-[10px] font-bold text-slate-400">
                      {meta.label}
                    </span>
                  )}
                  <span className="ml-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-900/10 px-1 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {tab.count}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function SortDropdown({
  value,
  onChange,
}: {
  value: SortOrder
  onChange: (s: SortOrder) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        <span className="hidden sm:inline">{SORT_LABELS[value]}</span>
        <span className="sm:hidden">Sort</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-30 mt-1.5 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          {(Object.keys(SORT_LABELS) as SortOrder[]).map(k => (
            <li key={k}>
              <button
                type="button"
                role="option"
                aria-selected={k === value}
                onClick={() => {
                  onChange(k)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between px-3.5 py-2 text-xs font-semibold transition-colors',
                  k === value
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800',
                )}
              >
                <span>{SORT_LABELS[k]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
