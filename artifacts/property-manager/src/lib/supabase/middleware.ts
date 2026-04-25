import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Without credentials we cannot evaluate auth — let the request pass.
  // Pages that depend on Supabase will surface their own errors.
  if (!url || !key) {
    return supabaseResponse
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh session — do not add logic between createServerClient and getUser
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // --- Admin route protection ---
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  if (pathname === '/admin/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  // --- Landlord route protection ---
  const landlordPublic = ['/landlord/login', '/landlord/register']
  if (
    pathname.startsWith('/landlord') &&
    !landlordPublic.includes(pathname) &&
    !user
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/landlord/login'
    return NextResponse.redirect(url)
  }

  if (landlordPublic.includes(pathname) && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/landlord'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
