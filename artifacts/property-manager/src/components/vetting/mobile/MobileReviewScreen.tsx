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

interface MobileReviewScreenProps {
  landlord: VettingLandlord
  kycDocs: VettingKycDoc[]
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
      {/* Top bar */}
      <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
            aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="flex-1 text-[15px] font-black text-slate-900 tracking-tight">Review applicant</p>
          <button type="button" onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
            aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Profile header */}
      <div className="shrink-0 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            'relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-[16px] font-black text-white shadow-lg',
            avatarGrad(landlord.full_name),
          )}>
            {getInitials(landlord.full_name)}
            <span className={cn(
              'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white',
              landlord.status === 'approved'     && 'bg-emerald-500',
              landlord.status === 'pending'     && 'bg-amber-400',
              landlord.status === 'rejected'    && 'bg-red-500',
              landlord.status === 'suspended'   && 'bg-orange-500',
              landlord.status === 'not_submitted' && 'bg-slate-300',
            )}/>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-black text-slate-900 tracking-tight">{landlord.full_name}</h2>
            <span className={cn('mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold', meta.bg, meta.text, meta.border)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
              {meta.label}
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {landlord.whatsapp && (
                <a href={`tel:${landlord.whatsapp}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
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
        <div className="mt-4">
          <StatusBanner status={landlord.status} />
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pb-36 pt-4">
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Identity Details</h3>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            <IdentityGrid landlord={landlord} />
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Documents</h3>
                <div className="h-px flex-1 min-w-6 bg-slate-100" />
              </div>
              <span className="text-[11px] font-bold text-slate-400">{docsLoading ? '…' : kycDocs.length}</span>
            </div>
            {docsLoading ? (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                <span className="text-sm font-medium text-slate-500">Loading…</span>
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
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.12)]">
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
  approve:  { label: 'Approve',  icon: CheckCircle,    cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200' },
  reject:  { label: 'Reject',   icon: AlertTriangle,  cls: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200' },
  suspend: { label: 'Suspend',  icon: Ban,            cls: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 active:bg-amber-200' },
  reset:   { label: 'Reset',    icon: Clock,          cls: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:bg-slate-200' },
}

function ActionBtn({ variant, onClick, loading }: { variant: MobileActionVariant; onClick: () => void; loading: boolean }) {
  const v = MOBILE_VARIANT[variant]
  const Icon = v.icon
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className={cn(
        'flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 text-[11px] font-bold transition-all disabled:opacity-50',
        v.cls,
      )}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {v.label}
    </button>
  )
}

function StatusBanner({ status }: { status: VettingStatus }) {
  const configs = {
    approved:       { icon: CheckCircle,    bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', title: 'Verified',           sub: 'Active on platform' },
    pending:       { icon: Clock,          bg: 'bg-amber-50 border-amber-200',   text: 'text-amber-700',   title: 'Awaiting review',     sub: 'Review and decide' },
    rejected:      { icon: AlertTriangle,  bg: 'bg-red-50 border-red-200',      text: 'text-red-700',     title: 'Rejected',            sub: 'Reset to allow resubmission' },
    suspended:     { icon: Ban,            bg: 'bg-orange-50 border-orange-200',text: 'text-orange-700',  title: 'Suspended',           sub: 'Account paused' },
    not_submitted: { icon: CheckCircle,    bg: 'bg-slate-50 border-slate-200',  text: 'text-slate-600',   title: 'Not submitted',       sub: 'No KYC on record' },
  }
  const cfg = configs[status]
  const Icon = cfg.icon
  return (
    <div className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3', cfg.bg, cfg.text)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="text-[13px] font-bold">{cfg.title}</p>
        <p className="text-[11px] opacity-80">{cfg.sub}</p>
      </div>
    </div>
  )
}
