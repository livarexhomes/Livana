import {
  Calendar,
  Hash,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import { fmtDate, type VettingLandlord } from './mockData'

interface IdentityGridProps {
  landlord: VettingLandlord
}

export default function IdentityGrid({ landlord }: IdentityGridProps) {
  const fields: Array<{ icon: LucideIcon; label: string; value: string }> = [
    { icon: Calendar,   label: 'Joined Date',   value: fmtDate(landlord.created_at)       },
    { icon: Clock,      label: 'Submitted Date', value: fmtDate(landlord.kyc_submitted_at) },
    { icon: Hash,       label: 'NIN',            value: landlord.nin          || '—' },
    { icon: CreditCard, label: 'ID Type',        value: landlord.id_type      || '—' },
    { icon: Mail,       label: 'Email',          value: landlord.email        || '—' },
    { icon: Phone,      label: 'Phone',          value: landlord.whatsapp     || '—' },
    { icon: MapPin,     label: 'Location',       value: landlord.city         || '—' },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {fields.map(f => {
        const Icon = f.icon
        return (
          <div
            key={f.label}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors dark:border-slate-700 dark:bg-slate-800/60"
          >
            <div className="flex items-center gap-1.5">
              <Icon className="h-3 w-3 text-slate-400 dark:text-slate-500" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {f.label}
              </p>
            </div>
            <p className="mt-1.5 truncate text-[14px] font-semibold text-slate-900 dark:text-white">
              {f.value}
            </p>
          </div>
        )
      })}
    </div>
  )
}
