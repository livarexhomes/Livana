/// <reference lib="dom" />

declare const process: { env: Record<string, string | undefined> }

function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
}

/**
 * Verify that the caller is an authenticated, non-anonymous Supabase user with
 * the admin role. The frontend sends the user's access token as a Bearer
 * header; we validate it against Supabase's `/auth/v1/user` endpoint (which
 * accepts the token and returns the user record), then check the user's
 * app_metadata.role === 'admin' (or roles array containing 'admin').
 *
 * This prevents unauthenticated callers from reaching admin-only endpoints.
 * Returns the verified user on success, or null on failure.
 */
export async function requireAdmin(req: any): Promise<{ id: string; email?: string } | null> {
  const SUPABASE_URL = getEnv('SUPABASE_URL') || ''
  const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''

  // The caller's own access token — this is what identifies THEM, not us.
  const authHeader = (req.headers?.authorization || '') as string
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return null

  try {
    // Validate the token: /auth/v1/user returns the user for a valid bearer token.
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_SERVICE_KEY || '',
      },
    })
    if (!userResp.ok) return null
    const user = await userResp.json().catch(() => null)
    if (!user || !user.id) return null

    // Anonymous sign-ins are not admins.
    const isAnon = user.is_anonymous === true
      || (user.app_metadata && user.app_metadata.is_anonymous === true)
    if (isAnon) return null

    // Admin = app_metadata.role === 'admin' (or roles array includes 'admin').
    const meta = user.app_metadata ?? {}
    const isAdmin = meta.role === 'admin'
      || (Array.isArray(meta.roles) && meta.roles.includes('admin'))
    if (!isAdmin) return null

    return { id: String(user.id), email: String(user.email || '') }
  } catch {
    return null
  }
}
