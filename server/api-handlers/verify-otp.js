function getEnv(key) {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
}

// Max failed verification attempts before a code is burned for the email.
const MAX_ATTEMPTS = 5

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

export default async function handler(req, res) {
  const SUPABASE_URL = getEnv('SUPABASE_URL') || ''
  const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return sendJson(res, 500, {
      error: 'Missing Supabase environment variables',
      details: 'SUPABASE_URL and a service key (SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY) must be configured',
    })
  }

  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const body = await parseJsonBody(req)
  if (!body || typeof body.email !== 'string' || typeof body.otp !== 'string') return sendJson(res, 400, { error: 'Invalid request body' })

  const email = String(body.email).trim().toLowerCase()
  const otp = String(body.otp).trim()
  if (!email || !otp) return sendJson(res, 400, { error: 'Email and OTP are required' })

  try {
    // Reject any code for this email that has already been verified — a used
    // code must not be replayable.
    const verifiedResp = await fetch(
      `${SUPABASE_URL}/rest/v1/verification_codes?email=eq.${encodeURIComponent(email)}&verified_at=not.is.null&select=id`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
      },
    )
    if (verifiedResp.ok) {
      const verified = await verifiedResp.json().catch(() => [])
      if (Array.isArray(verified) && verified.length > 0) {
        return sendJson(res, 400, { error: 'Invalid or expired code' })
      }
    }

    // Look up the code for this email (regardless of expiry — we need the row
    // to enforce attempt limits even when the code is wrong/expired).
    const q = `${SUPABASE_URL}/rest/v1/verification_codes?email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=1&select=id,code,expires_at,attempts`
    const listResp = await fetch(q, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
      },
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
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
      }).catch(() => null)
      return sendJson(res, 400, { error: 'Invalid or expired code' })
    }

    const expired = row.expires_at ? new Date(row.expires_at).getTime() <= Date.now() : true
    const match = String(row.code) === otp

    if (!match || expired) {
      // Record the failed attempt, then burn the code on the final failure.
      const nextAttempts = attempts + 1
      await fetch(`${SUPABASE_URL}/rest/v1/verification_codes?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ attempts: nextAttempts }),
      }).catch(() => null)
      if (nextAttempts >= MAX_ATTEMPTS) {
        await fetch(`${SUPABASE_URL}/rest/v1/verification_codes?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            apikey: SUPABASE_SERVICE_KEY,
          },
        }).catch(() => null)
      }
      return sendJson(res, 400, { error: 'Invalid or expired code' })
    }

    if (id) {
      // Mark the code verified (one-time use) — delete used code.
      await fetch(`${SUPABASE_URL}/rest/v1/verification_codes?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
      }).catch(() => null)
    }

    return sendJson(res, 200, { success: true })
  } catch (error) {
    return sendJson(res, 500, { error: String(error) })
  }
}
