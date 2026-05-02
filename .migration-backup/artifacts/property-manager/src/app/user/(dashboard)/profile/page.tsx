'use client'

import { useState, useEffect, useActionState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { upsertUserProfile } from '@/lib/actions/user'
import type { UserProfileFormState } from '@/lib/actions/user'

export default function UserProfilePage() {
  const [tenant, setTenant] = useState<{ full_name: string; phone: string | null } | null>(null)
  const [state, action, pending] = useActionState<UserProfileFormState, FormData>(upsertUserProfile, {})

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('tenants')
        .select('full_name, phone')
        .eq('user_id', user.id)
        .single()
      if (data) setTenant(data)
    }
    load()
  }, [])

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Profile</h2>
        <p className="text-sm text-gray-500 mt-1">Update your personal details.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <form action={action} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
            <input
              name="full_name"
              type="text"
              required
              defaultValue={tenant?.full_name ?? ''}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#aadb5a] focus:border-transparent"
              placeholder="Your full name"
            />
            {state.fieldErrors?.full_name && (
              <p className="text-xs text-red-600 mt-1">{state.fieldErrors.full_name[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone <span className="text-gray-400">(optional)</span>
            </label>
            <input
              name="phone"
              type="tel"
              defaultValue={tenant?.phone ?? ''}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#aadb5a] focus:border-transparent"
              placeholder="+234 800 000 0000"
            />
          </div>

          {state.error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              {state.error}
            </div>
          )}

          {state.success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3.5 py-2.5">
              Profile updated.
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-2.5 px-4 bg-[#aadb5a] hover:bg-[#9bcf4a] disabled:opacity-60
              text-gray-900 text-sm font-semibold rounded-lg transition focus:outline-none focus:ring-2
              focus:ring-[#aadb5a] focus:ring-offset-2"
          >
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
