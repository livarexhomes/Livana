'use client'

import { useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { submitEnquiry, type EnquiryFormState } from '@/lib/actions/user'

interface EnquireButtonProps {
  propertyId: string
  landlordId: string | null
  isAuthenticated: boolean
}

const initialState: EnquiryFormState = {}

export default function EnquireButton({ propertyId, landlordId, isAuthenticated }: EnquireButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(submitEnquiry, initialState)

  function handleOpen() {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    setOpen(true)
  }

  // Close the panel after a successful submission
  if (state.success && open) {
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
        </svg>
        Enquire
      </button>

      {/* Inline enquiry form — shown below the button when open */}
      {open && (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Send an enquiry</p>

          {state.success && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Enquiry sent! The landlord will be in touch.
            </p>
          )}

          {state.error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <form action={formAction} className="space-y-3">
            <input type="hidden" name="property_id" value={propertyId} />
            {landlordId && <input type="hidden" name="landlord_id" value={landlordId} />}

            <div>
              <textarea
                name="message"
                required
                rows={4}
                placeholder="Hi, I'm interested in this property. Could you share more details?"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white"
              />
              {state.fieldErrors?.message && (
                <p className="text-xs text-red-600 mt-1">{state.fieldErrors.message[0]}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {isPending ? 'Sending…' : 'Send message'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
