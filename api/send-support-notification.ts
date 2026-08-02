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
 * POST /api/send-support-notification
 *
 * Fires the email side of a support event (contact form, support ticket, chat
 * inquiry). The Supabase row is the source of truth; email is best-effort.
 *
 * Body: {
 *   event: 'contact' | 'support' | 'chat' | 'enquiry' | 'landlord-signup' | 'test',
 *   adminEmail: string,          // where the notification goes (from settings)
 *   userName?: string,
 *   userEmail?: string,          // if set, a confirmation email is also sent
 *   subject?: string,
 *   message?: string,
 *   ticketId?: string,
 *   channel?: string,
 * }
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const body = await parseJsonBody(req)
  if (!body) return sendJson(res, 400, { error: 'Invalid request body' })

  // Resolve the effective Resend key + sender (stored settings win, env falls back).
  const { resolveEmailConfig } = await import('./lib/email-template.js')
  const cfg = await resolveEmailConfig(process.env)
  const apiKey = cfg.apiKey || getEnv('RESEND_API_KEY') || ''
  const from = (body as any).from || cfg.from || getEnv('RESEND_FROM') || 'Livarex Homes <noreply@livarex.com.ng>'

  if (!apiKey) {
    return sendJson(res, 200, { success: true, skipped: true })
  }

  const {
    event = 'contact',
    adminEmail,
    userName = '',
    userEmail = '',
    subject = '',
    message = '',
    ticketId = '',
    channel = '',
  } = body as Record<string, any>

  const { renderAdminNotificationEmail, renderSupportConfirmationEmail } = await import('./lib/email-template.js')

  // Test email — send a simple branded test directly to adminEmail.
  if (event === 'test') {
    if (!adminEmail) return sendJson(res, 400, { error: 'adminEmail is required for test' })
    const { renderEmail } = await import('./lib/email-template.js')
    const html = renderEmail({
      subject: 'Test email from Livarex',
      preheader: 'Your Resend configuration is working',
      heading: 'Test email successful! ✅',
      lead: 'Your Resend email configuration is working correctly.',
      body: '<p style="margin:0;">Sent from the Livarex Admin Settings. If you\'re reading this, everything is wired up.</p>',
      footerNote: 'Configuration test',
    })
    try {
      const testResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: adminEmail,
          subject: 'Test email from Livarex',
          html,
        }),
      })
      const payload = await testResp.json().catch(() => null)
      if (testResp.ok) return sendJson(res, 200, { success: true, id: payload?.id })
      return sendJson(res, testResp.status || 502, { success: false, error: payload?.message || 'Failed to send test email' })
    } catch (err) {
      return sendJson(res, 500, { success: false, error: String(err) })
    }
  }

  const eventMeta: Record<string, { title: string; label: string; href: string }> = {
    contact:          { title: 'New contact message',      label: 'Contact message',        href: 'https://livarex.com.ng/admin/support' },
    support:          { title: 'New support ticket',       label: 'Support ticket',         href: 'https://livarex.com.ng/admin/support' },
    chat:             { title: 'New chat inquiry',         label: 'Chat inquiry',           href: 'https://livarex.com.ng/admin/support' },
    enquiry:          { title: 'New property enquiry',     label: 'Property enquiry',       href: 'https://livarex.com.ng/admin/properties' },
    'landlord-signup':{ title: 'New landlord registration', label: 'Landlord registration', href: 'https://livarex.com.ng/admin/kyc' },
  }
  const meta = eventMeta[event] ?? eventMeta.contact

  const details = [
    channel && `Channel: ${channel}`,
    userName && `Name: ${userName}`,
    userEmail && `Email: ${userEmail}`,
    subject && `Subject: ${subject}`,
    ticketId && `Ticket: ${ticketId}`,
    message && `Message:\n${message}`,
  ].filter(Boolean).join('\n')

  const errors: string[] = []

  // 1) Admin notification
  if (adminEmail) {
    try {
      const html = renderAdminNotificationEmail({
        title: meta.title,
        subtitle: `${userName || 'Someone'} just submitted a ${meta.label.toLowerCase()}.`,
        details,
        actionLabel: 'Open Dashboard',
        actionUrl: meta.href,
        eventName: meta.label,
      })
      const adminResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: adminEmail,
          subject: meta.title,
          html,
        }),
      })
      if (!adminResp.ok) {
        const p = await adminResp.json().catch(() => null)
        errors.push(p?.message || `admin email failed (${adminResp.status})`)
      }
    } catch (err) {
      errors.push(`admin email error: ${err}`)
    }
  }

  // 2) User confirmation
  if (userEmail) {
    try {
      const html = renderSupportConfirmationEmail({
        name: userName,
        subject: subject || undefined,
        ticketId: ticketId || undefined,
      })
      const userResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: userEmail,
          subject: `We received your message${subject ? ` — ${subject}` : ''}`,
          html,
        }),
      })
      if (!userResp.ok) {
        const p = await userResp.json().catch(() => null)
        errors.push(p?.message || `user email failed (${userResp.status})`)
      }
    } catch (err) {
      errors.push(`user email error: ${err}`)
    }
  }

  if (errors.length > 0) {
    console.warn('[send-support-notification] partial failure:', errors)
  }

  return sendJson(res, 200, { success: true, errors: errors.length ? errors : undefined })
}
