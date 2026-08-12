/**
 * POST /api/notify-kyc-reset
 *
 * Sends a "your KYC has been reset, please re-submit" email to a landlord
 * after an admin resets their account. Looks up the user's email from
 * Supabase Auth (service-role) so the landlord row doesn't need an email col.
 *
 * Body:   { userId: string, landlordName?: string }
 * Header: Authorization: Bearer <admin_access_token>
 */

import { renderEmail } from './lib/email-template.js'

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
  const RESEND_API_KEY   = getEnv('RESEND_API_KEY') || ''

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return sendJson(res, 500, { error: 'Server not configured' })

  // ── 1. Verify caller is admin ────────────────────────────────────────────────
  const authHeader  = req.headers?.authorization ?? req.headers?.Authorization ?? ''
  const callerToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!callerToken) return sendJson(res, 401, { error: 'Missing token' })

  const callerRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${callerToken}`, apikey: SERVICE_ROLE_KEY },
  })
  if (!callerRes.ok) return sendJson(res, 401, { error: 'Invalid token' })
  const callerUser = await callerRes.json().catch(() => null)
  const meta = callerUser?.app_metadata ?? {}
  const isAdmin = meta.role === 'admin' || (Array.isArray(meta.roles) && meta.roles.includes('admin'))
  if (!isAdmin) return sendJson(res, 403, { error: 'Admin access required' })

  // ── 2. Parse body ─────────────────────────────────────────────────────────────
  const body         = await parseJsonBody(req)
  const userId       = (body?.userId ?? '').trim()
  const landlordName = (body?.landlordName ?? 'Landlord').trim()
  if (!userId) return sendJson(res, 400, { error: 'userId required' })

  // ── 3. Fetch landlord's email from auth.users ────────────────────────────────
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
  })
  if (!userRes.ok) return sendJson(res, 404, { error: 'User not found' })
  const landlordUser = await userRes.json().catch(() => null)
  const email = landlordUser?.email
  if (!email) return sendJson(res, 400, { error: 'No email for user' })

  // ── 4. Resolve Resend API key (prefer DB-saved over env) ─────────────────────
  let apiKey = RESEND_API_KEY
  try {
    const settingsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/admin_settings?select=key,value&key=in.("email_config")`,
      { headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY } },
    )
    if (settingsRes.ok) {
      const rows = await settingsRes.json().catch(() => [])
      const cfg = (rows ?? []).find(r => r.key === 'email_config')?.value ?? {}
      if (cfg.resendApiKey) apiKey = cfg.resendApiKey
    }
  } catch { /* fall through to env key */ }

  if (!apiKey) {
    // No API key — reset succeeded, we just can't send email
    return sendJson(res, 200, { ok: true, emailSent: false, reason: 'No Resend API key configured' })
  }

  // ── 5. Build and send email ───────────────────────────────────────────────────
  const firstName = landlordName.split(' ')[0]

  const html = renderEmail({
    title: 'Your Livarex account has been reset',
    preheader: 'Please log in and resubmit your KYC information.',
    body: `
      <p style="margin:0 0 16px;">Hi <strong>${firstName}</strong>,</p>
      <p style="margin:0 0 16px;">
        Your Livarex landlord account has been reset by the admin team.
        This means you will need to log in and re-submit your profile and KYC documents.
      </p>
      <p style="margin:0 0 24px;">
        Once you have refilled your information, our team will review and approve your account as quickly as possible.
      </p>
    `,
    ctaText: 'Log in and resubmit',
    ctaUrl: 'https://livarex.com.ng/landlord/login',
    footerNote: 'If you believe this was done in error, please contact support@livarex.com.ng.',
  })

  const mailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Livarex Homes <noreply@livarex.com.ng>',
      to: [email],
      subject: 'Your Livarex account has been reset — please resubmit your information',
      html,
    }),
  })

  const mailData = await mailRes.json().catch(() => null)
  if (!mailRes.ok) {
    console.error('[notify-kyc-reset] Resend error', mailRes.status, mailData)
    // Don't fail the whole request — the DB reset already happened
    return sendJson(res, 200, { ok: true, emailSent: false, reason: mailData?.message ?? 'Resend error' })
  }

  return sendJson(res, 200, { ok: true, emailSent: true })
}
