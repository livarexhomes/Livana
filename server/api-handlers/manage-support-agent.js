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
 * POST /api/manage-support-agent
 *
 * Admin account-control operations for support agents. Uses the Supabase
 * service-role key (same auth model as landlord-register).
 *
 * SECURITY: requires the caller to be an authenticated admin (verified via
 * /auth/v1/user against the caller's Bearer token). Only admins can create,
 * invite, reset, or remove agent accounts.
 *
 * Actions:
 *  - `create`         { email, password, name? }  — create a new Supabase
 *                     account with app_metadata.role='admin' (so they can
 *                     access /admin) + an `agents` row.
 *  - `invite`         { email, name? }              — add an existing Supabase
 *                     user as an agent: grant admin role + create `agents` row.
 *  - `reset-password` { userId }                    — generate a branded
 *                     password-reset email to the user.
 *  - `remove`         { userId }                    — permanently delete the
 *                     Supabase auth account (cascades to the agents row).
 *  - `set-role`       { userId, role }              — set the agents row role
 *                     (agent/support/admin).
 */
export default async function handler(req, res) {
  const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || ''
  const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return sendJson(res, 500, { error: 'Missing Supabase environment variables' })
  }

  // SECURITY: only authenticated admins may manage agent accounts.
  const { requireAdmin } = await import('./lib/auth-guard.js')
  const admin = await requireAdmin(req)
  if (!admin) {
    return sendJson(res, 401, { error: 'Unauthorized — admin access required' })
  }

  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

    const body = await parseJsonBody(req)
    if (!body || !body.action) return sendJson(res, 400, { error: 'Invalid request body' })

    const { action, email, password, name, userId } = body

    // ── create ──────────────────────────────────────────────────────────────
    if (action === 'create') {
      if (!email || !password) return sendJson(res, 400, { error: 'email and password are required' })
      const accountEmail = String(email).trim().toLowerCase()
      const accountName = (name && String(name).trim()) || accountEmail.split('@')[0] || 'Support Agent'

      // Create the auth user with admin role.
      const createResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: accountEmail,
          password: String(password),
          email_confirm: true,
          app_metadata: { role: 'admin' },
          user_metadata: { full_name: accountName },
        }),
      })
      const created = await createResp.json().catch(() => null)
      const newUserId = created?.id
      if (!createResp.ok || typeof newUserId !== 'string') {
        return sendJson(res, createResp.status || 400, {
          error: getErrorMessage(created) || 'Failed to create agent account',
        })
      }

      // Create the agents row.
      const upsert = await fetch(`${SUPABASE_URL}/rest/v1/agents?on_conflict=user_id`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=representation,resolution=merge-duplicates',
        },
        body: JSON.stringify({ user_id: newUserId, name: accountName, email: accountEmail }),
      })
      if (!upsert.ok) {
        return sendJson(res, upsert.status || 500, { error: 'Account created but agent row failed' })
      }

      return sendJson(res, 200, { success: true, userId: newUserId, email: accountEmail })
    }

    // ── invite (existing user → agent) ──────────────────────────────────────
    if (action === 'invite') {
      if (!email) return sendJson(res, 400, { error: 'email is required' })
      const inviteEmail = String(email).trim().toLowerCase()

      // Find the existing Supabase user by email.
      const listResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200&page=1`, {
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
      })
      if (!listResp.ok) return sendJson(res, 400, { error: 'Failed to look up Supabase users' })
      const page = await listResp.json().catch(() => null)
      const users = Array.isArray(page?.users) ? page.users : (Array.isArray(page) ? page : [])
      const existing = users.find((u) => String(u?.email ?? '').toLowerCase() === inviteEmail) ?? null
      if (!existing) {
        return sendJson(res, 404, { error: 'No Livarex account found with that email. Use "Create account" instead.' })
      }

      const existingId = String(existing.id ?? '')
      const isAnon = existing?.is_anonymous === true || (existing?.app_metadata && existing.app_metadata.is_anonymous === true)
      if (!existingId || isAnon) return sendJson(res, 400, { error: 'Anonymous users cannot be support agents' })

      // Grant admin role (app_metadata.role = 'admin').
      const appMeta = existing?.app_metadata ?? {}
      if (appMeta.role !== 'admin' && !(Array.isArray(appMeta.roles) && appMeta.roles.includes('admin'))) {
        const roleResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(existingId)}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            apikey: SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ app_metadata: { ...appMeta, role: 'admin' } }),
        })
        if (!roleResp.ok) return sendJson(res, roleResp.status || 500, { error: 'Failed to grant admin role' })
      }

      // Create/update the agents row.
      const inviteName = (name && String(name).trim())
        || String(existing?.user_metadata?.full_name ?? '')
        || inviteEmail.split('@')[0] || 'Support Agent'
      const upsert = await fetch(`${SUPABASE_URL}/rest/v1/agents?on_conflict=user_id`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=representation,resolution=merge-duplicates',
        },
        body: JSON.stringify({ user_id: existingId, name: inviteName, email: inviteEmail }),
      })
      if (!upsert.ok) return sendJson(res, upsert.status || 500, { error: 'Failed to add agent' })

      return sendJson(res, 200, { success: true, userId: existingId, email: inviteEmail })
    }

    // ── reset-password ──────────────────────────────────────────────────────
    if (action === 'reset-password') {
      if (!userId) return sendJson(res, 400, { error: 'userId is required' })

      // Get the user's email from the auth API.
      const userResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
      })
      const userData = await userResp.json().catch(() => null)
      const targetEmail = String(userData?.email ?? '')
      if (!userResp.ok || !targetEmail) return sendJson(res, 400, { error: 'User not found' })

      // Generate a recovery link (Supabase returns the link; we email it).
      const linkResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'recovery', email: targetEmail }),
      })
      const linkData = await linkResp.json().catch(() => null)
      const resetUrl = linkResp.ok ? linkData?.action_link : null
      if (!resetUrl) {
        return sendJson(res, 500, { error: 'Failed to generate password reset link' })
      }

      // Send the branded reset email via Resend.
      try {
        const { renderPasswordResetEmail, resolveEmailConfig } = await import('./lib/email-template.js')
        const cfg = await resolveEmailConfig(process.env)
        const apiKey = cfg.apiKey || getEnv('RESEND_API_KEY') || ''
        const from = cfg.from || getEnv('RESEND_FROM') || 'Livarex Homes <noreply@livarex.com.ng>'
        if (apiKey) {
          const html = renderPasswordResetEmail({ resetUrl })
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: targetEmail, subject: 'Reset your Livarex password', html }),
          })
        }
      } catch (err) {
        console.warn('[manage-support-agent] reset email error:', err)
      }

      return sendJson(res, 200, { success: true })
    }

    // ── remove ──────────────────────────────────────────────────────────────
    if (action === 'remove') {
      if (!userId) return sendJson(res, 400, { error: 'userId is required' })

      // Fully delete the Supabase auth account. The `agents` row has
      // user_id → auth.users(id) ON DELETE CASCADE, so it's removed too.
      // FK cascade also handles any dependent rows.
      const delResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
      })
      if (!delResp.ok) {
        const delErr = await delResp.json().catch(() => null)
        return sendJson(res, delResp.status || 500, {
          error: getErrorMessage(delErr) || 'Failed to delete agent account',
        })
      }

      return sendJson(res, 200, { success: true, deleted: true })
    }

    // ── set-role ────────────────────────────────────────────────────────────
    if (action === 'set-role') {
      if (!userId || !body.role) return sendJson(res, 400, { error: 'userId and role are required' })
      const role = String(body.role)
      if (!['agent', 'support', 'admin'].includes(role)) {
        return sendJson(res, 400, { error: 'role must be agent, support, or admin' })
      }
      const update = await fetch(`${SUPABASE_URL}/rest/v1/agents?user_id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ role }),
      })
      if (!update.ok) return sendJson(res, update.status || 500, { error: 'Failed to update agent role' })
      return sendJson(res, 200, { success: true })
    }

    return sendJson(res, 400, { error: `Unknown action: ${action}` })
  } catch (error) {
    return sendJson(res, 500, { error: String(error) })
  }
}
