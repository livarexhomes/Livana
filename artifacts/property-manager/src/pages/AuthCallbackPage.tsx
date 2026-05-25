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
    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get('error')
    const errorDesc = params.get('error_description')
    const code = params.get('code')
    const next = params.get('next')
    const redirectTo = isSafePath(next) ? next : '/user'

    // Supabase returned an OAuth error directly
    if (errorParam) {
      setErrorMsg(errorDesc ?? errorParam)
      setTimeout(() => navigate('/login?error=auth_callback_failed'), 3000)
      return
    }

    async function handleUser(user: User) {
      if (isAdminUser(user)) { navigate('/admin'); return }

      const { data: landlord } = await supabase.from('landlords').select('status').eq('user_id', user.id).single() as { data: { status: string } | null }
      if (landlord) {
        if (landlord.status === 'pending') { navigate('/landlord/pending'); return }
        if (landlord.status === 'rejected') { navigate('/landlord/rejected'); return }
        navigate('/landlord')
        return
      }

      const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).single() as { data: { id: string } | null }
      if (!tenant) {
        await supabase.from('tenants').insert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name ?? user.email ?? 'User',
        })
      }
      navigate(redirectTo)
    }

    // PKCE flow — exchange code for session
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
        if (error) {
          setErrorMsg(error.message)
          setTimeout(() => navigate('/login?error=auth_callback_failed'), 3000)
          return
        }
        const user = data.session?.user
        if (!user) { navigate('/login'); return }
        await handleUser(user)
      })
      return
    }

    // Fallback — session may already exist
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
