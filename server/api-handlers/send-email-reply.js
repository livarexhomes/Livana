/**
 * send-email-reply.js
 *
 * Sends an email reply from the admin panel via Resend and persists it to
 * `email_thread_replies` so the conversation can be re-opened in-app.
 *
 * POST /api/send-email-reply
 * Body:
 *   {
 *     to: string,
 *     toName?: string,
 *     subject: string,
 *     body: string,
 *     contactId?: string,
 *     inquiryId?: string,
 *     threadId?: string  // optional In-Reply-To / References message-id
 *   }
 *
 * Response: { success: true, id, resendId } | { error }
 */

import { resolveEmailConfig, renderEmail } from './lib/email-template.js'

function getEnv(key) {
  if (typeof process !== 'undefined' && process.env) return process.env[key]
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
      try { return resolve(JSON.parse(req.body)) } catch { return resolve(null) }
    }
    if (req.body && typeof req.body === 'object') return resolve(req.body)
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
      try { resolve(JSON.parse(raw)) } catch { resolve(null) }
    })
    req.on('error', () => resolve(null))
  })
}

const esc = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/** Convert a plain-text body to safe, line-break-preserving HTML. */
function plainToHtml(text) {
  return esc(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px 0;line-height:1.65;color:#0f172a;font-size:14.5px;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const body = await parseJsonBody(req)
  if (!body) return sendJson(res, 400, { error: 'Invalid request body' })

  const to = String(body.to || '').trim().toLowerCase()
  const subject = String(body.subject || '').trim()
  const message = String(body.body || '').trim()
  const toName = typeof body.toName === 'string' ? body.toName.trim().slice(0, 200) : ''
  const contactId = typeof body.contactId === 'string' && body.contactId ? body.contactId : null
  const inquiryId = typeof body.inquiryId === 'string' && body.inquiryId ? body.inquiryId : null
  const threadId  = typeof body.threadId  === 'string' && body.threadId  ? body.threadId  : null

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return sendJson(res, 400, { error: 'A valid recipient email is required' })
  }
  if (!subject) return sendJson(res, 400, { error: 'Subject is required' })
  if (!message) return sendJson(res, 400, { error: 'Message body is required' })

  // Resolve sender config (admin-stored settings win over env vars).
  const cfg = await resolveEmailConfig(process.env)
  const apiKey = cfg.apiKey || getEnv('RESEND_API_KEY') || ''
  const from   = cfg.from   || getEnv('RESEND_FROM')    || 'Livarex Homes <noreply@livarex.com.ng>'

  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'Email service is not configured. Add a Resend API key in Admin → Settings → Email.',
    })
  }

  const htmlBody = plainToHtml(message)

  // Branded wrapper around the admin reply.
  const html = renderEmail({
    subject,
    preheader: subject,
    heading: 'Reply from Livarex Support',
    lead: toName ? `Hi ${toName},` : 'Hi there,',
    body: htmlBody,
    footerNote: 'You are receiving this email because you contacted Livarex. Our team is replying to your message.',
  })

  // Build RFC-822 thread headers so the reply lands in the same conversation
  // in Gmail/Outlook when the original message had an In-Reply-To.
  const headers = {}
  if (threadId) {
    headers['In-Reply-To'] = threadId
    headers['References'] = threadId
  }
  headers['Reply-To'] = cfg.adminEmail || from

  let resendResp, payload = null, errorMessage = null
  try {
    resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text: message,
        headers,
      }),
    })
    payload = await resendResp.json().catch(() => null)
  } catch (err) {
    errorMessage = String(err?.message || err)
  }

  const ok = !!resendResp && resendResp.ok && payload?.id
  const resendId = ok ? payload.id : null

  // Persist to email_thread_replies (best-effort — failures don't block the send).
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceKey) {
      const row = {
        contact_id: contactId,
        inquiry_id: inquiryId,
        to_email: to,
        to_name: toName || null,
        from_email: cfg.fromEmail || 'noreply@livarex.com.ng',
        from_name: cfg.fromName || 'Livarex Homes',
        subject,
        body: message,
        body_html: html,
        resend_id: resendId,
        status: ok ? 'sent' : 'failed',
        error_message: ok ? null : (errorMessage || payload?.message || `Resend status ${resendResp?.status ?? 'unknown'}`),
      }
      await fetch(`${supabaseUrl}/rest/v1/email_thread_replies`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(row),
      }).catch(() => null)
    }
  } catch { /* non-fatal */ }

  if (!ok) {
    return sendJson(res, 502, {
      error: errorMessage || payload?.message || 'Failed to send email',
    })
  }

  return sendJson(res, 200, { success: true, id: resendId })
}
