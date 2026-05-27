import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'
import type { User } from '@supabase/supabase-js'

function isSafePath(next: string | null): next is string {
  if (!next) return false
  try {
    const url = new URL(next, window.location.origin)
    return url.origin === window.location.origin
  } catch {
    return false
  }
}

export default function AuthCallbackPage() {
  const [, navigate] = useLocation()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) { navigate('/login?error=not_configured'); return }

    const supabase = createClient()

    // Check for errors in query params or hash
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
    const queryParams = new URLSearchParams(window.location.search)
    const errorParam = hashParams.get('error') ?? queryParams.get('error')
    const errorDesc = hashParams.get('error_description') ?? queryParams.get('error_description')
    const next = queryParams.get('next')
    const redirectTo = isSafePath(next) ? next : '/user'

    if (errorParam) {
      setErrorMsg(errorDesc ?? errorParam)
      setTimeout(() => navigate('/login?error=auth_callback_failed'), 3000)
      return
    }

    async function handleUser(user: User) {
      if (isAdminUser(user)) { navigate('/admin'); return }

      const meta = user.user_metadata ?? {}

      // ── Landlord flow ──────────────────────────────────────────────
      // Check if a landlord row already exists
      const { data: existingLandlord } = await supabase
        .from('landlords').select('status').eq('user_id', user.id).single() as { data: { status: string } | null }

      if (existingLandlord) {
        if (existingLandlord.status === 'pending')  { navigate('/landlord/pending');  return }
        if (existingLandlord.status === 'rejected') { navigate('/landlord/rejected'); return }
        if (existingLandlord.status === 'suspended') { navigate('/landlord/suspended'); return }
        navigate('/landlord')
        return
      }

      // No landlord row yet — create it now if this user signed up as a landlord.
      // user_metadata.role === 'landlord' is set during LandlordRegisterPage signUp.
      // At this point the session is real and auth.users FK is guaranteed.
      if (meta.role === 'landlord' || meta.whatsapp) {
        await supabase.from('landlords').insert({
          user_id:   user.id,
          full_name: meta.full_name ?? user.email ?? 'Landlord',
          whatsapp:  meta.whatsapp  ?? '',
          city:      meta.city      ?? null,
          bio:       meta.bio       ?? null,
          status:    'not_submitted',
          is_verified: false,
        })
        navigate('/landlord')
        return
      }

      // ── Tenant flow ────────────────────────────────────────────────
      const { data: tenant } = await supabase
        .from('tenants').select('id').eq('user_id', user.id).single() as { data: { id: string } | null }
      if (!tenant) {
        await supabase.from('tenants').insert({
          user_id:   user.id,
          full_name: meta.full_name ?? user.email ?? 'User',
        })
      }
      navigate(redirectTo)
    }

    // Implicit flow — session is in the URL hash, getSession() picks it up automatically
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error || !session) {
        setErrorMsg(error?.message ?? 'No session found. Please try signing in again.')
        setTimeout(() => navigate('/login?error=auth_callback_failed'), 3000)
        return
      }
      await handleUser(session.user)
    })
  }, [])

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-4">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-600 text-lg font-bold">!</span>
          </div>
          <p className="text-sm font-semibold text-gray-800">Sign-in failed</p>
          <p className="text-xs text-gray-500 break-words">{errorMsg}</p>
          <p className="text-xs text-gray-400">Redirecting to login…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        <p className="text-sm text-gray-500">Signing you in…</p>
      </div>
    </div>
  )
}
