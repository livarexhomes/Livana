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

const BRAND   = '#2563EB'
const BRAND_D = '#1D4ED8'
const ACCENT  = '#3B82F6'

interface ReviewWorkspaceProps {
  landlord: VettingLandlord | null
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

  useEffect(() => {
    if (!liveMessage) return
    const t = setTimeout(() => setLiveMessage(''), 3000)
    return () => clearTimeout(t)
  }, [liveMessage])

  if (!landlord) return <EmptyWorkspace />

  const meta = KYC_STATUS_META[landlord.status] ?? KYC_STATUS_META.pending
  const busy = processing === landlord.id

  async function handleStatus(next: VettingStatus, label: string) {
    setLiveMessage(`${label} in progress…`)
    await onUpdateStatus(landlord!.id, next)
    setLiveMessage(`${label} successful`)
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
            'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(168,85,247,0.04) 50%, rgba(255,255,255,1) 100%)',
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
            {landlord.status !== 'approved' && (
              <ActionBtn variant="approve"  onClick={() => handleStatus('approved',   'Approved')}   loading={busy} />
            )}
            {landlord.status !== 'rejected' && (
              <ActionBtn variant="reject"   onClick={() => handleStatus('rejected',   'Rejected')}  loading={busy} />
            )}
            {landlord.status !== 'suspended' && (
              <ActionBtn variant="suspend"  onClick={() => handleStatus('suspended',   'Suspended')} loading={busy} />
            )}
            {landlord.status !== 'pending' && landlord.status !== 'not_submitted' && (
              <ActionBtn variant="reset"    onClick={() => handleStatus('pending',     'Reset')}      loading={busy} />
            )}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            Decisions are applied immediately and the landlord will be notified.
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
    </div>
  )
}

// ── Action buttons ───────────────────────────────────────────────────────────────
type ActionVariant = 'approve' | 'reject' | 'suspend' | 'reset'

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
function EmptyWorkspace() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50/50 via-white to-blue-50/30 p-10 text-center">
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/30 to-blue-500/30 blur-2xl"
        />
        <div
          className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl shadow-lg shadow-blue-500/30 ring-2 ring-white"
          style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_D} 50%, ${ACCENT} 100%)` }}
        >
          <ShieldCheck className="h-10 w-10 text-white" strokeWidth={2.25} />
        </div>
      </div>
      <h3 className="text-[18px] font-extrabold tracking-tight text-slate-800">Select a landlord to review</h3>
      <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-slate-500">
        Pick a landlord from the queue to view their identity details, documents, and make a decision.
      </p>
      <div className="mt-6 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-slate-300" />
        <ShieldCheck className="h-3 w-3" />
        <span className="uppercase tracking-widest">Vetting Hub</span>
        <ShieldCheck className="h-3 w-3" />
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-slate-300" />
      </div>
    </div>
  )
}