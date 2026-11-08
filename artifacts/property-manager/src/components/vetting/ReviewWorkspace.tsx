import { useState, useEffect } from 'react'
import {
  X, Phone, Mail, CheckCircle, AlertTriangle, Ban, Clock,
  ShieldCheck, FileText, Loader2, MapPin,
} from 'lucide-react'
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const BRAND   = '#2563EB'
const ACCENT  = '#3B82F6'

interface ReviewWorkspaceProps {
  landlord: VettingLandlord | null
  applicantCount?: number
  queueLoading?: boolean
  kycDocs: VettingKycDoc[]
  docsError?: string
  docsLoading?: boolean
  processing?: string | null
  imgErrors: Record<string, boolean>
  onImgError: (key: string) => void
  onClose: () => void
  onUpdateStatus: (id: string, status: VettingStatus) => Promise<void> | void
}

export default function ReviewWorkspace({
  landlord,
  applicantCount = 0,
  queueLoading = false,
  kycDocs,
  docsError,
  docsLoading = false,
  processing = null,
  imgErrors,
  onImgError,
  onClose,
  onUpdateStatus,
}: ReviewWorkspaceProps) {
  const [liveMessage, setLiveMessage] = useState<string>('')
  const [pendingDecision, setPendingDecision] = useState<{ status: VettingStatus; label: string } | null>(null)

  useEffect(() => {
    if (!liveMessage) return
    const t = setTimeout(() => setLiveMessage(''), 3000)
    return () => clearTimeout(t)
  }, [liveMessage])

  if (!landlord) {
    return <EmptyWorkspace applicantCount={applicantCount} loading={queueLoading} />
  }

  const meta = KYC_STATUS_META[landlord.status] ?? KYC_STATUS_META.pending
  const busy = processing !== null

  async function handleStatus(next: VettingStatus, label: string) {
    setLiveMessage(`${label} in progress…`)
    try {
      await onUpdateStatus(landlord!.id, next)
      setLiveMessage(`${label} successful`)
      setPendingDecision(null)
    } catch {
      setLiveMessage(`${label} could not be saved`)
    }
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/[0.04]"
      role="region"
      aria-label={`Review ${landlord.full_name}`}
    >
      {/* ── Profile header ── */}
      <div
        className="relative shrink-0 overflow-hidden border-b border-slate-100 px-5 py-5"
        style={{
          background:
            'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(255,255,255,1) 76%)',
        }}
      >
        {/* Decorative pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-50 blur-3xl"
          style={{ background: `radial-gradient(circle, ${BRAND}33 0%, transparent 70%)` }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 top-6 h-24 w-24 rounded-full opacity-40 blur-2xl"
          style={{ background: `radial-gradient(circle, ${ACCENT}33 0%, transparent 70%)` }}
        />

        <div className="relative flex items-start gap-4">
          {/* Avatar */}
          <div
            className={cn(
              'relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-[16px] font-black text-white shadow-lg shadow-blue-500/20 ring-2 ring-white',
              avatarGrad(landlord.full_name),
            )}
            aria-hidden="true"
          >
            {getInitials(landlord.full_name)}
            <span
              className={cn(
                'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white shadow-sm',
                landlord.status === 'approved'     && 'bg-emerald-500',
                landlord.status === 'pending'     && 'bg-amber-400',
                landlord.status === 'reviewing'   && 'bg-blue-500',
                landlord.status === 'rejected'    && 'bg-red-500',
                landlord.status === 'suspended'   && 'bg-orange-500',
                landlord.status === 'not_submitted' && 'bg-slate-300',
              )}
            />
          </div>

          {/* Name + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-[18px] font-extrabold tracking-tight text-slate-900">
                  {landlord.full_name}
                </h2>
                {/* Status badge */}
                <span
                  className={cn(
                    'mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
                    meta.bg, meta.text, meta.border,
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                  {meta.label}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-400 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                aria-label="Close review"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contact chips */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {landlord.whatsapp && (
                <a
                  href={`tel:${landlord.whatsapp}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Phone className="h-3 w-3" />
                  {landlord.whatsapp}
                </a>
              )}
              {landlord.email && (
                <a
                  href={`mailto:${landlord.email}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[180px]">{landlord.email}</span>
                </a>
              )}
              {landlord.city && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
                  <MapPin className="h-3 w-3" />
                  {landlord.city}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status banner */}
        <div className="relative mt-4">
          <StatusBanner status={landlord.status} />
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div
        className="flex-1 overflow-y-auto p-5 space-y-6"
        key={landlord.id}
      >
        {/* ── Decision actions ── */}
        <section aria-labelledby="actions-heading">
          <div className="mb-3 flex items-center gap-2">
            <h3
              id="actions-heading"
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400"
            >
              Make a Decision
            </h3>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            {landlord.status === 'pending' && (
              <ActionBtn variant="review" onClick={() => setPendingDecision({ status: 'reviewing', label: 'Start review' })} loading={busy} />
            )}
            {landlord.status !== 'approved' && (
              <ActionBtn variant="approve"  onClick={() => setPendingDecision({ status: 'approved', label: 'Approve' })}   loading={busy} />
            )}
            {landlord.status !== 'rejected' && (
              <ActionBtn variant="reject"   onClick={() => setPendingDecision({ status: 'rejected', label: 'Reject' })}  loading={busy} />
            )}
            {landlord.status !== 'suspended' && (
              <ActionBtn variant="suspend"  onClick={() => setPendingDecision({ status: 'suspended', label: 'Suspend' })} loading={busy} />
            )}
            {landlord.status !== 'pending' && landlord.status !== 'not_submitted' && (
              <ActionBtn variant="reset"    onClick={() => setPendingDecision({ status: 'pending', label: 'Reset' })}      loading={busy} />
            )}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            Review decisions require confirmation before they are saved.
          </p>
        </section>

        {/* ── Identity information ── */}
        <section aria-labelledby="identity-heading">
          <div className="mb-3 flex items-center gap-2">
            <h3
              id="identity-heading"
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400"
            >
              Identity Details
            </h3>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
          </div>
          <IdentityGrid landlord={landlord} />
        </section>

        {/* ── Documents ── */}
        <section aria-labelledby="docs-heading">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3
                id="docs-heading"
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400"
              >
                Evidence &amp; Documents
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-100 to-transparent min-w-8" />
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              {docsLoading ? 'Loading…' : `${kycDocs.length} file${kycDocs.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {docsLoading ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              <span className="text-sm font-medium text-slate-500">Loading documents…</span>
            </div>
          ) : docsError ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {docsError}
            </div>
          ) : kycDocs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
              <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-[13px] font-semibold text-slate-500">No documents uploaded</p>
              <p className="mt-1 text-[11px] text-slate-400">This landlord hasn't submitted KYC files yet.</p>
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

      <div role="status" className="sr-only">{liveMessage}</div>
      <Dialog open={!!pendingDecision} onOpenChange={open => { if (!open && !busy) setPendingDecision(null) }}>
        {pendingDecision && (
          <DialogContent className="w-[calc(100%-1rem)] max-w-md rounded-xl border-slate-200 bg-white p-0 text-slate-900">
            <DialogHeader className="border-b border-slate-100 px-5 py-4 pr-12 text-left">
              <DialogTitle className="text-base font-semibold">Confirm {pendingDecision.label.toLowerCase()} decision</DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                {pendingDecision.label} identity verification for {landlord.full_name}?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPendingDecision(null)} disabled={busy} className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={() => void handleStatus(pendingDecision.status, pendingDecision.label)} disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Confirm {pendingDecision.label.toLowerCase()}
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

// ── Action buttons ───────────────────────────────────────────────────────────────
type ActionVariant = 'approve' | 'reject' | 'suspend' | 'reset' | 'review'

const ACTION_STYLES: Record<ActionVariant, {
  label: string; icon: typeof CheckCircle; cls: string
}> = {
  approve: {
    label: 'Approve',
    icon: CheckCircle,
    cls: 'border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/10 active:bg-emerald-200',
  },
  reject: {
    label: 'Reject',
    icon: AlertTriangle,
    cls: 'border-red-200/80 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 hover:shadow-md hover:shadow-red-500/10 active:bg-red-200',
  },
  suspend: {
    label: 'Suspend',
    icon: Ban,
    cls: 'border-amber-200/80 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 hover:shadow-md hover:shadow-amber-500/10 active:bg-amber-200',
  },
  reset: {
    label: 'Reset',
    icon: Clock,
    cls: 'border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 hover:border-slate-300 hover:shadow-md hover:shadow-slate-500/10 active:bg-slate-200',
  },
  review: {
    label: 'Start review',
    icon: Clock,
    cls: 'border-blue-200/80 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/10 active:bg-blue-200',
  },
}

function ActionBtn({ variant, onClick, loading }: { variant: ActionVariant; onClick: () => void; loading: boolean }) {
  const s = ACTION_STYLES[variant]
  const Icon = s.icon
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[11px] font-bold transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1',
        s.cls,
      )}
    >
      {loading
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      }
      {s.label}
    </button>
  )
}

// ── Status banner ───────────────────────────────────────────────────────────────
function StatusBanner({ status }: { status: VettingStatus }) {
  const configs = {
    approved: {
      icon: CheckCircle,
      bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/80',
      text: 'text-emerald-700',
      iconBg: 'bg-emerald-100 text-emerald-600',
      title: 'Verification successful',
      sub: 'This landlord has been verified and is active on the platform.',
    },
    pending: {
      icon: Clock,
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50/60 border-amber-200/80',
      text: 'text-amber-700',
      iconBg: 'bg-amber-100 text-amber-600',
      title: 'Awaiting your review',
      sub: 'Review the identity details and documents above, then make a decision.',
    },
    reviewing: {
      icon: Clock,
      bg: 'bg-gradient-to-br from-blue-50 to-sky-50/60 border-blue-200/80',
      text: 'text-blue-700',
      iconBg: 'bg-blue-100 text-blue-600',
      title: 'Review in progress',
      sub: 'The landlord can see that their application is being reviewed.',
    },
    rejected: {
      icon: AlertTriangle,
      bg: 'bg-gradient-to-br from-red-50 to-rose-50/60 border-red-200/80',
      text: 'text-red-700',
      iconBg: 'bg-red-100 text-red-600',
      title: 'Submission rejected',
      sub: 'This landlord was rejected. Reset their status to allow resubmission.',
    },
    suspended: {
      icon: Ban,
      bg: 'bg-gradient-to-br from-orange-50 to-amber-50/60 border-orange-200/80',
      text: 'text-orange-700',
      iconBg: 'bg-orange-100 text-orange-600',
      title: 'Account suspended',
      sub: 'This account has been suspended and cannot access the platform.',
    },
    not_submitted: {
      icon: ShieldCheck,
      bg: 'bg-gradient-to-br from-slate-50 to-slate-100/60 border-slate-200/80',
      text: 'text-slate-600',
      iconBg: 'bg-slate-200 text-slate-500',
      title: 'No submission yet',
      sub: "This landlord hasn't started KYC. They'll appear here once they submit.",
    },
  }
  const cfg = configs[status]
  const Icon = cfg.icon
  return (
    <div className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm', cfg.bg, cfg.text)}>
      <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', cfg.iconBg)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-extrabold tracking-tight">{cfg.title}</p>
        <p className="mt-0.5 text-[11px] opacity-80 leading-relaxed">{cfg.sub}</p>
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyWorkspace({ applicantCount, loading }: { applicantCount: number; loading: boolean }) {
  const isEmpty = !loading && applicantCount === 0
  const steps = [
    { number: '01', label: 'Review profile', description: 'Confirm applicant details', icon: ShieldCheck },
    { number: '02', label: 'Verify documents', description: 'Inspect submitted files', icon: FileText },
    { number: '03', label: 'Make a decision', description: 'Approve or request updates', icon: CheckCircle },
  ]

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_50%_0%,_#eff6ff_0%,_#ffffff_64%)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 py-7 sm:px-8 sm:py-8">
        <div className="w-full max-w-3xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 ring-4 ring-blue-50 sm:h-16 sm:w-16">
            {loading ? <Loader2 className="h-7 w-7 animate-spin" /> : <ShieldCheck className="h-7 w-7" strokeWidth={2} />}
          </div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 shadow-sm">
            <span className={cn('h-1.5 w-1.5 rounded-full', isEmpty ? 'bg-slate-400' : 'bg-blue-600')} />
            {loading ? 'Identity review' : isEmpty ? 'Queue is clear' : 'Identity review'}
          </div>
          <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            {loading
              ? 'Loading the applicant queue'
              : isEmpty
                ? 'No applications to review'
                : 'Select a landlord to get started'}
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            {loading
              ? 'The latest landlord applications are being loaded.'
              : isEmpty
                ? 'There are no applications in this view right now. New submissions will appear here when landlords request verification.'
                : 'Choose an application from the queue to review the landlord’s profile, supporting documents, and verification status.'}
          </p>

          {isEmpty ? (
            <div className="mx-auto mt-7 flex max-w-lg items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Nothing needs your attention</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Try another status filter or check back when new applications arrive.
                </p>
              </div>
            </div>
          ) : !loading ? (
            <div className="mx-auto mt-7 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
              {steps.map(step => {
                const Icon = step.icon
                return (
                  <div key={step.number} className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm shadow-slate-900/[0.02]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-blue-700">{step.number}</span>
                      <Icon className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="mt-3 text-xs font-semibold text-slate-800">{step.label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{step.description}</p>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
      <div className="relative flex shrink-0 items-center justify-center gap-2 border-t border-slate-100/80 bg-white/50 px-4 py-3 text-[10px] font-medium text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
        <span>Secure landlord verification workspace</span>
      </div>
    </div>
  )
}