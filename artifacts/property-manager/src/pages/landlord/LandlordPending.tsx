import { useCallback, useEffect, useState } from 'react'
import { Check, Clock3, Loader2, RefreshCw } from 'lucide-react'
import { Link, useLocation } from '@/lib/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'

type VerificationStatus = 'not_submitted' | 'pending' | 'reviewing' | 'approved' | 'rejected' | 'suspended'
type Application = {
  full_name: string
  status: VerificationStatus
  kyc_submitted_at: string | null
  kyc_review_started_at: string | null
  kyc_review_completed_at: string | null
}

const STATUS_COPY: Record<VerificationStatus, { heading: string; summary: string; decision: string }> = {
  not_submitted: {
    heading: 'Complete your verification',
    summary: 'Your application has not been submitted for review yet.',
    decision: 'Not submitted',
  },
  pending: {
    heading: 'Application received',
    summary: 'Your application is in the verification queue and will be reviewed by the LIVAREX Team.',
    decision: 'Awaiting review',
  },
  reviewing: {
    heading: 'Application under review',
    summary: 'The LIVAREX Team has started reviewing your landlord verification.',
    decision: 'Reviewing',
  },
  approved: {
    heading: 'Application approved',
    summary: 'Your landlord account is verified and ready to use.',
    decision: 'Approved',
  },
  rejected: {
    heading: 'Application needs attention',
    summary: 'The review is complete. Please contact support for help with next steps.',
    decision: 'Review complete',
  },
  suspended: {
    heading: 'Account suspended',
    summary: 'Your account is currently suspended. Please contact support for assistance.',
    decision: 'Suspended',
  },
}

export default function LandlordPending() {
  const [, navigate] = useLocation()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadApplication = useCallback(async (background = false) => {
    if (!isSupabaseConfigured()) {
      setError('Verification status is unavailable because the service is not configured.')
      setLoading(false)
      return
    }

    if (background) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) {
        navigate('/login')
        return
      }

      const { data, error: queryError } = await supabase
        .from('landlords')
        .select('full_name, status, kyc_submitted_at, kyc_review_started_at, kyc_review_completed_at')
        .eq('user_id', user.id)
        .maybeSingle()
      if (queryError) throw queryError
      if (!data) {
        setError('We could not find a landlord application for this account.')
        return
      }
      setApplication(data as Application)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load your verification status.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [navigate])

  useEffect(() => {
    void loadApplication()
    const refresh = () => { void loadApplication(true) }
    const interval = window.setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
    }
  }, [loadApplication])

  const status = application?.status ?? 'pending'
  const copy = STATUS_COPY[status]
  const submittedAt = application?.kyc_submitted_at
  const reviewStartedAt = application?.kyc_review_started_at
  const reviewCompletedAt = application?.kyc_review_completed_at
  const submittedLabel = submittedAt && !Number.isNaN(Date.parse(submittedAt))
    ? new Date(submittedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null
  const reviewStartedLabel = reviewStartedAt && !Number.isNaN(Date.parse(reviewStartedAt))
    ? new Date(reviewStartedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null
  const reviewCompletedLabel = reviewCompletedAt && !Number.isNaN(Date.parse(reviewCompletedAt))
    ? new Date(reviewCompletedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null
  const reviewComplete = status === 'approved' || status === 'rejected' || status === 'suspended'

  const steps = [
    {
      label: 'Application submitted',
      detail: submittedLabel ? `Submitted ${submittedLabel}` : 'Your verification details are on file.',
      complete: status !== 'not_submitted',
      current: status === 'not_submitted',
    },
    {
      label: 'Admin review',
      detail: status === 'reviewing'
        ? `Review started${reviewStartedLabel ? ` ${reviewStartedLabel}` : ''}.`
        : reviewComplete
          ? `Review completed${reviewCompletedLabel ? ` ${reviewCompletedLabel}` : ''}${reviewStartedLabel ? ` (started ${reviewStartedLabel})` : ''}.`
          : 'Your application is waiting for an administrator to begin review.',
      complete: status === 'reviewing' || reviewComplete,
      current: status === 'reviewing' || status === 'pending',
    },
    {
      label: copy.decision,
      detail: reviewComplete
        ? status === 'approved' ? 'Your account is approved.' : status === 'rejected' ? 'Contact support to discuss next steps.' : 'Contact support for assistance.'
        : 'You will see the outcome here when the review is complete.',
      complete: reviewComplete,
      current: reviewComplete,
    },
  ]

  return (
    <div className="min-h-dvh bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${status === 'approved' ? 'bg-emerald-100 text-emerald-700' : status === 'rejected' || status === 'suspended' ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
              {status === 'approved' ? <Check className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{loading ? 'Loading verification status…' : copy.heading}</h1>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{application?.full_name ? `Hi ${application.full_name}, ` : ''}{copy.summary}</p>
            </div>
          </div>
          <button type="button" onClick={() => void loadApplication(true)} disabled={loading || refreshing}
            aria-label="Refresh verification status"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

        <section aria-label="Verification status timeline" className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">Verification timeline</h2>
            {!loading && (
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${status === 'approved' ? 'bg-emerald-100 text-emerald-700' : status === 'rejected' || status === 'suspended' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                {copy.decision}
              </span>
            )}
          </div>
          <ol className="mt-5 space-y-0">
            {steps.map((step, index) => (
              <li key={step.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                    step.current
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : step.complete
                        ? 'border-blue-200 bg-blue-100 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-400'
                  }`}>
                    {step.complete && !step.current ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  {index < steps.length - 1 && <span className={`my-1 min-h-8 w-px ${step.complete ? 'bg-blue-200' : 'bg-slate-200'}`} />}
                </div>
                <div className="pb-5">
                  <p className={`text-sm font-semibold ${step.current ? 'text-blue-700' : step.complete ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-slate-500">
            Status refreshes automatically while this page is open.
          </p>
        </section>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {status === 'approved' ? (
            <Link href="/landlord" className="block rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700">
              Go to landlord dashboard
            </Link>
          ) : status === 'not_submitted' ? (
            <Link href="/landlord/onboarding" className="block rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700">
              Continue verification
            </Link>
          ) : (
            <Link href="/" className="block rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700">
              Back to Home
            </Link>
          )}
          <Link href="/contact" className="block rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}
