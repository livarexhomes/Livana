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

// Max failed verification attempts before a code is burned for the email.
const MAX_ATTEMPTS = 5

/**
 * POST /api/verify-reset
 *
 * Verifies a password-reset OTP (same logic as /api/verify-otp), then updates
 * the user's password via the Supabase admin API. The OTP was sent by
 * /api/send-password-reset using the same proven Resend path as landlord
 * onboarding.
 *
 * Body: { email, otp, password }
 */
export default async function handler(req, res) {
  const SUPABASE_URL = getEnv('SUPABASE_URL') || ''
  const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return sendJson(res, 500, { error: 'Missing Supabase environment variables' })
  }

  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const body = await parseJsonBody(req)
  if (!body || typeof body.email !== 'string' || typeof body.otp !== 'string' || typeof body.password !== 'string') {
    return sendJson(res, 400, { error: 'Invalid request body' })
  }

  const email = String(body.email).trim().toLowerCase()
  const otp = String(body.otp).trim()
  const password = String(body.password)
  if (!email || !otp || !password) return sendJson(res, 400, { error: 'Email, code and password are required' })
  if (password.length < 8) return sendJson(res, 400, { error: 'Password must be at least 8 characters' })

  try {
    // Look up the latest code for this email (regardless of expiry — we need
    // the row to enforce attempt limits even on wrong/expired guesses).
    const q = `${SUPABASE_URL}/rest/v1/verification_codes?email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=1&select=id,code,expires_at,attempts`
    const listResp = await fetch(q, {
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
    })
    if (!listResp.ok) {
      const errBody = await listResp.json().catch(() => null)
      return sendJson(res, listResp.status || 500, { error: errBody?.message || 'Failed to query verification codes' })
    }
    const rows = await listResp.json().catch(() => [])
    if (!Array.isArray(rows) || rows.length === 0) {
      return sendJson(res, 400, { error: 'Invalid or expired code' })
    }

    const row = rows[0]
    const id = row.id
    const attempts = Number(row.attempts ?? 0)

    // Attempt limit: burn the code after MAX_ATTEMPTS wrong guesses.
    if (attempts >= MAX_ATTEMPTS) {
      await fetch(`${SUPABASE_URL}/rest/v1/verification_codes?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
      }).catch(() => null)
      return sendJson(res, 400, { error: 'Invalid or expired code' })
    }

    const expired = row.expires_at ? new Date(row.expires_at).getTime() <= Date.now() : true
    const match = String(row.code) === otp

    if (!match || expired) {
      const nextAttempts = attempts + 1
      await fetch(`${SUPABASE_URL}/rest/v1/verification_codes?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attempts: nextAttempts }),
      }).catch(() => null)
      if (nextAttempts >= MAX_ATTEMPTS) {
        await fetch(`${SUPABASE_URL}/rest/v1/verification_codes?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
        }).catch(() => null)
      }
      return sendJson(res, 400, { error: 'Invalid or expired code' })
    }

    // Code verified — burn it (one-time use).
    if (id) {
      await fetch(`${SUPABASE_URL}/rest/v1/verification_codes?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
      }).catch(() => null)
    }

    // Update the user's password via the Supabase admin API.
    const userList = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200&page=1`, {
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
    })
    if (!userList.ok) return sendJson(res, 500, { error: 'Could not look up account' })
    const page = await userList.json().catch(() => null)
    const users = Array.isArray(page?.users) ? page.users : (Array.isArray(page) ? page : [])
    const target = users.find((u) => String(u?.email ?? '').toLowerCase() === email)
    if (!target?.id) return sendJson(res, 400, { error: 'Account not found' })

    const updateResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(target.id)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    })
    if (!updateResp.ok) {
      const payload = await updateResp.json().catch(() => null)
      return sendJson(res, updateResp.status || 500, { error: payload?.msg || payload?.message || 'Could not update password' })
    }

    return sendJson(res, 200, { success: true })
  } catch (error) {
    return sendJson(res, 500, { error: String(error) })
  }
}
