/**
 * POST /api/notify-signup
 * Sends a confirmation email via Resend when someone signs up for property alerts.
 * Expects JSON body: { email, subject, details }
 * Requires RESEND_API_KEY environment variable.
 */

const { renderAlertSignupEmail, resolveEmailConfig } = require('./lib/email-template.js')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, subject, details } = req.body ?? {}

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Missing email' })
  }

  const cfg = await resolveEmailConfig(process.env)
  const apiKey = cfg.apiKey || process.env.RESEND_API_KEY || ''
  if (!apiKey) {
    // Silently succeed if Resend is not yet configured — the Supabase row was already saved
    console.warn('[notify-signup] RESEND_API_KEY not set — skipping email')
    return res.status(200).json({ ok: true, skipped: true })
  }

  const alertLabel = subject || 'property alerts'
  const detailsText = details || 'Verified properties in your chosen area.'

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

    const data = await response.json()
    if (!response.ok) {
      console.error('[notify-signup] Resend error:', data)
      // Don't fail the user — the Supabase row is already saved
      return res.status(200).json({ ok: true, emailError: data })
    }

    return res.status(200).json({ ok: true, id: data.id })
  } catch (err) {
    console.error('[notify-signup] fetch error:', err)
    return res.status(200).json({ ok: true, emailError: err?.message })
  }
}
