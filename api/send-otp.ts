import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { randomInt } from 'node:crypto'
import { z } from 'zod'

import { rateLimit } from './lib/rate-limit'
import { escapeHtml } from './lib/escape-html'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.FROM_EMAIL ?? 'LIVAREX <noreply@livarex.com.ng>'
const APP_NAME = 'LIVAREX'

const schema = z.object({
  email: z.string().email(),
  full_name: z.string().optional(),
})

function generateOtp(): string {
  return String(randomInt(100000, 999999))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const parsed = schema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
  }

  const { email, full_name } = parsed.data

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY

  if (!supabaseUrl || !serviceRoleKey) return res.status(503).json({ error: 'Server not configured' })
  if (!resendKey) return res.status(503).json({ error: 'Email service not configured' })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as SupabaseClient & { auth: { admin: any } }

  const otp = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

  // Upsert OTP — one active OTP per email at a time
  const { error: upsertError } = await admin.from('otp_verifications').upsert(
    { email, otp, expires_at: expiresAt, verified: false },
    { onConflict: 'email' }
  )

  if (upsertError) {
    console.error('[send-otp] upsert failed:', upsertError)
    return res.status(502).json({ error: 'Failed to store OTP' })
  }

  const firstName = escapeHtml((full_name ?? email).split(' ')[0])

  const { error: emailError } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Your ${APP_NAME} verification code`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:#1d4ed8;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">${APP_NAME}</h1>
            <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">Landlord Verification</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Hi ${firstName},</h2>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
              Use the code below to verify your landlord account. It expires in <strong>10 minutes</strong>.
            </p>
            <div style="text-align:center;margin:0 0 28px;">
              <div style="display:inline-block;padding:20px 40px;background:#f0f4ff;border:2px solid #dbeafe;border-radius:16px;">
                <span style="font-size:40px;font-weight:900;letter-spacing:10px;color:#1d4ed8;">${otp}</span>
              </div>
            </div>
            <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
              If you didn't request this code, you can safely ignore this email.
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
    </td></tr>
  </table>
</body>
</html>`,
  })

  if (emailError) {
    console.error('[send-otp] email send failed:', emailError)
    return res.status(502).json({ error: 'Failed to send OTP email' })
  }

  return res.status(200).json({ ok: true })
}
