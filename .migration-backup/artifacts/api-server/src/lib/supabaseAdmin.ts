import { createClient } from '@supabase/supabase-js'

// Service-role client — never expose this to the browser.
// Used only for admin operations such as generating confirmation links.
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Lazy singleton
let _admin: ReturnType<typeof getSupabaseAdmin> | null = null
export const supabaseAdmin = new Proxy({} as ReturnType<typeof getSupabaseAdmin>, {
  get(_target, prop) {
    if (!_admin) _admin = getSupabaseAdmin()
    return (_admin as unknown as Record<string | symbol, unknown>)[prop]
  },
})
