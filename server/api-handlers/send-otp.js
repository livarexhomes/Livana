function getEnv(key) {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
}

// Import at module scope for crypto-secure RNG.
import { randomInt } from 'node:crypto'

// Basic email sanity check — blocks junk that would burn Resend sends.
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const body = await parseJsonBody(req)
  if (!body || typeof body.email !== 'string') return sendJson(res, 400, { error: 'Invalid request body' })

  const email = String(body.email).trim().toLowerCase()
  if (!email || !isValidEmail(email)) return sendJson(res, 400, { error: 'A valid email is required' })

  const SUPABASE_URL = getEnv('SUPABASE_URL') || ''
  const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''

  // Resolve the effective Resend key + sender (stored settings win, env falls back).
  const { resolveEmailConfig } = await import('./lib/email-template.js')
  const cfg = await resolveEmailConfig(process.env)
  const apiKey = cfg.apiKey || getEnv('RESEND_API_KEY') || ''
  const from = cfg.from || getEnv('RESEND_FROM') || 'Livarex Homes <noreply@livarex.com.ng>'

  if (!apiKey) {
    return sendJson(res, 500, { error: 'Missing RESEND_API_KEY environment variable' })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return sendJson(res, 500, {
      error: 'Missing Supabase environment variables',
      details: 'SUPABASE_URL and a service key (SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY) must be configured',
    })
  }

  // Rate limit: max 3 OTP sends per email per 10 minutes. Counts existing,
  // not-yet-expired codes for that email in verification_codes.
  try {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const countResp = await fetch(
      `${SUPABASE_URL}/rest/v1/verification_codes?email=eq.${encodeURIComponent(email)}&created_at=gt.${encodeURIComponent(tenMinAgo)}&select=id`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
      },
    )
    if (countResp.ok) {
      const existing = await countResp.json().catch(() => [])
      if (Array.isArray(existing) && existing.length >= 3) {
        return sendJson(res, 429, { error: 'Too many codes requested. Please wait a few minutes and try again.' })
      }
    }
  } catch (err) {
    // Rate-limit check is best-effort — never block sending on a DB hiccup.
    console.warn('[send-otp] rate-limit check failed:', err?.message || err)
  }

  // Generate a cryptographically-secure 6-digit numeric OTP.
  const code = String(randomInt(100000, 1000000))
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

  // Try to persist the code in Supabase `verification_codes` table (best-effort)
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/verification_codes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify([{ email, code, expires_at: expiresAt }]),
    }).then(r => r.ok ? r : Promise.resolve(r)).catch(() => null)
  } catch (err) {
    // ignore persistence errors — we'll still attempt to send email
  }

  // Send email via Resend (branded template)
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
        subject: 'Your Livarex verification code',
        html,
      }),
    })

    if (!resendResp.ok) {
      const payload = await resendResp.json().catch(() => null)
      return sendJson(res, resendResp.status || 502, { error: payload?.message || 'Failed to send email via Resend' })
    }

    return sendJson(res, 200, { success: true })
  } catch (error) {
    return sendJson(res, 500, { error: String(error) })
  }
}
