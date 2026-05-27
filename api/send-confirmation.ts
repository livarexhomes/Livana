import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.FROM_EMAIL ?? 'Livana <noreply@livana.ng>'
const APP_NAME = 'Livana'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, fullName } = req.body ?? {}

  if (!email || !fullName) {
    return res.status(400).json({ error: 'email and fullName are required' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({ error: 'Supabase is not configured' })
  }
  if (!resendKey) {
    return res.status(503).json({ error: 'Email service is not configured' })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Generate a one-time magic link that confirms the email and creates a session
  const appUrl = process.env.APP_URL ?? `https://${req.headers.host}`
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${appUrl}/auth/callback` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[send-confirmation] generateLink failed:', linkError)
    return res.status(502).json({ error: 'Failed to generate confirmation link' })
  }

  const confirmationUrl = linkData.properties.action_link
  const firstName = fullName.split(' ')[0]

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Confirm your ${APP_NAME} account`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#1d4ed8;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">${APP_NAME}</h1>
              <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">Find your next home</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Hi ${firstName},</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                Thanks for signing up. Click the button below to confirm your email address and activate your account.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${confirmationUrl}"
                       style="display:inline-block;padding:14px 36px;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">
                      Confirm my account
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
                This link expires in 24 hours. If you didn't create a ${APP_NAME} account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">
                © ${new Date().getFullYear()} ${APP_NAME} · Nigeria
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  })

  if (error) {
    console.error('[send-confirmation] Resend error:', error)
    return res.status(502).json({ error: 'Failed to send confirmation email' })
  }

  return res.status(200).json({ id: data?.id })
}
