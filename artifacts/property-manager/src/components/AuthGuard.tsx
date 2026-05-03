import { useEffect, useState, ReactNode } from 'react'
import { useLocation } from 'wouter'
import { createClient, isSupabaseConfigured } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'

interface AuthGuardProps {
  children: ReactNode
  require: 'landlord' | 'admin' | 'tenant' | 'any'
  redirectTo?: string
}

type Status = 'loading' | 'ok' | 'redirect'

export default function AuthGuard({ children, require: req, redirectTo = '/login' }: AuthGuardProps) {
  const [status, setStatus] = useState<Status>('loading')
  const [, navigate] = useLocation()

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
        if (landlord.status === 'not_submitted') { navigate('/landlord/kyc'); return }
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
