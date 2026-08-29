import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterTab {
  key: string
  label: string
  count: number
}

const DOT: Record<string, string> = {
  pending: 'bg-amber-400',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
  suspended: 'bg-orange-400',
  not_submitted: 'bg-slate-300',
  all: 'bg-slate-400',
}

export default function StatusFilterDropdown({
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

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const selected = tabs.find(t => t.key === value) ?? tabs[tabs.length - 1]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
      >
        <span className={cn('h-2 w-2 rounded-full shrink-0', DOT[selected?.key] ?? 'bg-slate-400')} />
        <span>{selected?.label}</span>
        <span className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-bold text-slate-500">
          {selected?.count}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { onChange(tab.key); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-3 px-3.5 py-2.5 text-xs font-semibold transition-colors',
                tab.key === value
                  ? 'bg-primary text-white'
                  : 'text-slate-700 hover:bg-slate-50',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full shrink-0', tab.key === value ? 'bg-white/60' : DOT[tab.key] ?? 'bg-slate-400')} />
              <span className="flex-1 text-left">{tab.label}</span>
              <span className={cn(
                'inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold',
                tab.key === value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
