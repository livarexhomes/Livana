import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    const noopBuilder: any = new Proxy(function () {}, {
      get(_target, prop) {
        if (prop === 'then') return undefined
        return () => noopBuilder
      },
      apply() {
        return Promise.resolve({ data: [], error: null })
      },
    })
    return {
      auth: {
        async getUser() { return { data: { user: null }, error: null } },
        async getSession() { return { data: { session: null }, error: null } },
      },
      from: () => noopBuilder,
      storage: { from: () => ({ upload: async () => ({ error: { message: 'Supabase not configured' } }) }) },
    } as any
  }

  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // setAll called from a Server Component — cookies will be set by middleware
        }
      },
    },
  })
}
