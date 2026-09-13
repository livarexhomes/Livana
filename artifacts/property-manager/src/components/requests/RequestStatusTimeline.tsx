import type { PropertyRequest } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  reviewing: 'Reviewing',
  searching: 'Searching',
  matched: 'Matched',
  inspection: 'Inspection',
  completed: 'Completed',
  closed: 'Closed',
}

interface RequestStatusTimelineProps {
  request: PropertyRequest
}

export default function RequestStatusTimeline({ request }: RequestStatusTimelineProps) {
  const steps = [
    {
      label: 'Request Sent',
      note: 'Your request has been submitted.',
      complete: true,
      current: false,
    },
    {
      label: 'Received by LIVAREX',
      note: 'Your request is in the queue for review.',
      complete: true,
      current: false,
    },
    {
      label: 'Acknowledged by Admin',
      note:
        request.status === 'submitted'
          ? 'Awaiting admin acknowledgement.'
          : 'An admin has acknowledged your request.',
      complete: request.status !== 'submitted',
      current: request.status === 'submitted',
    },
    {
      label: 'Reviewing',
      note: 'Our team is checking the request details.',
      complete: ['reviewing', 'searching', 'matched', 'inspection', 'completed'].includes(request.status),
      current: request.status === 'reviewing',
    },
    {
      label: 'Searching',
      note: 'We are looking for matching properties.',
      complete: ['searching', 'matched', 'inspection', 'completed'].includes(request.status),
      current: request.status === 'searching',
    },
    {
      label: 'Matched',
      note: 'Relevant properties have been identified.',
      complete: ['matched', 'inspection', 'completed'].includes(request.status),
      current: request.status === 'matched',
    },
    {
      label: 'Inspection',
      note: 'Inspection or follow-up coordination is in progress.',
      complete: ['inspection', 'completed'].includes(request.status),
      current: request.status === 'inspection',
    },
    {
      label: 'Completed',
      note: 'The request has reached its final stage.',
      complete: request.status === 'completed',
      current: request.status === 'completed',
    },
  ]

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Status Timeline</p>
      <div className="mt-4 space-y-3">
        {steps.map((step, index) => {
          const isCurrent = step.current
          const isComplete = step.complete

          return (
            <div key={step.label} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : isComplete
                        ? 'border-blue-300 bg-blue-100 text-blue-600'
                        : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`mt-2 h-6 w-px ${isComplete ? 'bg-blue-300' : 'bg-slate-200'}`} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${isCurrent ? 'text-blue-700' : isComplete ? 'text-slate-700' : 'text-slate-400'}`}>
                  {step.label}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">{step.note}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-2.5 py-2 text-[11px] text-blue-700">
        Current stage: <span className="font-semibold">{STATUS_LABELS[request.status] ?? request.status}</span>
      </div>
    </div>
  )
}
