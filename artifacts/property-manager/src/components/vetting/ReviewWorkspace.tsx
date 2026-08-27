import { useState, useEffect } from 'react'
import { X, Phone, Mail, CheckCircle, AlertTriangle, Ban, Clock, ShieldCheck, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  KYC_STATUS_META,
  avatarGrad,
  getInitials,
  type VettingLandlord,
  type VettingKycDoc,
  type VettingStatus,
} from './mockData'
import IdentityGrid from './IdentityGrid'
import DocumentCard from './DocumentCard'
import ReviewActionCard from './ReviewActionCard'

interface ReviewWorkspaceProps {
  landlord: VettingLandlord | null
  kycDocs: VettingKycDoc[]
  docsLoading?: boolean
  processing?: string | null
  imgErrors: Record<string, boolean>
  onImgError: (key: string) => void
  onClose: () => void
  onUpdateStatus: (id: string, status: VettingStatus) => Promise<void> | void
}

export default function ReviewWorkspace({
  landlord,
  kycDocs,
  docsLoading = false,
  processing = null,
  imgErrors,
  onImgError,
  onClose,
  onUpdateStatus,
}: ReviewWorkspaceProps) {
  if (!landlord) {
    return <EmptyWorkspace />
  }

  const meta = KYC_STATUS_META[landlord.status] ?? KYC_STATUS_META.pending
  const busy = processing === landlord.id
  const [liveMessage, setLiveMessage] = useState<string>('')

  useEffect(() => {
    if (!liveMessage) return
    const t = setTimeout(() => setLiveMessage(''), 3000)
    return () => clearTimeout(t)
  }, [liveMessage])

  async function handleStatus(next: VettingStatus, label: string) {
    setLiveMessage(`${label} in progress…`)
    await onUpdateStatus(landlord!.id, next)
    setLiveMessage(`${label} successful`)
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
      role="region"
      aria-label={`Review ${landlord.full_name}`}
    >
      <div
        className="shrink-0 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5 dark:border-slate-800"
        aria-live="polite"
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-bold text-white shadow-sm sm:h-16 sm:w-16 sm:text-[15px]',
              avatarGrad(landlord.full_name),
            )}
            aria-hidden="true"
          >
            {getInitials(landlord.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="truncate text-[18px] font-semibold text-[#0B1F4D] dark:text-white sm:text-[20px]">
                {landlord.full_name}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="Close review"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
                  meta.bg,
                  meta.text,
                  meta.border,
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                {meta.label}
              </span>
              {landlord.whatsapp && (
                <span className="inline-flex items-center gap-1 text-[12px] text-slate-500 dark:text-slate-400">
                  <Phone className="h-3 w-3" /> {landlord.whatsapp}
                </span>
              )}
              {landlord.email && (
                <span className="inline-flex items-center gap-1 truncate text-[12px] text-slate-500 dark:text-slate-400">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{landlord.email}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status banner */}
        <div className="mt-4">
          <StatusBanner status={landlord.status} />
        </div>
      </div>

      <div
        className={cn(
          'flex-1 overflow-y-auto p-4 sm:p-6 motion-reduce:transition-none',
          'animate-in fade-in-50 duration-200',
        )}
        key={landlord.id}
      >
        <div className="space-y-5 sm:space-y-6">
          {/* Review actions */}
          <section aria-labelledby="actions-heading" className="space-y-3">
            <h3
              id="actions-heading"
              className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400"
            >
              Review Actions
            </h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              {landlord.status !== 'rejected' && (
                <ReviewActionCard
                  variant="reject"
                  icon={AlertTriangle}
                  title="Reject"
                  description="Permanently reject this submission"
                  onClick={() => handleStatus('rejected', 'Rejection')}
                  loading={busy}
                />
              )}
              {landlord.status !== 'suspended' && (
                <ReviewActionCard
                  variant="suspend"
                  icon={Ban}
                  title="Suspend"
                  description="Temporarily suspend this account"
                  onClick={() => handleStatus('suspended', 'Suspension')}
                  loading={busy}
                />
              )}
              {landlord.status !== 'pending' && landlord.status !== 'not_submitted' && (
                <ReviewActionCard
                  variant="reset"
                  icon={Clock}
                  title="Reset to Pending"
                  description="Move back to pending review"
                  onClick={() => handleStatus('pending', 'Reset')}
                  loading={busy}
                />
              )}
            </div>
            {landlord.status !== 'approved' && landlord.status !== 'pending' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                <p className="font-semibold uppercase tracking-wider text-slate-400">
                  Quick add
                </p>
                <p className="mt-1">
                  Use the Approve button on the <span className="font-semibold">Landlords</span>{' '}
                  page to verify this landlord. This panel is for review state changes only.
                </p>
              </div>
            )}
          </section>

          {/* Identity information */}
          <section aria-labelledby="identity-heading" className="space-y-3">
            <h3
              id="identity-heading"
              className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400"
            >
              Identity Information
            </h3>
            <IdentityGrid landlord={landlord} />
          </section>

          {/* Documents */}
          <section aria-labelledby="docs-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3
                id="docs-heading"
                className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400"
              >
                Documents
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                {docsLoading ? 'Loading…' : `${kycDocs.length} file${kycDocs.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            {docsLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 p-8 text-slate-400 dark:border-slate-700">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Loading documents…</span>
              </div>
            ) : kycDocs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
                <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                  No documents uploaded
                </p>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  This landlord hasn&apos;t submitted KYC files yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      <div role="status" className="sr-only">
        {liveMessage}
      </div>
    </div>
  )
}

function StatusBanner({ status }: { status: VettingStatus }) {
  if (status === 'approved') {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-[12px] font-semibold">Verification successful</p>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
            This landlord has been verified and is active on the platform.
          </p>
        </div>
      </div>
    )
  }
  if (status === 'rejected') {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-[12px] font-semibold">Submission rejected</p>
          <p className="text-[11px] text-red-700/80 dark:text-red-300/80">
            Use Reset KYC on the Landlords page to allow resubmission.
          </p>
        </div>
      </div>
    )
  }
  if (status === 'suspended') {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
        <Ban className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-[12px] font-semibold">Account suspended</p>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
            This account is currently suspended from the platform.
          </p>
        </div>
      </div>
    )
  }
  if (status === 'pending') {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-200">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-[12px] font-semibold">Awaiting your review</p>
          <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
            Review identity &amp; documents, then approve, reject, or suspend.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="text-[12px] font-semibold">No submission yet</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          This landlord hasn&apos;t started KYC yet. They will appear here once they submit documents.
        </p>
      </div>
    </div>
  )
}

function EmptyWorkspace() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <ShieldCheck className="h-10 w-10 text-slate-300 dark:text-slate-600" />
      </div>
      <h3 className="text-[18px] font-semibold text-slate-800 dark:text-white">
        Select a landlord to review
      </h3>
      <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
        Pick a name from the queue to view identity details, documents, and review actions.
      </p>
    </div>
  )
}
