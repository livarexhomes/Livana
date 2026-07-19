/// <reference lib="dom" />

declare const process: { env: Record<string, string | undefined> }

function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
}

function sendJson(res: any, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function parseJsonBody(req: any): Promise<Record<string, unknown> | null> {
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
    req.on('data', (chunk: unknown) => {
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

export default async function handler(req: any, res: any) {
  const SUPABASE_URL = getEnv('SUPABASE_URL') || ''
  const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''
  const RESEND_API_KEY = getEnv('RESEND_API_KEY') || ''
  const RESEND_FROM = getEnv('RESEND_FROM') || 'onboarding@resend.dev'

  if (!RESEND_API_KEY) {
    return sendJson(res, 500, { error: 'Missing RESEND_API_KEY environment variable' })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return sendJson(res, 500, {
      error: 'Missing Supabase environment variables',
      details: 'SUPABASE_URL and a service key (SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY) must be configured',
    })
  }

  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const body = await parseJsonBody(req)
  if (!body || typeof body.email !== 'string') return sendJson(res, 400, { error: 'Invalid request body' })

  const email = String(body.email).trim()
  if (!email) return sendJson(res, 400, { error: 'Email is required' })

  // Generate 6-digit numeric OTP
  const code = String(Math.floor(100000 + Math.random() * 900000))
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

  // Send email via Resend
  try {
    const html = `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`
    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
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
