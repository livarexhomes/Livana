'use client'

import { useTransition } from 'react'
import { landlordUpdateEnquiryStatus } from '@/lib/actions/landlord-properties'
import type { EnquiryStatus } from '@/lib/types/database'

const NEXT_STATUS: Record<EnquiryStatus, { label: string; next: EnquiryStatus } | null> = {
  open: { label: 'Mark replied', next: 'replied' },
  replied: { label: 'Close', next: 'closed' },
  closed: null,
}

interface EnquiryStatusButtonProps {
  enquiryId: string
  currentStatus: EnquiryStatus
}

export default function EnquiryStatusButton({ enquiryId, currentStatus }: EnquiryStatusButtonProps) {
  const [isPending, startTransition] = useTransition()
  const transition = NEXT_STATUS[currentStatus]

  if (!transition) return null

  function handleClick() {
    startTransition(async () => {
      await landlordUpdateEnquiryStatus(enquiryId, transition!.next)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200
        text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Updating…' : transition.label}
    </button>
  )
}
