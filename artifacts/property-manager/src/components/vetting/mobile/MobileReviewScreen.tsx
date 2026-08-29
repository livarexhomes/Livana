import { ArrowLeft, Phone, Mail, AlertTriangle, Ban, Clock, FileText, Loader2, X, CheckCircle } from 'lucide-react'
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
      className="vetting-page fixed inset-0 z-40 flex flex-col overflow-hidden bg-[#edf1ed] dark:bg-slate-950 animate-in slide-in-from-right duration-200 motion-reduce:animate-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Review ${landlord.full_name}`}
    >
      {/* Top bar */}
      <div className="shrink-0 border-b border-[#d7e0d9] bg-[#f7f9f5] px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
             className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7e0d9] bg-[#eef3ee] text-[#587067] transition-colors hover:bg-[#e3ece5] dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Back to applicants"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
           <p className="text-[15px] font-semibold tracking-[-0.01em] text-[#18352f] dark:text-white">
            Review applicant
          </p>
          <button
            type="button"
            onClick={onBack}
             className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7e0d9] bg-[#eef3ee] text-[#587067] transition-colors hover:bg-[#e3ece5] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Profile */}
        <div className="mt-3 flex items-center gap-3">
          <div
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[14px] font-bold text-white shadow-sm',
              avatarGrad(landlord.full_name),
            )}
            aria-hidden="true"
          >
            {getInitials(landlord.full_name)}
          </div>
          <div className="min-w-0 flex-1">
             <h2 className="truncate text-[16px] font-semibold text-[#18352f] dark:text-white">
              {landlord.full_name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                  meta.bg,
                  meta.text,
                  meta.border,
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                {meta.label}
              </span>
              {landlord.whatsapp && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <Phone className="h-3 w-3" /> {landlord.whatsapp}
                </span>
              )}
            </div>
            {landlord.email && (
              <div className="mt-1 flex items-center gap-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{landlord.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-3 pb-32 pt-4">
        <div className="space-y-5">
           <section aria-labelledby="m-identity" className="space-y-2">
            <h3
              id="m-identity"
              className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400"
            >
              Identity Information
            </h3>
            <IdentityGrid landlord={landlord} />
          </section>

          <section aria-labelledby="m-docs" className="space-y-2">
            <div className="flex items-center justify-between">
              <h3
                id="m-docs"
                className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400"
              >
               Evidence
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                {docsLoading ? 'Loading…' : `${kycDocs.length}`}
              </span>
            </div>
            {docsLoading ? (
               <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#cbd9cd] bg-[#f3f7f3] p-8 text-[#728279] dark:border-slate-700">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Loading documents…</span>
              </div>
            ) : kycDocs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#cbd9cd] bg-[#f7f9f5] p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                  No documents uploaded
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {kycDocs.map(doc => (
                  <DocumentCard
                    key={doc.doc_type}
                    doc={doc}
                    imgErrored={Boolean(imgErrors[doc.doc_type])}
                    onImgError={() => onImgError(doc.doc_type)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#d7e0d9] bg-[#f7f9f5]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(24,53,47,0.18)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-stretch gap-2">
          {landlord.status !== 'approved' && (
            <ActionBtn
              variant="approve"
              onClick={() => onUpdateStatus(landlord.id, 'approved')}
              loading={busy}
            />
          )}
          {landlord.status !== 'rejected' && (
            <ActionBtn
              variant="reject"
              onClick={() => onUpdateStatus(landlord.id, 'rejected')}
              loading={busy}
            />
          )}
          {landlord.status !== 'suspended' && (
            <ActionBtn
              variant="suspend"
              onClick={() => onUpdateStatus(landlord.id, 'suspended')}
              loading={busy}
            />
          )}
          {landlord.status !== 'pending' && landlord.status !== 'not_submitted' && (
            <ActionBtn
              variant="reset"
              onClick={() => onUpdateStatus(landlord.id, 'pending')}
              loading={busy}
            />
          )}
        </div>
      </div>
    </div>
  )
}

type MobileActionVariant = 'approve' | 'reject' | 'suspend' | 'reset'

const MOBILE_VARIANT: Record<
  MobileActionVariant,
  { label: string; icon: typeof AlertTriangle; cls: string }
> = {
  approve: {
    label: 'Approve',
    icon: CheckCircle,
    cls: 'border-[#b8d7c3] bg-[#e4efe8] text-[#2f7560] hover:bg-[#d8e9de] active:bg-[#c9ddcf] dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60',
  },
  reject: {
    label: 'Reject',
    icon: AlertTriangle,
    cls: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60',
  },
  suspend: {
    label: 'Suspend',
    icon: Ban,
    cls: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 active:bg-amber-200 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60',
  },
  reset: {
    label: 'Reset',
    icon: Clock,
    cls: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60',
  },
}

function ActionBtn({
  variant,
  onClick,
  loading,
}: {
  variant: MobileActionVariant
  onClick: () => void
  loading: boolean
}) {
  const v = MOBILE_VARIANT[variant]
  const Icon = v.icon
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      aria-label={v.label}
      className={cn(
        'flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-3 text-[14px] font-semibold transition-all duration-150 disabled:opacity-50',
        v.cls,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {v.label}
    </button>
  )
}
