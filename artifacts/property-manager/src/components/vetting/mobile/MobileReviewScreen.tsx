import { ArrowLeft, Phone, Mail, AlertTriangle, Ban, Clock, FileText, Loader2, X, CheckCircle, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  KYC_STATUS_META,
  avatarGrad,
  getInitials,
  type VettingLandlord,
  type VettingKycDoc,
  type VettingStatus,
} from '../mockData'
import IdentityGrid from '../IdentityGrid'
import DocumentCard from '../DocumentCard'

const BRAND   = '#2563EB'
const BRAND_D = '#1D4ED8'
const ACCENT  = '#3B82F6'

interface MobileReviewScreenProps {
  landlord: VettingLandlord
  kycDocs: VettingKycDoc[]
  docsError?: string
  docsLoading?: boolean
  processing?: string | null
  imgErrors: Record<string, boolean>
  onImgError: (key: string) => void
  onBack: () => void
  onUpdateStatus: (id: string, status: VettingStatus) => Promise<void> | void
}

export default function MobileReviewScreen({
  landlord,
  kycDocs,
  docsError,
  docsLoading = false,
  processing = null,
  imgErrors,
  onImgError,
  onBack,
  onUpdateStatus,
}: MobileReviewScreenProps) {
  const meta = KYC_STATUS_META[landlord.status] ?? KYC_STATUS_META.pending
  const busy = processing === landlord.id

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-white animate-in slide-in-from-right duration-200 motion-reduce:animate-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Review ${landlord.full_name}`}
    >
      {/* Top bar with gradient wash */}
      <div className="relative shrink-0 overflow-hidden border-b border-slate-100 bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              'radial-gradient(60% 100% at 0% 0%, rgba(99,102,241,0.08) 0%, transparent 70%)',
          }}
        />
        <div className="relative flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-700"
            aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Review applicant</p>
            <p className="truncate text-[15px] font-extrabold tracking-tight text-slate-900">Decision Workspace</p>
          </div>
          <button type="button" onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Profile header */}
      <div className="relative shrink-0 overflow-hidden border-b border-slate-100 px-4 py-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(99,102,241,0.05) 0%, rgba(168,85,247,0.03) 100%)',
          }}
        />
        <div className="relative flex items-start gap-3">
          <div className={cn(
            'relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-[16px] font-black text-white shadow-lg shadow-blue-500/20 ring-2 ring-white',
            avatarGrad(landlord.full_name),
          )}>
            {getInitials(landlord.full_name)}
            <span className={cn(
              'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white shadow-sm',
              landlord.status === 'approved'     && 'bg-emerald-500',
              landlord.status === 'pending'     && 'bg-amber-400',
              landlord.status === 'rejected'    && 'bg-red-500',
              landlord.status === 'suspended'   && 'bg-orange-500',
              landlord.status === 'not_submitted' && 'bg-slate-300',
            )}/>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-extrabold tracking-tight text-slate-900">{landlord.full_name}</h2>
            <span className={cn('mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold', meta.bg, meta.text, meta.border)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
              {meta.label}
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {landlord.whatsapp && (
                <a href={`tel:${landlord.whatsapp}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                  <Phone className="h-3 w-3" />{landlord.whatsapp}
                </a>
              )}
              {landlord.city && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                  <MapPin className="h-3 w-3" />{landlord.city}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="relative mt-4">
          <StatusBanner status={landlord.status} />
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pb-36 pt-4">
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Identity Details</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
            </div>
            <IdentityGrid landlord={landlord} />
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Documents</h3>
                <div className="h-px flex-1 min-w-6 bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                {docsLoading ? '…' : kycDocs.length}
              </span>
            </div>
            {docsLoading ? (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                <span className="text-sm font-medium text-slate-500">Loading…</span>
              </div>
            ) : docsError ? (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {docsError}
              </div>
            ) : kycDocs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-[13px] font-semibold text-slate-500">No documents uploaded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {kycDocs.map(doc => (
                  <DocumentCard key={doc.doc_type} doc={doc}
                    imgErrored={Boolean(imgErrors[doc.doc_type])}
                    onImgError={() => onImgError(doc.doc_type)} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_32px_-12px_rgba(99,102,241,0.18)] backdrop-blur">
        <div className="grid grid-cols-4 gap-2">
          {landlord.status !== 'approved' && (
            <ActionBtn variant="approve" onClick={() => onUpdateStatus(landlord.id, 'approved')} loading={busy} />
          )}
          {landlord.status !== 'rejected' && (
            <ActionBtn variant="reject" onClick={() => onUpdateStatus(landlord.id, 'rejected')} loading={busy} />
          )}
          {landlord.status !== 'suspended' && (
            <ActionBtn variant="suspend" onClick={() => onUpdateStatus(landlord.id, 'suspended')} loading={busy} />
          )}
          {landlord.status !== 'pending' && landlord.status !== 'not_submitted' && (
            <ActionBtn variant="reset" onClick={() => onUpdateStatus(landlord.id, 'pending')} loading={busy} />
          )}
        </div>
      </div>
    </div>
  )
}

type MobileActionVariant = 'approve' | 'reject' | 'suspend' | 'reset'

const MOBILE_VARIANT: Record<MobileActionVariant, { label: string; icon: typeof AlertTriangle; cls: string }> = {
  approve:  { label: 'Approve',  icon: CheckCircle,    cls: 'border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200' },
  reject:  { label: 'Reject',   icon: AlertTriangle,  cls: 'border-red-200/80 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200' },
  suspend: { label: 'Suspend',  icon: Ban,            cls: 'border-amber-200/80 bg-amber-50 text-amber-700 hover:bg-amber-100 active:bg-amber-200' },
  reset:   { label: 'Reset',    icon: Clock,          cls: 'border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 active:bg-slate-200' },
}

function ActionBtn({ variant, onClick, loading }: { variant: MobileActionVariant; onClick: () => void; loading: boolean }) {
  const v = MOBILE_VARIANT[variant]
  const Icon = v.icon
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className={cn(
        'flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 text-[11px] font-bold transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1',
        v.cls,
      )}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" strokeWidth={2.2} />}
      {v.label}
    </button>
  )
}

function StatusBanner({ status }: { status: VettingStatus }) {
  const configs = {
    approved: {
      icon: CheckCircle,    bg: 'bg-gradient-to-br from-emerald-50 to-teal-50/60 border-emerald-200/80', text: 'text-emerald-700',
      iconBg: 'bg-emerald-100 text-emerald-600',
      title: 'Verified',  sub: 'Active on platform',
    },
    pending: {
      icon: Clock,          bg: 'bg-gradient-to-br from-amber-50 to-orange-50/60 border-amber-200/80',   text: 'text-amber-700',
      iconBg: 'bg-amber-100 text-amber-600',
      title: 'Awaiting review', sub: 'Review and decide',
    },
    rejected: {
      icon: AlertTriangle,  bg: 'bg-gradient-to-br from-red-50 to-rose-50/60 border-red-200/80',     text: 'text-red-700',
      iconBg: 'bg-red-100 text-red-600',
      title: 'Rejected',    sub: 'Reset to allow resubmission',
    },
    suspended: {
      icon: Ban,            bg: 'bg-gradient-to-br from-orange-50 to-amber-50/60 border-orange-200/80', text: 'text-orange-700',
      iconBg: 'bg-orange-100 text-orange-600',
      title: 'Suspended',   sub: 'Account paused',
    },
    not_submitted: {
      icon: CheckCircle,    bg: 'bg-gradient-to-br from-slate-50 to-slate-100/60 border-slate-200/80',   text: 'text-slate-600',
      iconBg: 'bg-slate-200 text-slate-500',
      title: 'Not submitted', sub: 'No KYC on record',
    },
  }
  const cfg = configs[status]
  const Icon = cfg.icon
  return (
    <div className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm', cfg.bg, cfg.text)}>
      <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', cfg.iconBg)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-extrabold tracking-tight">{cfg.title}</p>
        <p className="text-[11px] opacity-80 leading-relaxed">{cfg.sub}</p>
      </div>
    </div>
  )
}