/**
 * POST /api/notify-signup
 * Sends a confirmation email via Resend when someone signs up for property alerts.
 * Expects JSON body: { email, subject, details }
 * Requires RESEND_API_KEY environment variable.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, subject, details } = req.body ?? {}

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Missing email' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Silently succeed if Resend is not yet configured — the Supabase row was already saved
    console.warn('[notify-signup] RESEND_API_KEY not set — skipping email')
    return res.status(200).json({ ok: true, skipped: true })
  }

  const alertLabel = subject || 'property alerts'
  const detailsText = details || 'Verified properties in your chosen area.'

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:#1e3a5f;padding:32px 40px 28px;">
              <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">LIVAREX</p>
              <p style="margin:4px 0 0;font-size:12px;color:#93c5fd;letter-spacing:0.08em;text-transform:uppercase;">Nigeria's Verified Property Marketplace</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">You're on the list! ✅</p>
              <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
                You've signed up for <strong>${alertLabel}</strong> notifications on Livarex.
              </p>
              <div style="background:#f1f5f9;border-radius:16px;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">${detailsText}</p>
              </div>
              <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6;">
                We'll send you an email the moment a verified property matching your request becomes available. In the meantime, browse what's currently live:
              </p>
              <a href="https://livarex.com.ng/listings"
                style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:600;">
                Browse Listings →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                You're receiving this because you signed up for property alerts at <a href="https://livarex.com.ng" style="color:#2563eb;text-decoration:none;">livarex.com.ng</a>.<br>
                No agent fees. No hidden costs. Just verified homes.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Livarex Homes <livarexhomes@gmail.com>',
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
