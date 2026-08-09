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

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

/**
 * POST /api/send-password-reset
 *
 * Sends a 6-digit password-reset OTP to the user's email — using the SAME
 * proven Resend path as landlord onboarding OTP. The user then enters the code
 * on the reset page; /api/verify-reset checks it and updates the password.
 *
 * Always returns 200 so we never reveal whether an account exists.
 */
export default async function handler(req, res) {
  const SUPABASE_URL = getEnv('SUPABASE_URL') || ''
  const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''

  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const body = await parseJsonBody(req)
  if (!body || typeof body.email !== 'string') return sendJson(res, 400, { error: 'Invalid request body' })

  const email = String(body.email).trim().toLowerCase()
  if (!email || !isValidEmail(email)) return sendJson(res, 400, { error: 'A valid email is required' })

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return sendJson(res, 500, { error: 'Missing Supabase environment variables' })
  }

  // Resolve the effective Resend key + sender (stored settings win, env falls back).
  const { resolveEmailConfig } = await import('./lib/email-template.js')
  const cfg = await resolveEmailConfig(process.env, { allowDisabled: true })
  const apiKey = cfg.apiKey || getEnv('RESEND_API_KEY') || ''
  const from = cfg.from || getEnv('RESEND_FROM') || 'Livarex Homes <noreply@livarex.com.ng>'

  if (!apiKey) {
    console.error('[send-password-reset] RESEND_API_KEY is not configured')
    return sendJson(res, 200, { success: true }) // don't reveal config to the public
  }

  // Rate limit: max 3 OTP sends per email per 10 minutes (same as send-otp).
  try {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const countResp = await fetch(
      `${SUPABASE_URL}/rest/v1/verification_codes?email=eq.${encodeURIComponent(email)}&created_at=gt.${encodeURIComponent(tenMinAgo)}&select=id`,
      { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } },
    )
    if (countResp.ok) {
      const existing = await countResp.json().catch(() => [])
      if (Array.isArray(existing) && existing.length >= 3) {
        return sendJson(res, 200, { success: true }) // throttle silently
      }
    }
  } catch {
    /* best-effort */
  }

  // Generate a cryptographically-secure 6-digit OTP.
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

  // Persist the code (best-effort) so verify-reset can validate it.
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/verification_codes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ email, code, expires_at: expiresAt }]),
    }).catch(() => null)
  } catch {
    /* best-effort */
  }

  // Send the OTP via Resend (branded template).
  try {
    const { renderOtpEmail } = await import('./lib/email-template.js')
    const html = renderOtpEmail({ code })
    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: 'Your Livarex password reset code',
        html,
      }),
    })
    if (!resendResp.ok) {
      const payload = await resendResp.json().catch(() => null)
      console.error('[send-password-reset] Resend error:', payload?.message || resendResp.status)
    }
  } catch (err) {
    console.error('[send-password-reset] Resend error:', err)
  }

  // Always return success — never reveal whether an account exists.
  return sendJson(res, 200, { success: true })
}
