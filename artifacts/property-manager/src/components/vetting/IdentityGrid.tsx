import {
  Calendar, Hash, CreditCard, Mail, Phone, MapPin,
  Clock, CheckCircle, type LucideIcon,
} from 'lucide-react'
import { fmtDate, type VettingLandlord } from './mockData'

const BRAND = '#C8102E'

interface IdentityGridProps {
  landlord: VettingLandlord
}

export default function IdentityGrid({ landlord }: IdentityGridProps) {
  const fields: Array<{ icon: LucideIcon; label: string; value: string; accent?: boolean }> = [
    { icon: Calendar,    label: 'Joined Date',     value: fmtDate(landlord.created_at)       },
    { icon: Clock,      label: 'Submitted Date',  value: fmtDate(landlord.kyc_submitted_at), accent: true },
    { icon: Hash,       label: 'NIN',             value: landlord.nin          || '—' },
    { icon: CreditCard, label: 'ID Type',         value: landlord.id_type      || '—' },
    { icon: Mail,       label: 'Email',           value: landlord.email        || '—' },
    { icon: Phone,      label: 'Phone',           value: landlord.whatsapp     || '—' },
    { icon: MapPin,     label: 'Location',        value: landlord.city         || '—' },
  ]

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {fields.map(f => {
        const Icon = f.icon
        return (
          <div
            key={f.label}
            className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 transition-all hover:border-slate-200 hover:bg-white"
          >
            <div
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: f.accent
                  ? `linear-gradient(135deg, ${BRAND}18, ${BRAND}28)`
                  : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
              }}
            >
              <Icon
                className="h-3.5 w-3.5"
                style={{ color: f.accent ? BRAND : '#94a3b8' }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{f.label}</p>
              <p className="mt-1 truncate text-[13px] font-semibold text-slate-800">{f.value}</p>
            </div>
          </div>
        )
      })}

      {/* Verification status */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 sm:col-span-2 transition-all hover:border-slate-200 hover:bg-white">
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: landlord.is_verified ? '#dcfce7' : '#fef3c7' }}
        >
          {landlord.is_verified
            ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            : <Clock className="h-3.5 w-3.5 text-amber-600" />
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Verification Status</p>
          <p className="mt-1 text-[13px] font-bold" style={{ color: landlord.is_verified ? '#16a34a' : '#d97706' }}>
            {landlord.is_verified ? 'Verified — Identity confirmed' : 'Not verified — Pending review'}
          </p>
        </div>
      </div>
    </div>
  )
}
