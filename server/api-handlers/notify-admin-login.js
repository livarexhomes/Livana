/**
 * POST /api/notify-admin-login
 *
 * Called by the admin frontend once per browser session (immediately after
 * the admin user is authenticated) when loginNotifications is enabled in
 * admin_settings.security.
 *
 * Sends a brief "new admin login" alert to the admin notification email.
 *
 * Header: Authorization: Bearer <admin_access_token>
 * Body:   {} (caller info is derived from the token)
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const SUPABASE_URL     = (getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || '').replace(/\/$/, '')
  const SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return sendJson(res, 500, { error: 'Server not configured' })

  // ── 1. Verify the caller is a real admin ────────────────────────────────────
  const authHeader  = req.headers?.authorization ?? req.headers?.Authorization ?? ''
  const callerToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!callerToken) return sendJson(res, 401, { error: 'Missing token' })

  const callerRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${callerToken}`, apikey: SERVICE_ROLE_KEY },
  })
  if (!callerRes.ok) return sendJson(res, 401, { error: 'Invalid token' })

  const callerUser  = await callerRes.json().catch(() => null)
  const meta        = callerUser?.app_metadata ?? {}
  const isAdmin     = meta.role === 'admin' || (Array.isArray(meta.roles) && meta.roles.includes('admin'))
  // Also allow support agents (they log into /admin too) — the setting controls whether to fire
  const isSupport   = isAdmin || meta.role === 'support' || meta.role === 'agent'
  if (!isSupport) return sendJson(res, 403, { error: 'Admin/agent access required' })

  // ── 2. Load admin_settings: security + notifications + email_config ─────────
  const settingsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_settings?select=key,value&key=in.("security","notifications","email_config")`,
    { headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY } },
  )

  let sec = {}, notif = {}, emailCfg = {}
  if (settingsRes.ok) {
    const rows = await settingsRes.json().catch(() => [])
    sec      = rows.find(r => r.key === 'security')?.value      ?? {}
    notif    = rows.find(r => r.key === 'notifications')?.value ?? {}
    emailCfg = rows.find(r => r.key === 'email_config')?.value  ?? {}
  }

  // Respect the toggle — if the admin turned it off, silently succeed
  if (!sec.loginNotifications) return sendJson(res, 200, { ok: true, skipped: true })

  const adminEmail = notif.adminEmail
  if (!adminEmail) return sendJson(res, 200, { ok: true, skipped: true, reason: 'No admin email configured' })

  // ── 3. Resolve Resend key ────────────────────────────────────────────────────
  const RESEND_API_KEY = getEnv('RESEND_API_KEY') || ''
  const apiKey = emailCfg.resendApiKey || RESEND_API_KEY
  if (!apiKey) return sendJson(res, 200, { ok: true, skipped: true, reason: 'No Resend API key' })

  // ── 4. Build and send the alert email ───────────────────────────────────────
  const loginEmail = callerUser?.email ?? 'Unknown'
  const now        = new Date()
  const timeStr    = now.toLocaleString('en-NG', {
    timeZone:    'Africa/Lagos',
    dateStyle:   'full',
    timeStyle:   'short',
  })

  const fromAddr = emailCfg.fromEmail || 'noreply@livarex.com.ng'
  const fromName = emailCfg.fromName  || 'Livarex Homes'

  const html = renderEmail({
    title:    'New admin login detected',
    preheader: `${loginEmail} just signed into the admin panel.`,
    body: `
      <p style="margin:0 0 16px;">A new sign-in to the <strong>Livarex Admin Panel</strong> was detected.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:#64748b;width:36%;">Account</td>
          <td style="padding:10px 12px;background:#fff;border:1px solid #e2e8f0;font-size:13px;color:#0f172a;font-weight:600;">${loginEmail}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:#64748b;">Time (Lagos)</td>
          <td style="padding:10px 12px;background:#fff;border:1px solid #e2e8f0;font-size:13px;color:#0f172a;">${timeStr}</td>
        </tr>
      </table>
      <p style="margin:0 0 16px;color:#64748b;font-size:13px;">
        If this wasn't you, secure your account immediately by changing your password.
      </p>
    `,
    ctaText: 'Go to Admin Panel',
    ctaUrl:  'https://livarex.com.ng/admin',
    footerNote: 'You are receiving this because Login Notifications are enabled in Admin → Settings → Security.',
  })

  const mailRes = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      from:    `${fromName} <${fromAddr}>`,
      to:      [adminEmail],
      subject: `New admin login — ${loginEmail}`,
      html,
    }),
  })

  if (!mailRes.ok) {
    const errData = await mailRes.json().catch(() => null)
    console.error('[notify-admin-login] Resend error', mailRes.status, errData)
    return sendJson(res, 200, { ok: true, emailSent: false, reason: errData?.message ?? 'Resend error' })
  }

  return sendJson(res, 200, { ok: true, emailSent: true })
}
