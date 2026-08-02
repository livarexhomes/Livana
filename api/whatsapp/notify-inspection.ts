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

/**
 * POST /api/whatsapp/notify-inspection
 *
 * Notifies the Livarex admin (via WhatsApp Cloud API, falling back to email)
 * when a tenant submits an enquiry / requests an inspection for a property.
 *
 * Body: {
 *   tenantName?: string, tenantPhone?: string,
 *   propertyTitle?: string, propertyCity?: string, propertyId?: string,
 *   message?: string,
 * }
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const body = await parseJsonBody(req)
  if (!body) return sendJson(res, 400, { error: 'Invalid request body' })

  const {
    tenantName = '',
    tenantPhone = '',
    propertyTitle = '',
    propertyCity = '',
    propertyId = '',
    message = '',
  } = body as Record<string, any>

  const text = [
    `🔔 New inspection request${propertyTitle ? `: ${propertyTitle}` : ''}`,
    propertyCity && `Location: ${propertyCity}`,
    propertyId && `Property ID: ${propertyId}`,
    tenantName && `Tenant: ${tenantName}`,
    tenantPhone && `Phone: ${tenantPhone}`,
    message && `Message: ${message}`,
  ].filter(Boolean).join('\n')

  // 1) WhatsApp Cloud API (preferred)
  const WA_URL = getEnv('WHATSAPP_PHONE_NUMBER_ID')
    ? `https://graph.facebook.com/v19.0/${getEnv('WHATSAPP_PHONE_NUMBER_ID')}/messages`
    : ''
  const WA_TOKEN = getEnv('WHATSAPP_TOKEN') || ''
  const adminPhone = getEnv('ADMIN_PHONE_NUMBER') || ''

  if (WA_URL && WA_TOKEN && adminPhone) {
    try {
      const waResp = await fetch(WA_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: adminPhone,
          type: 'text',
          text: { body: text.slice(0, 4000) },
        }),
      })
      const waData = await waResp.json().catch(() => null)
      if (waResp.ok) {
        return sendJson(res, 200, { success: true, channel: 'whatsapp', id: waData?.messages?.[0]?.id })
      }
      console.warn('[whatsapp/notify-inspection] WhatsApp error:', waData?.error?.message || waResp.status)
      // fall through to email
    } catch (err) {
      console.warn('[whatsapp/notify-inspection] WhatsApp fetch error:', err)
      // fall through to email
    }
  }

  // 2) Email fallback — notify the admin.
  const RESEND_API_KEY = getEnv('RESEND_API_KEY') || ''
  const RESEND_FROM = getEnv('RESEND_FROM') || 'Livarex Homes <noreply@livarex.com.ng>'
  const adminEmail = getEnv('ADMIN_EMAIL') || ''

  if (RESEND_API_KEY && adminEmail) {
    try {
      const { renderAdminNotificationEmail } = await import('../lib/email-template.js')
      const html = renderAdminNotificationEmail({
        title: 'New inspection request',
        subtitle: `${tenantName || 'A tenant'} requested an inspection${propertyTitle ? ` for ${propertyTitle}` : ''}.`,
        details: text,
        actionLabel: 'Open Dashboard',
        actionUrl: 'https://livarex.com.ng/admin/support',
        eventName: 'Inspection request',
      })
      const emailResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: adminEmail,
          subject: 'New inspection request',
          html,
        }),
      })
      const payload = await emailResp.json().catch(() => null)
      if (emailResp.ok) return sendJson(res, 200, { success: true, channel: 'email', id: payload?.id })
      console.warn('[whatsapp/notify-inspection] email error:', payload?.message || emailResp.status)
    } catch (err) {
      console.warn('[whatsapp/notify-inspection] email error:', err)
    }
  }

  return sendJson(res, 200, { success: false, channel: 'none', reason: 'No notification channel configured' })
}
