'use client'

import { useActionState } from 'react'
import { upsertLandlordProfile } from '@/lib/actions/landlords'
import type { Landlord } from '@/lib/types/database'

export default function ProfileForm({ landlord }: { landlord: Landlord }) {
  const [state, formAction, pending] = useActionState(upsertLandlordProfile, {})

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          Profile updated successfully.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Personal information</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
          <input name="full_name" type="text" required defaultValue={landlord.full_name}
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          {state.fieldErrors?.full_name && (
            <p className="text-xs text-red-500 mt-1">{state.fieldErrors.full_name[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp number</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </span>
            <input name="whatsapp" type="tel" required defaultValue={landlord.whatsapp}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="+1 234 567 8900" />
          </div>
          {state.fieldErrors?.whatsapp && (
            <p className="text-xs text-red-500 mt-1">{state.fieldErrors.whatsapp[0]}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Shown to prospective tenants on your listings.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
          <textarea name="bio" rows={3} defaultValue={landlord.bio ?? ''}
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            placeholder="A short description about yourself…" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Account status</h3>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
            landlord.status === 'approved' ? 'bg-green-100 text-green-700' :
            landlord.status === 'rejected' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {landlord.status}
          </span>
          {landlord.is_verified && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified landlord
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={pending}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400
            text-white text-sm font-medium rounded-lg transition focus:outline-none focus:ring-2
            focus:ring-indigo-500 focus:ring-offset-2">
          {pending ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  )
}
