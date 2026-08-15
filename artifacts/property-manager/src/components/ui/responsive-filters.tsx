import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export interface FilterTab {
  key: string
  label: string
  count?: number
}

export interface ResponsiveFiltersProps {
  tabs: FilterTab[]
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
}

const DESKTOP_ACTIVE = "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
const DESKTOP_INACTIVE = "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"

/**
 * Renders compact filter pills on desktop and a single dropdown on mobile.
 * Prevents horizontal overflow on small screens.
 */
export function ResponsiveFilters({
  tabs,
  value,
  onChange,
  label = "Status",
  className,
}: ResponsiveFiltersProps) {
  const activeLabel = tabs.find(t => t.key === value)?.label ?? label

  return (
    <div className={cn("w-full", className)}>
      {/* ── Mobile: single dropdown ───────────────────────── */}
      <div className="sm:hidden">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
        >
          {tabs.map(t => (
            <option key={t.key} value={t.key}>
              {t.label}
              {t.count !== undefined ? ` (${t.count})` : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
      </div>

      {/* ── Desktop: compact pills ───────────────────────── */}
      <div className="hidden sm:flex sm:items-center sm:gap-1.5 sm:overflow-x-auto sm:-mx-1 sm:px-1">
        {tabs.map(t => {
          const isActive = t.key === value
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                isActive ? DESKTOP_ACTIVE : DESKTOP_INACTIVE
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cn(
                    "inline-flex h-4 min-w-[16px] items-center justify-center rounded-full text-[10px] font-bold",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-slate-100 text-slate-500"
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
