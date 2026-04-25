export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSafeNextPath } from '@/lib/safe-redirect'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Callers pass ?next= to control which login page to land on after sign-out.
  // Falls back to /landlord/login for landlord portal, /admin/login for admin.
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next')
  const redirectTo = isSafeNextPath(next) ? next! : '/landlord/login'

  await supabase.auth.signOut()

  return NextResponse.redirect(`${origin}${redirectTo}`, { status: 302 })
}
