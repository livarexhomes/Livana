function getEnv(key) {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function getErrorMessage(data) {
  if (!data || typeof data !== 'object') return ''
  const err = data
  return (
    String(err.error || err.message || err.msg || err.details || err.hint || err.error_description || '')
  ).trim()
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    if (typeof req.body === 'string') {
      try {
        return resolve(JSON.parse(req.body))
      } catch {
        return resolve(null)
      }
    }

    if (req.body && typeof req.body === 'object') {
      return resolve(req.body)
    }

    if (typeof req.json === 'function') {
      req.json().then(resolve).catch(() => resolve(null))
      return
    }

    let raw = ''
    req.on('data', (chunk) => {
      if (typeof chunk === 'string') raw += chunk
      else if (chunk instanceof Uint8Array) raw += new TextDecoder().decode(chunk)
      else raw += String(chunk)
    })
    req.on('end', () => {
      if (!raw) return resolve(null)
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve(null)
      }
    })
    req.on('error', () => resolve(null))
  })
}

/**
 * POST /api/register-support-agent
 *
 * Registers (or updates) a support agent in `public.agents`.
 *
 * Two modes:
 *  1. Self-registration (first login of an admin): pass `userId` — the current
 *     user becomes an agent.
 *  2. Add-a-teammate (Support → Agents tab): pass `email` of an existing
 *     Supabase user. The endpoint looks up that user, grants them the Supabase
 *     admin role (app_metadata.role = 'admin') so they can access /admin, and
 *     creates their agents row.
 *
 * Body: { userId?: string, email?: string, name?: string }
 *
 * Auth: uses the Supabase service-role key — RLS on `agents` intentionally has
 * no public INSERT policy.
 *
 * SECURITY: requires the caller to be an authenticated admin (verified via
 * /auth/v1/user against the caller's Bearer token). The `email` (add-teammate)
 * path grants admin, so it must not be callable by non-admins.
 */
export default async function handler(req, res) {
  const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || ''
  const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return sendJson(res, 500, {
      error: 'Missing Supabase environment variables',
      details: 'SUPABASE_URL and a service key (SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY) must be configured',
    })
  }

  // SECURITY: only authenticated admins may register (or grant admin to) agents.
  const { requireAdmin } = await import('./lib/auth-guard.js')
  const admin = await requireAdmin(req)
  if (!admin) {
    return sendJson(res, 401, { error: 'Unauthorized — admin access required' })
  }

  try {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' })
    }

    const body = await parseJsonBody(req)
    if (!body) {
      return sendJson(res, 400, { error: 'Invalid JSON body' })
    }

    const { userId, email, name } = body

    // ── Resolve the target Supabase user (by userId or email) ────────────────
    let targetUser = null

    if (userId && typeof userId === 'string') {
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
      })
      if (!resp.ok) return sendJson(res, 400, { error: 'Supabase user not found' })
      targetUser = await resp.json().catch(() => null)
    } else if (email && typeof email === 'string') {
      // List users filtered by email (service role).
      const resp = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?per_page=200&page=1`,
        {
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            apikey: SUPABASE_SERVICE_KEY,
          },
        },
      )
      if (!resp.ok) return sendJson(res, 400, { error: 'Failed to look up Supabase users' })
      const page = await resp.json().catch(() => null)
      const users = Array.isArray(page?.users) ? page.users : (Array.isArray(page) ? page : [])
      const wanted = String(email).trim().toLowerCase()
      targetUser = users.find((u) => String(u?.email ?? '').toLowerCase() === wanted) ?? null
      if (!targetUser) {
        return sendJson(res, 404, {
          error: 'No Livarex account found with that email. Ask them to sign up first.',
        })
      }
    } else {
      return sendJson(res, 400, { error: 'Provide either userId or email' })
    }

    const targetUserId = String(targetUser?.id ?? '')
    const isAnonymous = targetUser?.is_anonymous === true
      || (targetUser?.app_metadata && targetUser.app_metadata.is_anonymous === true)
    if (!targetUserId || isAnonymous) {
      return sendJson(res, 400, { error: 'Anonymous users cannot be support agents' })
    }

    const targetEmail = String(targetUser?.email ?? email ?? '')
    const agentName = (name && String(name).trim())
      || String(targetUser?.user_metadata?.full_name ?? '')
      || targetEmail.split('@')[0] || 'Support Agent'

    // ── Grant admin role so the agent can access /admin (only needed when an
    //    admin adds a teammate; self-registration already has the role). ─────
    if (email && typeof email === 'string') {
      const appMeta = targetUser?.app_metadata ?? {}
      if (appMeta.role !== 'admin' && !(Array.isArray(appMeta.roles) && appMeta.roles.includes('admin'))) {
        const newMeta = { ...appMeta, role: 'admin' }
        const roleResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(targetUserId)}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            apikey: SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ app_metadata: newMeta }),
        })
        if (!roleResp.ok) {
          return sendJson(res, roleResp.status || 500, {
            error: getErrorMessage(await roleResp.json().catch(() => null)) || 'Failed to grant admin role',
          })
        }
      }
    }

    // ── Upsert the agents row (unique on user_id). ──────────────────────────
    const upsertResponse = await fetch(`${SUPABASE_URL}/rest/v1/agents?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation,resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: targetUserId,
        name: agentName,
        email: targetEmail,
      }),
    })

    if (!upsertResponse.ok) {
      const upsertError = await upsertResponse.json().catch(() => null)
      return sendJson(res, upsertResponse.status || 500, {
        error: getErrorMessage(upsertError) || 'Failed to register support agent',
      })
    }

    const rows = await upsertResponse.json().catch(() => null)
    const agent = Array.isArray(rows) ? rows[0] : rows

    return sendJson(res, 200, {
      success: true,
      grantedAdmin: Boolean(email && typeof email === 'string'),
      agent: agent
        ? { id: agent.id, user_id: agent.user_id, name: agent.name, email: agent.email, role: agent.role, active: agent.active }
        : null,
    })
  } catch (error) {
    return sendJson(res, 500, { error: String(error) })
  }
}
