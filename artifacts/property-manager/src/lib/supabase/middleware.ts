import { createServerClient } from '@supabase/ssr'
import type { SetAllCookies } from '@supabase/ssr/dist/main/types'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_PAGES = new Set(['/login', '/register'])
const LANDLORD_STATUS_PAGES = new Set(['/landlord/pending', '/landlord/rejected'])

function isAdminUser(user: { app_metadata?: Record<string, unknown> | null } | null): boolean {
  if (!user) return false
  const meta = user.app_metadata ?? {}
  if (meta.role === 'admin') return true
  if (Array.isArray(meta.roles) && meta.roles.includes('admin')) return true
  return false
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    const isProtected =
      pathname.startsWith('/admin') ||
      (pathname.startsWith('/landlord') && !LANDLORD_STATUS_PAGES.has(pathname)) ||
      pathname.startsWith('/user')
    if (isProtected) {
      const redirect = request.nextUrl.clone()
      redirect.pathname = '/login'
      return NextResponse.redirect(redirect)
    }
    return supabaseResponse
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect authenticated users away from /login and /register
  if (AUTH_PAGES.has(pathname) && user) {
    const redirect = request.nextUrl.clone()
    if (isAdminUser(user as unknown as { app_metadata?: Record<string, unknown> })) {
      redirect.pathname = '/admin'
    } else {
      const { data: landlord } = await supabase
        .from('landlords').select('status').eq('user_id', user.id).single()
      if (landlord) {
        redirect.pathname =
          landlord.status === 'pending' ? '/landlord/pending'
          : landlord.status === 'rejected' ? '/landlord/rejected'
          : '/landlord'
      } else {
        redirect.pathname = '/user'
      }
    }
    return NextResponse.redirect(redirect)
  }

  // Admin routes
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const redirect = request.nextUrl.clone()
      redirect.pathname = '/login'
      return NextResponse.redirect(redirect)
    }
    if (!isAdminUser(user as unknown as { app_metadata?: Record<string, unknown> })) {
      const redirect = request.nextUrl.clone()
      redirect.pathname = '/login'
      redirect.searchParams.set('error', 'forbidden')
      return NextResponse.redirect(redirect)
    }
  }

  // Landlord routes (status pages are accessible to any authenticated user)
  if (pathname.startsWith('/landlord') && !LANDLORD_STATUS_PAGES.has(pathname) && !user) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/login'
    return NextResponse.redirect(redirect)
  }

  // User/tenant routes
  if (pathname.startsWith('/user') && !user) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/login'
    return NextResponse.redirect(redirect)
  }

  return supabaseResponse
}
