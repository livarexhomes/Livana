
import { useEffect, useState } from 'react'
import { useLocation } from '@/lib/navigation'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'
import { getRedirectForLandlord } from '../lib/auth-callback-utils'
import type { User } from '@supabase/supabase-js'

export { getRedirectForLandlord }

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
    const requestedRole = (queryParams.get('role') ?? '').toLowerCase()

    if (errorParam) {
      setErrorMsg(errorDesc ?? errorParam)
      setTimeout(() => navigate('/login?error=auth_callback_failed'), 3000)
      return
    }

    async function handleUser(user: User) {
      if (isAdminUser(user)) { navigate('/admin'); return }

      const meta = user.user_metadata ?? {}

      // Check both tables in parallel.
      // A user who has a row in `tenants` registered as a tenant — even if
      // the DB trigger incorrectly created a matching row in `landlords`.
      // Always treat them as a tenant in that case, regardless of requestedRole.
      const [landlordResult, tenantResult] = await Promise.all([
        supabase.from('landlords').select('status').eq('user_id', user.id).maybeSingle(),
        supabase.from('tenants').select('id').eq('user_id', user.id).maybeSingle(),
      ])
      const existingLandlord = landlordResult.data as { status: string } | null
      const existingTenant   = tenantResult.data

      const landlordRedirect = existingTenant
        ? null   // has a tenants row → skip landlord flow entirely
        : getRedirectForLandlord(existingLandlord, requestedRole)
      if (landlordRedirect) { navigate(landlordRedirect); return }

      // ── Tenant flow ────────────────────────────────────────────────
      // Update-or-insert so that re-logins (especially Google OAuth) always keep
      // the tenant row in sync with the latest name, email, avatar and provider.
      // Safe against missing UNIQUE constraint on user_id — uses UPDATE then INSERT.
      // Also handles pre-migration DBs where the `provider` column doesn't exist yet.
      const provider = user.app_metadata?.provider ?? 'email'
      const tenantData = {
        full_name:  meta.full_name ?? meta.name ?? user.email?.split('@')[0] ?? 'User',
        email:      user.email ?? null,
        avatar_url: meta.avatar_url ?? meta.picture ?? null,
        provider,
      }
      const { error: updateError } = await supabase
        .from('tenants')
        .update(tenantData)
        .eq('user_id', user.id)
      if (updateError && updateError.code === 'PGRST116') {
        // Row didn't exist — insert it.
        const { error: insertError } = await supabase.from('tenants').insert({
          user_id: user.id,
          ...tenantData,
        })
        if (insertError) console.error('Tenant insert failed:', insertError)
      } else if (updateError) {
        // Column may not exist yet (pre-migration) — try INSERT without provider.
        if (updateError.code === 'PGRST204' || updateError.message?.includes('provider')) {
          const { error: insertError } = await supabase.from('tenants').insert({
            user_id:    user.id,
            full_name:  tenantData.full_name,
            email:      tenantData.email,
            avatar_url: tenantData.avatar_url,
          })
          if (insertError) console.error('Tenant insert (no provider) failed:', insertError)
        } else {
          console.error('Tenant update failed:', updateError)
        }
      }
      navigate(redirectTo)
    }

    // Implicit flow — session is in the URL hash, getSession() picks it up automatically.
    // We then call getUser() to get the freshest user_metadata from the server,
    // since session.user may carry stale metadata baked into the confirmation token.
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error || !session) {
        setErrorMsg(error?.message ?? 'No session found. Please try signing in again.')
        setTimeout(() => navigate('/login?error=auth_callback_failed'), 3000)
        return
      }
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setErrorMsg(userError?.message ?? 'Could not load user. Please try signing in again.')
        setTimeout(() => navigate('/login?error=auth_callback_failed'), 3000)
        return
      }
      await handleUser(user)
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
