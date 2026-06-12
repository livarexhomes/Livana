import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { z } from 'zod'

import { rateLimit } from './lib/rate-limit'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.FROM_EMAIL ?? 'LIVAREX <noreply@livarex.com.ng>'
const APP_NAME = 'LIVAREX'

const schema = z.object({
  email: z.string().email(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const parsed = schema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
  }

  const { email } = parsed.data

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({ error: 'Supabase is not configured' })
  }
  if (!resendKey) {
    return res.status(503).json({ error: 'Email service is not configured' })
  }

  const appUrl = process.env.APP_URL
  if (!appUrl) {
    return res.status(503).json({ error: 'APP_URL environment variable is not configured' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as SupabaseClient & { auth: { admin: any } }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${appUrl}/reset-password` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[send-password-reset] generateLink failed:', linkError)
    // Return 200 regardless — don't reveal whether the email exists
    return res.status(200).json({ ok: true })
  }

  const resetUrl = linkData.properties.action_link

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Reset your ${APP_NAME} password`,
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
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Reset your password</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                We received a request to reset the password for your ${APP_NAME} account. Click the button below to choose a new password.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:14px 36px;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">
                      Reset my password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
                This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password won't change.
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
    console.error('[send-password-reset] Resend error:', error)
    // Still return 200 — don't leak email existence
    return res.status(200).json({ ok: true })
  }

  return res.status(200).json({ ok: true })
}
