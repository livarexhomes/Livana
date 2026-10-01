/**
 * resend-inbound.js
 *
 * Receives inbound email events from Resend's webhook. When a contact replies
 * to an outbound admin email, Resend POSTs the message here. We:
 *
 *   1. Verify the Resend webhook signature (if RESEND_WEBHOOK_SECRET is set).
 *   2. Match the inbound `In-Reply-To` header against the `message_id` we
 *      stored in `email_thread_replies` when the outbound email was sent.
 *   3. Insert the inbound reply into the thread (direction = 'inbound').
 *   4. Fire a notification email to the admin inbox so they know the contact
 *      replied.
 *
 * Configure the webhook URL in the Resend dashboard:
 *   https://<your-domain>/api/resend-inbound
 *
 * Required env vars (optional but recommended):
 *   RESEND_WEBHOOK_SECRET  - shared secret for signature verification
 *   RESEND_INBOUND_ENABLED - set to "false" to disable without removing the route
 */

import { resolveEmailConfig, renderAdminNotificationEmail } from './lib/email-template.js'

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

/**
 * Verify Resend's Svix-style webhook signature.
 * Resend uses standard Svix headers: svix-id, svix-timestamp, svix-signature.
 *
 * @see https://resend.com/docs/dashboard/webhooks/introduction
 */
function verifySignature(req, rawBody, secret) {
  if (!secret) return true // secret not configured → skip verification (dev only)
  try {
    const { createHmac } = require('node:crypto')
    const svixId = req.headers['svix-id'] || req.headers['Svix-Id']
    const svixTs = req.headers['svix-timestamp'] || req.headers['Svix-Timestamp']
    const svixSig = req.headers['svix-signature'] || req.headers['Svix-Signature']
    if (!svixId || !svixTs || !svixSig) return false

    const signed = `${svixId}.${svixTs}.${rawBody}`
    const expected = createHmac('sha256', secret).update(signed).digest('base64')

    // Signature header can contain multiple space-separated base64 sigs ("v1,... v1,...")
    return String(svixSig)
      .split(' ')
      .map((s) => s.split(',').pop())
      .some((candidate) => {
        try {
          return timingSafeEqualStr(expected, candidate)
        } catch { return false }
      })
  } catch { return false }
}

function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

/** Best-effort extraction of relevant fields from a Resend webhook payload. */
function parseInboundEvent(payload) {
  // Resend sends `type: "email.received"` for inbound messages.
  if (!payload || payload.type !== 'email.received') return null
  const data = payload.data || {}
  return {
    type: payload.type,
    from: data.from || '',
    to: data.to || [],
    subject: data.subject || '(no subject)',
    text: data.text || '',
    html: data.html || '',
    headers: Array.isArray(data.headers) ? data.headers : [],
    messageId: data.message_id || data.id || '',
    createdAt: data.created_at || new Date().toISOString(),
  }
}

function headerValue(headers, name) {
  if (!Array.isArray(headers)) return ''
  const target = String(name).toLowerCase()
  const hit = headers.find((h) => String(h?.name || '').toLowerCase() === target)
  return hit ? String(hit.value || '').trim() : ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })
  if (String(getEnv('RESEND_INBOUND_ENABLED') || '').toLowerCase() === 'false') {
    return sendJson(res, 503, { error: 'Inbound webhook disabled' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return sendJson(res, 500, { error: 'Supabase env not configured' })
  }

  // Surface a console breadcrumb so it's obvious in Vercel/CLI logs when an
  // inbound webhook actually reaches this endpoint.
  try {
    console.log('[resend-inbound] webhook hit', {
      svix: !!req.headers['svix-id'] || !!req.headers['Svix-Id'],
      ua: req.headers['user-agent'] || '',
      ts: new Date().toISOString(),
    })
  } catch { /* ignore */ }

  // Read raw body for signature verification.
  const rawBody = await new Promise((resolve) => {
    if (typeof req.body === 'string') return resolve(req.body)
    if (req.body && typeof req.body === 'object') return resolve(JSON.stringify(req.body))
    let buf = ''
    req.on('data', (chunk) => {
      if (typeof chunk === 'string') buf += chunk
      else if (chunk instanceof Uint8Array) buf += new TextDecoder().decode(chunk)
      else buf += String(chunk)
    })
    req.on('end', () => resolve(buf))
    req.on('error', () => resolve(''))
  })

  const secret = getEnv('RESEND_WEBHOOK_SECRET')
  if (!verifySignature(req, rawBody, secret)) {
    return sendJson(res, 401, { error: 'Invalid signature' })
  }

  let payload
  try { payload = JSON.parse(rawBody || '{}') } catch { payload = null }
  if (!payload) return sendJson(res, 400, { error: 'Invalid JSON' })

  const event = parseInboundEvent(payload)
  if (!event) return sendJson(res, 200, { ignored: true })

  const inReplyTo = headerValue(event.headers, 'in-reply-to')
  const references = headerValue(event.headers, 'references')
  const fromEmail = String(event.from).match(/<([^>]+)>/)?.[1] || String(event.from).trim()

  /**
   * Normalize an RFC-822 Message-ID value for equality comparison.
   * Resend delivers `In-Reply-To` / `References` either with or without the
   * surrounding angle brackets depending on the upstream provider. We strip
   * them so we can match against the value we persisted in `message_id`.
   */
  const stripBrackets = (v) => {
    if (!v) return ''
    const s = String(v).trim()
    if (s.startsWith('<') && s.endsWith('>')) return s.slice(1, -1).trim()
    return s
  }

  // 1a) Try to find the original outbound message via In-Reply-To match.
  let contactId = null, inquiryId = null, subject = event.subject
  const replyIdNorm = stripBrackets(inReplyTo) || stripBrackets(references)
  if (replyIdNorm) {
    // Match either with or without brackets for resilience.
    const candidates = [
      replyIdNorm,
      `<${replyIdNorm}>`,
    ]
    for (const candidate of candidates) {
      const findUrl =
        `${supabaseUrl}/rest/v1/email_thread_replies?` +
        `message_id=eq.${encodeURIComponent(candidate)}&limit=1`
      const r = await fetch(findUrl, {
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      }).catch(() => null)
      if (r && r.ok) {
        const rows = await r.json().catch(() => [])
        const found = Array.isArray(rows) ? rows[0] : null
        if (found) {
          contactId = found.contact_id
          inquiryId = found.inquiry_id
          if (found.subject && !/^re:/i.test(event.subject)) subject = `Re: ${found.subject}`
          break
        }
      }
    }
  }

  // 1b) Fallback: link the reply to the contact_messages row whose email
  // matches the sender. This is essential when In-Reply-To was stripped,
  // missing, or doesn't thread properly (Gmail conversation view, BCC
  // replies, etc.) — otherwise the inbound row has a NULL contact_id and
  // the admin UI (which filters by contact_id) never shows the reply.
  if (!contactId && fromEmail) {
    try {
      const lookupUrl =
        `${supabaseUrl}/rest/v1/contact_messages?` +
        `email=ilike.${encodeURIComponent(fromEmail)}&limit=1`
      const r = await fetch(lookupUrl, {
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      }).catch(() => null)
      if (r && r.ok) {
        const rows = await r.json().catch(() => [])
        const found = Array.isArray(rows) ? rows[0] : null
        if (found) contactId = found.id
      }
    } catch { /* swallow */ }
  }

  // 2) Insert the inbound reply into the thread.
  const insertUrl = `${supabaseUrl}/rest/v1/email_thread_replies`
  const inboundRow = {
    contact_id: contactId,
    inquiry_id: inquiryId,
    to_email: 'livarex-inbox',  // addressed to Livarex, not a contact
    to_name: null,
    from_email: fromEmail,
    from_name: null,
    subject,
    body: event.text || event.html?.replace(/<[^>]+>/g, '') || '',
    body_html: event.html || null,
    resend_id: event.messageId || null,
    message_id: event.messageId ? `<${event.messageId}@resend.dev>` : null,
    in_reply_to: inReplyTo || references || null,
    direction: 'inbound',
    status: 'received',
  }

  const inserted = await fetch(insertUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(inboundRow),
  }).catch(() => null)

  // 3) Fire an admin notification so the team sees the reply in their inbox.
  try {
    const cfg = await resolveEmailConfig(process.env, { allowDisabled: true })
    const apiKey = cfg.apiKey
    const adminEmail = cfg.adminEmail
    if (apiKey && adminEmail && /^email\.received$/i.test(event.type)) {
      const html = renderAdminNotificationEmail({
        title: 'New reply from a contact',
        subtitle: subject,
        details: [
          { label: 'From',    value: fromEmail },
          { label: 'Subject', value: subject },
          { label: 'Preview', value: (event.text || '').slice(0, 500) },
        ],
        actionLabel: 'Open in Admin Support',
        actionUrl: 'https://livarex.com.ng/admin/support',
        eventName: 'contact_reply',
      })
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: cfg.from,
          to: adminEmail,
          subject: `↩️ Reply: ${subject}`,
          html,
          text: `New reply from ${fromEmail}\n\nSubject: ${subject}\n\n${(event.text || '').slice(0, 800)}`,
        }),
      }).catch(() => null)
    }
  } catch { /* non-fatal */ }

  return sendJson(res, 200, {
    received: true,
    persisted: inserted?.ok ?? false,
    matched: !!contactId || !!inquiryId,
  })
}
