import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_PUBLIC_PATHS = new Set(['/admin/login'])
const LANDLORD_PUBLIC_PATHS = new Set(['/landlord/login', '/landlord/register'])
const USER_PUBLIC_PATHS = new Set(['/user/login', '/user/register'])

function isAdminUser(user: { app_metadata?: Record<string, unknown> | null } | null): boolean {
  if (!user) return false
  const meta = user.app_metadata ?? {}
  const role = (meta as Record<string, unknown>).role
  if (role === 'admin') return true
  const roles = (meta as Record<string, unknown>).roles
  if (Array.isArray(roles) && roles.includes('admin')) return true
  return false
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Without credentials, send anyone trying to reach a protected area to
  // its login page so they get a clean error instead of a runtime crash.
  if (!url || !key) {
    if (pathname.startsWith('/admin') && !ADMIN_PUBLIC_PATHS.has(pathname)) {
      const redirect = request.nextUrl.clone()
      redirect.pathname = '/admin/login'
      return NextResponse.redirect(redirect)
    }
    if (
      pathname.startsWith('/landlord') &&
      !LANDLORD_PUBLIC_PATHS.has(pathname)
    ) {
      const redirect = request.nextUrl.clone()
      redirect.pathname = '/landlord/login'
      return NextResponse.redirect(redirect)
    }
    return supabaseResponse
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  // Refresh session — do not add logic between createServerClient and getUser
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // --- Admin route protection (requires admin role on the user) ---
  if (pathname.startsWith('/admin') && !ADMIN_PUBLIC_PATHS.has(pathname)) {
    if (!user) {
      const redirect = request.nextUrl.clone()
      redirect.pathname = '/admin/login'
      return NextResponse.redirect(redirect)
    }
    if (!isAdminUser(user as unknown as { app_metadata?: Record<string, unknown> })) {
      const redirect = request.nextUrl.clone()
      redirect.pathname = '/admin/login'
      redirect.searchParams.set('error', 'forbidden')
      return NextResponse.redirect(redirect)
    }
  }

  if (pathname === '/admin/login' && user && isAdminUser(user as unknown as { app_metadata?: Record<string, unknown> })) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/admin'
    return NextResponse.redirect(redirect)
  }

  // --- Landlord route protection ---
  if (
    pathname.startsWith('/landlord') &&
    !LANDLORD_PUBLIC_PATHS.has(pathname) &&
    !user
  ) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/landlord/login'
    return NextResponse.redirect(redirect)
  }

  // Redirect authenticated users away from landlord login/register,
  // but only if they are not admins (admins may legitimately visit these pages).
  if (LANDLORD_PUBLIC_PATHS.has(pathname) && user && !isAdminUser(user as unknown as { app_metadata?: Record<string, unknown> })) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/landlord'
    return NextResponse.redirect(redirect)
  }

  // --- User (tenant) route protection ---
  if (
    pathname.startsWith('/user') &&
    !USER_PUBLIC_PATHS.has(pathname) &&
    !user
  ) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/user/login'
    return NextResponse.redirect(redirect)
  }

  // Redirect authenticated users away from user login/register
  if (USER_PUBLIC_PATHS.has(pathname) && user) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/user'
    return NextResponse.redirect(redirect)
  }

  return supabaseResponse
}
