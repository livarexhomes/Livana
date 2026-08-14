/**
 * POST /api/delete-user
 *
 * Permanently deletes a user from Supabase Auth (auth.users). Because every
 * profile table (tenants, landlords) has ON DELETE CASCADE on user_id, the
 * single auth deletion cascades to all related rows automatically.
 *
 * Body:   { userId: string }          — the auth.users UUID to delete
 * Header: Authorization: Bearer <admin_access_token>
 *
 * Only callable by admin users (verified via app_metadata.role = 'admin').
 * Uses the service-role key server-side, so it never touches the client.
 */

function getEnv(key) {
  if (typeof process !== 'undefined' && process.env) return process.env[key]
  return undefined
}

function sendJson(res, status, body) {
  if (typeof res.status === 'function') { res.status(status).json(body); return }
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function getErrorMessage(data) {
  if (!data || typeof data !== 'object') return ''
  const e = data
  return String(e.error || e.message || e.msg || e.details || e.hint || '').trim()
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    if (typeof req.body === 'string') {
      try { return resolve(JSON.parse(req.body)) } catch { return resolve(null) }
    }
    if (req.body && typeof req.body === 'object') return resolve(req.body)
    if (typeof req.json === 'function') { req.json().then(resolve).catch(() => resolve(null)); return }
    let raw = ''
    req.on('data', (chunk) => {
      if (typeof chunk === 'string') raw += chunk
      else if (chunk instanceof Uint8Array) raw += new TextDecoder().decode(chunk)
      else raw += String(chunk)
    })
    req.on('end', () => { try { resolve(JSON.parse(raw)) } catch { resolve(null) } })
    req.on('error', () => resolve(null))
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const SUPABASE_URL     = (getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || '').replace(/\/$/, '')
  const SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return sendJson(res, 500, { error: 'Server not configured' })
  }

  // ── 1. Verify the caller is an admin ────────────────────────────────────────
  const authHeader  = (req.headers?.authorization ?? req.headers?.Authorization ?? '')
  const callerToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!callerToken) return sendJson(res, 401, { error: 'Missing authorization token' })

  const callerRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${callerToken}`, apikey: SERVICE_ROLE_KEY },
  })
  if (!callerRes.ok) return sendJson(res, 401, { error: 'Invalid token' })

  const callerUser = await callerRes.json().catch(() => null)
  const meta       = callerUser?.app_metadata ?? {}
  const isAdmin    = meta.role === 'admin' || (Array.isArray(meta.roles) && meta.roles.includes('admin'))
  if (!isAdmin) return sendJson(res, 403, { error: 'Admin access required' })

  // ── 2. Validate body ─────────────────────────────────────────────────────────
  const body   = await parseJsonBody(req)
  const userId = (body?.userId ?? '').trim()
  if (!userId) return sendJson(res, 400, { error: 'userId is required' })

  // Prevent an admin from accidentally deleting their own account
  if (callerUser?.id === userId) {
    return sendJson(res, 400, { error: 'Cannot delete your own account' })
  }

  // SECURITY: admins are protected. This endpoint is intended for tenant
  // account deletion from the admin dashboard; an admin must never be
  // deletable through it. Admin accounts can only be removed via direct
  // Supabase intervention.
  const targetRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
  })
  const targetUser = await targetRes.json().catch(() => null)
  const targetMeta = targetUser?.app_metadata ?? {}
  const targetIsAdmin =
    targetMeta.role === 'admin' ||
    (Array.isArray(targetMeta.roles) && targetMeta.roles.includes('admin'))
  if (targetIsAdmin) {
    return sendJson(res, 403, {
      error: 'Admin accounts are protected and cannot be deleted from this endpoint.',
    })
  }

  // ── 3. Delete from auth.users ─────────────────────────────────────────────
  // ON DELETE CASCADE propagates to: tenants → enquiries, saved_properties
  //                                  landlords → properties, landlord_settings
  const deleteRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
  })

  if (!deleteRes.ok) {
    const errData = await deleteRes.json().catch(() => null)
    console.error('[delete-user] Supabase delete failed', deleteRes.status, errData)
    return sendJson(res, deleteRes.status, { error: getErrorMessage(errData) || 'Failed to delete user' })
  }

  return sendJson(res, 200, { ok: true })
}
