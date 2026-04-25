import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Returns true when the user's app_metadata marks them as an admin.
 * Mirrors the check in middleware.ts so both layers agree on what "admin" means.
 */
export function isAdminUser(user: User | null): boolean {
  if (!user) return false
  const meta = user.app_metadata ?? {}
  if (meta.role === 'admin') return true
  if (Array.isArray(meta.roles) && meta.roles.includes('admin')) return true
  return false
}

/**
 * Verifies the caller is an authenticated admin.
 * Returns the user on success, or an error string on failure.
 */
export async function requireAdmin(
  supabase: SupabaseClient
): Promise<{ user: User; error?: never } | { user?: never; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }
  if (!isAdminUser(user)) return { error: 'Forbidden: admin access required' }

  return { user }
}
