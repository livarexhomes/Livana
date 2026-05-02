'use client'

import { useActionState } from 'react'
import { submitContactMessage, type ContactFormState } from '@/lib/actions/contact'

const initialState: ContactFormState = {}

export default function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactMessage, initialState)

  if (state.success) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 min-h-[260px] text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Message sent!</p>
          <p className="text-sm text-gray-500 mt-1">We typically respond within 1–2 business days.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
      <h2 className="text-base font-semibold text-gray-900 mb-5">Send us a message</h2>

      {state.error && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <form action={formAction} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input
              type="text"
              name="name"
              required
              placeholder="Your name"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {state.fieldErrors?.name && (
              <p className="text-xs text-red-600 mt-1">{state.fieldErrors.name[0]}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {state.fieldErrors?.email && (
              <p className="text-xs text-red-600 mt-1">{state.fieldErrors.email[0]}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">I am a…</label>
          <select
            name="role"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="renter">Renter</option>
            <option value="landlord">Landlord</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
          <input
            type="text"
            name="subject"
            required
            placeholder="How can we help?"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {state.fieldErrors?.subject && (
            <p className="text-xs text-red-600 mt-1">{state.fieldErrors.subject[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
          <textarea
            name="message"
            required
            rows={5}
            placeholder="Tell us more…"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
          {state.fieldErrors?.message && (
            <p className="text-xs text-red-600 mt-1">{state.fieldErrors.message[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {isPending ? 'Sending…' : 'Send message'}
        </button>

        <p className="text-xs text-center text-gray-400">
          We typically respond within 1–2 business days.
        </p>
      </form>
    </div>
  )
}
