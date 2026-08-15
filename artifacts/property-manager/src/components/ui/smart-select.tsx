import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export interface SmartSelectOption {
  value: string
  label: string
  color?: "success" | "warning" | "error" | "info" | "neutral" | "blue" | "amber"
  icon?: React.ReactNode
}

const DOT_COLOR: Record<NonNullable<SmartSelectOption["color"]>, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-blue-500",
  neutral: "bg-slate-400",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
}

export interface SmartSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SmartSelectOption[]
  placeholder?: string
  label?: string
  className?: string
  triggerClassName?: string
  disabled?: boolean
}

/**
 * Premium dropdown select with status indicators and clean spacing.
 * Replaces native <select> for a premium look that works on mobile.
 */
export function SmartSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  label,
  className,
  triggerClassName,
  disabled,
}: SmartSelectProps) {
  const selected = options.find(o => o.value === value)

  return (
    <div className={cn("relative inline-flex", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={true}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 cursor-pointer",
              triggerClassName
            )}
          >
            {label && <span className="hidden sm:inline">{label}:</span>}
            {selected ? (
              <>
                {selected.color && <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_COLOR[selected.color]}`} />}
                <span>{selected.label}</span>
              </>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="min-w-[180px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {label && (
            <>
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 px-2 py-1">
                {label}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="border-slate-100 my-1" />
            </>
          )}
          {options.map(opt => {
            const isSelected = opt.value === value
            return (
              <DropdownMenuItem
                key={opt.value}
                onSelect={() => onValueChange(opt.value)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium cursor-pointer focus:bg-slate-50",
                  isSelected
                    ? "bg-primary/5 text-primary"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                {opt.color && <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_COLOR[opt.color]}`} />}
                {opt.icon}
                <span className="flex-1">{opt.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
