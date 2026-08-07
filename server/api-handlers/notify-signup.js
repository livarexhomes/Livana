/**
 * POST /api/notify-signup
 * Sends a confirmation email via Resend when someone signs up for property alerts.
 * Expects JSON body: { email, subject, details }
 * Requires RESEND_API_KEY environment variable.
 */

import { renderAlertSignupEmail, resolveEmailConfig } from './lib/email-template.js'

function sendJson(res, status, body) {
  if (typeof res.status === 'function') {
    res.status(status).json(body)
    return
  }
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
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  const body = await parseJsonBody(req)
  const { email, subject, details } = body ?? {}

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
    return sendJson(res, 400, { error: 'A valid email is required' })
  }

  const cfg = await resolveEmailConfig(process.env)
  const apiKey = cfg.apiKey || process.env.RESEND_API_KEY || ''
  if (!apiKey) {
    // Silently succeed if Resend is not yet configured — the Supabase row was already saved
    console.warn('[notify-signup] RESEND_API_KEY not set — skipping email')
    return sendJson(res, 200, { ok: true, skipped: true })
  }

  const alertLabel = String(subject || 'property alerts').slice(0, 200)
  const detailsText = String(details || 'Verified properties in your chosen area.').slice(0, 2000)

  try {
    const html = renderAlertSignupEmail({ alertLabel, detailsText })
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: cfg.from || process.env.RESEND_FROM || 'Livarex Homes <noreply@livarex.com.ng>',
        to: [email],
        subject: `You're on the Livarex property alert list! 🏡`,
        html,
      }),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      console.error('[notify-signup] Resend error:', data)
      // Don't fail the user — the Supabase row is already saved
      return sendJson(res, 200, { ok: true, emailError: data })
    }

    return sendJson(res, 200, { ok: true, id: data?.id })
  } catch (err) {
    console.error('[notify-signup] fetch error:', err)
    return sendJson(res, 200, { ok: true, emailError: err?.message })
  }
}
