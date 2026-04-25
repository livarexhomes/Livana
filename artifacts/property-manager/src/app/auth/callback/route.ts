import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSafeNextPath } from '@/lib/safe-redirect'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  // Validate the redirect destination before using it to prevent open-redirect
  const redirectTo = isSafeNextPath(next) ? next : '/admin'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  return NextResponse.redirect(`${origin}/admin/login?error=auth_callback_failed`)
}
