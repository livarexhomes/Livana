import * as React from "react"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<string, {
  label: string
  bg: string
  text: string
  dot: string
}> = {
  // KYC / client status
  approved:      { label: "Approved",      bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  pending:       { label: "KYC Pending",   bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-500"   },
  rejected:      { label: "Rejected",      bg: "bg-red-50",      text: "text-red-700",     dot: "bg-red-500"     },
  suspended:     { label: "Suspended",     bg: "bg-red-50",      text: "text-red-700",     dot: "bg-red-500"     },
  not_submitted: { label: "Not Submitted", bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400"   },

  // Property status
  available:     { label: "Available",     bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  taken:         { label: "Taken",         bg: "bg-rose-50",     text: "text-rose-700",    dot: "bg-rose-500"    },
  under_negotiation: { label: "Negotiating", bg: "bg-amber-50", text: "text-amber-700",   dot: "bg-amber-500"   },
  coming_soon:   { label: "Coming Soon",   bg: "bg-blue-50",  text: "text-blue-700",    dot: "bg-blue-500"  },

  // Support ticket status
  open:          { label: "Open",          bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-500"   },
  in_progress:   { label: "In Progress",   bg: "bg-blue-50",     text: "text-blue-700",    dot: "bg-blue-500"   },
  resolved:      { label: "Resolved",      bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  closed:        { label: "Closed",        bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400"   },

  // Project status
  active:        { label: "Active",        bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  completed:     { label: "Completed",     bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400"  },
  on_hold:       { label: "On Hold",       bg: "bg-orange-50",   text: "text-orange-700",  dot: "bg-orange-500" },

  // Generic semantic
  success:       { label: "Success",       bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  warning:       { label: "Warning",       bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-500"   },
  error:         { label: "Error",         bg: "bg-red-50",      text: "text-red-700",     dot: "bg-red-500"     },
  info:          { label: "Info",          bg: "bg-blue-50",     text: "text-blue-700",    dot: "bg-blue-500"   },
  neutral:       { label: "Neutral",       bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400"   },
}

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string
  label?: string
  showDot?: boolean
  size?: 'sm' | 'md'
}

export function StatusBadge({
  status,
  label,
  showDot = true,
  size = 'md',
  className,
  ...props
}: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.neutral
  const displayLabel = label ?? cfg.label
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px]'
    : 'px-2.5 py-1 text-xs'
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        sizeClasses,
        cfg.bg,
        cfg.text,
        className
      )}
      {...props}
    >
      {showDot && <span className={`shrink-0 rounded-full ${size === 'sm' ? 'h-1 w-1' : 'h-1.5 w-1.5'} ${cfg.dot}`} />}
      {displayLabel}
    </span>
  )
}
