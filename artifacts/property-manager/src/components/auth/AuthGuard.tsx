import { useEffect, useState, useRef, ReactNode } from 'react'
import { useLocation } from '@/lib/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import { isAdminUser } from '@/lib/auth'

interface AuthGuardProps {
  children: ReactNode
  require: 'landlord' | 'admin' | 'tenant' | 'any'
  redirectTo?: string
}

type Status = 'loading' | 'ok' | 'redirect'

export default function AuthGuard({ children, require: req, redirectTo = '/login' }: AuthGuardProps) {
  const [status, setStatus] = useState<Status>('loading')
  const [, navigate] = useLocation()
  const cleanupRef = useRef<(() => void) | undefined>(undefined)

  useEffect(() => {
    if (!isSupabaseConfigured()) { setStatus('redirect'); navigate(redirectTo); return }
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { navigate(redirectTo); return }

      if (req === 'any') { setStatus('ok'); return }

      if (req === 'admin') {
        if (isAdminUser(user)) { setStatus('ok') }
        else { navigate('/'); }
        return
      }

      if (req === 'landlord') {
        const { data: landlord } = await supabase.from('landlords').select('id, status').eq('user_id', user.id).single() as { data: { id: string; status: string } | null }
        if (!landlord) { navigate('/'); return }
        if (landlord.status === 'not_submitted') { navigate('/landlord/onboarding'); return }
        if (landlord.status === 'pending') { navigate('/landlord/pending'); return }
        if (landlord.status === 'rejected') { navigate('/landlord/rejected'); return }
        if (landlord.status === 'suspended') { navigate('/landlord/suspended'); return }
        setStatus('ok')
        return
      }

      if (req === 'tenant') {
        setStatus('ok')
        return
      }
    })
  }, [req, redirectTo])

  // ── Admin-only: session timeout + login notifications ──────────────────────
  useEffect(() => {
    if (status !== 'ok' || req !== 'admin') return

    let mounted = true
    const supabase = createClient()

    supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['security'])
      .then(({ data }) => {
        if (!mounted) return
        const sec = (data ?? []).find((r: any) => r.key === 'security')?.value ?? {}

        // ── Login notification (once per browser session) ──────────────────
        const NOTIF_KEY = 'livarex-login-notified'
        if (sec.loginNotifications && !sessionStorage.getItem(NOTIF_KEY)) {
          sessionStorage.setItem(NOTIF_KEY, '1')
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session?.access_token) return
            fetch('/api/notify-admin-login', {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.access_token}` },
            }).catch(() => { /* best-effort */ })
          })
        }

        // ── Session timeout (inactivity auto-logout) ───────────────────────
        const timeoutMs = (sec.sessionTimeout ?? 0) * 60 * 1000
        if (timeoutMs > 0) {
          let timer: ReturnType<typeof setTimeout>

          const reset = () => {
            clearTimeout(timer)
            timer = setTimeout(async () => {
              await supabase.auth.signOut()
              window.location.href = '/admin'
            }, timeoutMs)
          }

          const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'] as const
          events.forEach(e => window.addEventListener(e, reset, { passive: true }))
          reset() // start the initial timer

          cleanupRef.current = () => {
            clearTimeout(timer)
            events.forEach(e => window.removeEventListener(e, reset))
          }
        }
      })

    return () => {
      mounted = false
      cleanupRef.current?.()
      cleanupRef.current = undefined
    }
  }, [status, req])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#0c0c15] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (status === 'redirect') return null

  return <>{children}</>
}
