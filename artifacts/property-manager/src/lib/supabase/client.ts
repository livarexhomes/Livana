import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If credentials are missing (e.g. local dev before secrets are wired),
  // return a permissive stub so client components don't crash on import.
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
    const noopAuth = {
      async getUser() { return { data: { user: null }, error: null } },
      async getSession() { return { data: { session: null }, error: null } },
      async signOut() { return { error: null } },
      async signInWithPassword() { return { data: { user: null, session: null }, error: { message: 'Supabase not configured' } } },
      async signUp() { return { data: { user: null, session: null }, error: { message: 'Supabase not configured' } } },
      async exchangeCodeForSession() { return { data: { session: null }, error: null } },
    }
    return {
      auth: noopAuth,
      from: () => noopBuilder,
      storage: { from: () => ({ upload: async () => ({ error: { message: 'Supabase not configured' } }) }) },
    } as any
  }

  return createBrowserClient(url, key)
}
