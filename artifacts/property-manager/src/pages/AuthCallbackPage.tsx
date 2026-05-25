import { useEffect } from 'react'
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

  useEffect(() => {
    if (!isSupabaseConfigured()) { navigate('/login?error=not_configured'); return }

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const errorParam = params.get('error')
    const next = params.get('next')

    const redirectTo = isSafePath(next) ? next : '/user'

    // Supabase may return an error directly
    if (errorParam) { navigate('/login?error=auth_callback_failed'); return }

    const supabase = createClient()

    // If no code, try detectSessionInUrl (handles implicit/hash flow)
    if (!code) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) { navigate('/login?error=auth_callback_failed'); return }
        await handleUser(session.user)
      })
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(async ({ error }) => {
      if (error) { navigate('/login?error=auth_callback_failed'); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      await handleUser(user)
    })

    async function handleUser(user: User) {
      const supabase = createClient()
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
        await supabase.from('tenants').insert({ user_id: user.id, full_name: user.user_metadata?.full_name ?? user.email ?? 'User' })
      }

      navigate(redirectTo)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        <p className="text-sm text-gray-500">Signing you in…</p>
      </div>
    </div>
  )
}
