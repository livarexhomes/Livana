/**
 * Livarex branded email template.
 *
 * A clean, mobile-responsive HTML email with the Livarex wordmark, navy/blue
 * brand colors, a centered card layout, and a company footer. Every automated
 * email (OTP, welcome, password reset, support, contact, alerts) renders
 * through this single template so the brand stays consistent.
 */

const BRAND = {
  name: 'LIVAREX',
  domain: 'livarex.com.ng',
  website: 'https://livarex.com.ng',
  listings: 'https://livarex.com.ng/listings',
  navy: '#1e3a5f',
  blue: '#2563eb',
  blueLight: '#93c5fd',
  bg: '#f4f6fb',
  card: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#eef2f7',
  footer: '#94a3b8',
}

/**
 * Resolve the effective Resend sender + admin recipients from the stored
 * `admin_settings` (email_config / notifications rows) with env-var fallbacks.
 * The serverless functions prefer env vars, but the values an admin saves in
 * Admin → Settings win when present.
 *
 * @param {object} env - process.env (passed in so this module stays env-agnostic)
 */
export async function resolveEmailConfig(env) {
  const config = { apiKey: '', fromEmail: '', fromName: '', adminEmail: '', from: '', enabled: true }

  // Stored settings (best-effort — failures fall through to env/defaults).
  try {
    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
    const serviceKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceKey) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/admin_settings?select=key,value&key=in.("email_config","notifications")`,
        { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } },
      )
      if (res.ok) {
        const rows = await res.json()
        const emailCfg = (rows ?? []).find((r) => r.key === 'email_config')?.value ?? {}
        const notifCfg = (rows ?? []).find((r) => r.key === 'notifications')?.value ?? {}
        if (emailCfg.enabled === false) config.enabled = false
        if (emailCfg.resendApiKey) config.apiKey = emailCfg.resendApiKey
        if (emailCfg.fromEmail) config.fromEmail = emailCfg.fromEmail
        if (emailCfg.fromName) config.fromName = emailCfg.fromName
        if (notifCfg.adminEmail) config.adminEmail = notifCfg.adminEmail
      }
    }
  } catch (err) {
    // ignore — fall back to env
  }

  // Env-var fallbacks
  config.apiKey = config.apiKey || env.RESEND_API_KEY || ''
  config.fromEmail = config.fromEmail || env.RESEND_FROM_EMAIL || 'noreply@livarex.com.ng'
  config.fromName = config.fromName || env.RESEND_FROM_NAME || 'Livarex Homes'
  config.adminEmail = config.adminEmail || env.ADMIN_EMAIL || ''
  config.from = `${config.fromName} <${config.fromEmail}>`

  // The "Enable Email Notifications" toggle from Admin Settings is respected:
  // when it's explicitly off, no email is sent even if a key exists.
  if (!config.enabled) config.apiKey = ''

  return config
}

const esc = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * Build the full branded email document.
 *
 * @param {object} opts
 * @param {string} opts.subject      Email subject (used in the <title> only).
 * @param {string} [opts.preheader]  Hidden preview text shown in inboxes.
 * @param {string} [opts.heading]    Big heading inside the card.
 * @param {string} [opts.lead]       Sub-heading paragraph under the heading.
 * @param {string} [opts.body]       HTML body content (main copy / custom blocks).
 * @param {string} [opts.ctaText]    Optional button label.
 * @param {string} [opts.ctaUrl]     Optional button href.
 * @param {string} [opts.note]       Small gray note under the CTA (e.g. expiry).
 * @param {string} [opts.footerNote] Custom footer disclaimer line.
 */
export function renderEmail({
  subject = '',
  preheader = '',
  heading = '',
  lead = '',
  body = '',
  ctaText = '',
  ctaUrl = '',
  note = '',
  footerNote = '',
} = {}) {
  const safe = {
    heading: esc(heading),
    lead: esc(lead),
    note: esc(note),
    footerNote: esc(footerNote),
    preheader: esc(preheader),
  }

  const button =
    ctaText && ctaUrl
      ? `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 0;">
          <tr>
            <td align="center" style="padding:10px 0 4px;">
              <a href="${esc(ctaUrl)}"
                style="display:inline-block;background:${BRAND.blue};color:#ffffff;text-decoration:none;
                font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:700;line-height:1;
                padding:15px 30px;border-radius:12px;">
                ${esc(ctaText)}
              </a>
            </td>
          </tr>
        </table>
      `
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<title>${safe.preheader ? `${safe.preheader} — ` : ''}${esc(subject || BRAND.name)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Inter,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Hidden preheader -->
  ${safe.preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${safe.preheader}</div>` : ''}

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:560px;width:100%;background:${BRAND.card};border-radius:20px;overflow:hidden;
          box-shadow:0 8px 32px rgba(15,23,42,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND.navy};padding:34px 40px 28px;" align="center">
              <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.2;">LIVAREX</div>
              <div style="margin-top:6px;font-size:11px;color:${BRAND.blueLight};letter-spacing:0.14em;text-transform:uppercase;font-weight:600;">
                Nigeria's Verified Property Marketplace
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 30px;">
              ${safe.heading ? `<h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:${BRAND.text};letter-spacing:-0.3px;line-height:1.3;">${safe.heading}</h1>` : ''}
              ${safe.lead ? `<p style="margin:0 0 18px;font-size:15px;color:${BRAND.textMuted};line-height:1.65;">${safe.lead}</p>` : ''}
              <div style="font-size:15px;color:#334155;line-height:1.7;">${body || ''}</div>
              ${button}
              ${safe.note ? `<p style="margin:16px 0 0;font-size:12px;color:${BRAND.footer};line-height:1.6;">${safe.note}</p>` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 40px 30px;border-top:1px solid ${BRAND.border};background:#fbfcfe;">
              <p style="margin:0;font-size:12px;color:${BRAND.footer};line-height:1.7;text-align:center;">
                LIVAREX · ${esc('14 Bourdillon Road, Ikoyi, Lagos, Nigeria')}<br>
                <a href="${BRAND.website}" style="color:${BRAND.blue};text-decoration:none;">${BRAND.domain}</a>
                ${safe.footerNote ? ` · ${safe.footerNote}` : ''}
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#cbd5e1;line-height:1.6;text-align:center;">
                No agent fees. No hidden costs. Just verified homes.
              </p>
            </td>
          </tr>
        </table>

        <!-- Legal strip -->
        <p style="margin:20px auto 0;max-width:480px;text-align:center;font-size:11px;color:#94a3b8;line-height:1.6;">
          You're receiving this email because of your activity on ${BRAND.domain}.<br>
          &copy; ${new Date().getFullYear()} Livarex. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Render the verification-code (OTP) email body. */
export function renderOtpEmail({ code, minutes = 10 } = {}) {
  return renderEmail({
    subject: 'Your Livarex verification code',
    preheader: `Your Livarex verification code is ${code}`,
    heading: 'Verify your identity',
    lead: "Here's the one-time verification code you requested. Enter it in the app to continue.",
    body: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 4px;">
        <tr>
          <td align="center" style="background:#f1f5f9;border-radius:14px;padding:20px;">
            <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:${BRAND.navy};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${esc(code)}</div>
          </td>
        </tr>
      </table>`,
    note: `This code expires in ${minutes} minutes. If you didn't request it, you can safely ignore this email.`,
    footerNote: 'Verification email',
  })
}

/** Render the welcome email body. */
export function renderWelcomeEmail({ name } = {}) {
  return renderEmail({
    subject: 'Welcome to Livarex 🎉',
    preheader: `Welcome to Livarex${name ? `, ${name}` : ''} — find your verified home`,
    heading: `Welcome${name ? `, ${esc(name)}` : ''}!`,
    lead: 'Your Livarex account is ready. Browse verified properties, book inspections, and move in faster — with zero agent fees.',
    body: `
      <ul style="margin:8px 0 16px;padding:0;list-style:none;">
        <li style="margin-bottom:10px;font-size:14px;color:#334155;">✓ &nbsp;Browse verified rentals and sales across Lagos &amp; Ogun</li>
        <li style="margin-bottom:10px;font-size:14px;color:#334155;">✓ &nbsp;Request inspections with verified landlords</li>
        <li style="margin-bottom:10px;font-size:14px;color:#334155;">✓ &nbsp;Save properties and get alerts when new homes are listed</li>
      </ul>`,
    ctaText: 'Browse Listings',
    ctaUrl: BRAND.listings,
    note: 'A landlord instead? You can apply to list your property anytime from your account.',
    footerNote: 'Welcome email',
  })
}

/** Render the password-reset email body. */
export function renderPasswordResetEmail({ resetUrl } = {}) {
  return renderEmail({
    subject: 'Reset your Livarex password',
    preheader: 'Reset your Livarex password',
    heading: 'Reset your password',
    lead: "We received a request to reset your Livarex password. Tap the button below to choose a new one.",
    body: `<p style="margin:0 0 4px;">This link is valid for 1 hour. If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>`,
    ctaText: 'Reset Password',
    ctaUrl: resetUrl || BRAND.website,
    note: 'For security, never share this link with anyone.',
    footerNote: 'Password reset',
  })
}

/**
 * Render a support / contact-message confirmation email.
 *
 * When `ticketNo` is present (offline support request) the copy follows the
 * support-request confirmation spec and surfaces the LVX-XXXX ticket id;
 * otherwise it keeps the generic contact-message confirmation.
 */
export function renderSupportConfirmationEmail({ name, subject, ticketId, ticketNo } = {}) {
  if (ticketNo) {
    return renderEmail({
      subject: "We've received your support request",
      preheader: 'We have received your support request',
      heading: `Thanks${name ? `, ${esc(name)}` : ''}!`,
      lead: "Thank you for contacting Livarex Support. We've successfully received your message. Our support team is currently unavailable, but we'll review your request and get back to you as soon as possible.",
      body: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;background:#f8fafc;border:1px solid ${BRAND.border};border-radius:14px;">
        <tr><td style="padding:16px 20px;font-size:13px;color:${BRAND.textMuted};line-height:1.7;">
          <div style="margin-bottom:4px;"><strong style="color:#334155;">Your Ticket ID:</strong></div>
          <div style="font-size:20px;font-weight:800;color:${BRAND.navy};letter-spacing:0.02em;">${esc(ticketNo)}</div>
        </td></tr>
      </table>`,
      ctaText: 'Visit Livarex',
      ctaUrl: BRAND.website,
      footerNote: 'Support request confirmation',
    })
  }

  return renderEmail({
    subject: `We received your message${subject ? ` — ${esc(subject)}` : ''}`,
    preheader: 'We received your message',
    heading: `Thanks${name ? `, ${esc(name)}` : ''}!`,
    lead: "We've received your message and our team will get back to you within 1–2 business days.",
    body: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;background:#f8fafc;border:1px solid ${BRAND.border};border-radius:14px;">
        <tr><td style="padding:16px 20px;font-size:13px;color:${BRAND.textMuted};line-height:1.7;">
          ${subject ? `<div style="margin-bottom:4px;"><strong style="color:#334155;">Subject:</strong> ${esc(subject)}</div>` : ''}
          ${ticketId ? `<div><strong style="color:#334155;">Ticket:</strong> #${esc(ticketId)}</div>` : ''}
        </td></tr>
      </table>`,
    ctaText: 'Visit Livarex',
    ctaUrl: BRAND.website,
    footerNote: 'Support confirmation',
  })
}

/** Render an admin notification email (new enquiry / support message / landlord signup). */
export function renderAdminNotificationEmail({ title, subtitle, details, actionLabel, actionUrl, eventName } = {}) {
  return renderEmail({
    subject: title,
    preheader: subtitle || title,
    heading: title,
    lead: subtitle || '',
    // details carries user-supplied content (name, message, etc.) — escape it.
    body: `<div style="background:#f8fafc;border:1px solid ${BRAND.border};border-radius:14px;padding:16px 20px;font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;">${esc(details || '')}</div>`,
    ctaText: actionLabel || 'Open Dashboard',
    ctaUrl: actionUrl || 'https://livarex.com.ng/admin',
    footerNote: eventName ? `${eventName} notification` : 'Admin notification',
  })
}

/** Render the property-alert signup confirmation email body. */
export function renderAlertSignupEmail({ alertLabel, detailsText } = {}) {
  return renderEmail({
    subject: `You're on the Livarex property alert list! 🏡`,
    preheader: 'You\'re on the Livarex property alert list',
    heading: "You're on the list! 🏡",
    lead: `You've signed up for <strong>${esc(alertLabel || 'property alerts')}</strong> notifications on Livarex.`,
    body: `<div style="background:#f1f5f9;border-radius:14px;padding:16px 20px;font-size:14px;color:${BRAND.textMuted};line-height:1.7;">${esc(detailsText || 'Verified properties in your chosen area.')}</div>
      <p style="margin:16px 0 0;">We'll email you the moment a verified property matching your request becomes available. In the meantime, browse what's live:</p>`,
    ctaText: 'Browse Listings',
    ctaUrl: BRAND.listings,
    footerNote: 'Property alert confirmation',
  })
}
