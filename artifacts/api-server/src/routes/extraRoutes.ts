import { Router, type IRouter, type Request, type Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { randomInt } from 'node:crypto'
import { z } from 'zod'
import { checkRateLimit } from '../lib/rateLimiter'

const router: IRouter = Router()

const FROM = process.env.FROM_EMAIL ?? 'LIVAREX <noreply@livarex.com.ng>'
const APP_NAME = 'LIVAREX'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getAdminClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) as any
}

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not set')
  return new Resend(key)
}

function applyRateLimit(req: Request, res: Response, key: string, max: number, windowMs: number): boolean {
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ??
    req.socket.remoteAddress ??
    'unknown'
  const rl = checkRateLimit(`${key}:${ip}`, { max, windowMs })
  res.setHeader('X-RateLimit-Limit', max)
  res.setHeader('X-RateLimit-Remaining', rl.remaining)
  res.setHeader('X-RateLimit-Reset', Math.ceil(rl.resetAt / 1000))
  if (!rl.allowed) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' })
    return false
  }
  return true
}

// ─── POST /api/send-confirmation ────────────────────────────────────────────
const sendConfirmationSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
})

router.post('/send-confirmation', async (req, res) => {
  if (!applyRateLimit(req, res, 'send-confirmation', 5, 15 * 60 * 1000)) return

  const parsed = sendConfirmationSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }

  const { email, fullName, metadata } = parsed.data

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ error: 'Supabase is not configured' })
    return
  }
  if (!process.env.RESEND_API_KEY) {
    res.status(503).json({ error: 'Email service is not configured' })
    return
  }
  const appUrl = process.env.APP_URL
  if (!appUrl) {
    res.status(503).json({ error: 'APP_URL is not configured' })
    return
  }

  try {
    const admin = getAdminClient()

    if (metadata && typeof metadata === 'object') {
      const { data: userList } = await admin.auth.admin.listUsers()
      const existing = (userList?.users ?? []).find((u: any) => u.email === email)
      if (existing) {
        await admin.auth.admin.updateUserById(existing.id, { user_metadata: metadata })
      }
    }

    const { data: magicData, error: magicError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${appUrl}/auth/callback` },
    })

    if (magicError || !magicData?.properties?.action_link) {
      console.error('[send-confirmation] generateLink failed:', magicError)
      res.status(502).json({ error: 'Failed to generate confirmation link' })
      return
    }

    const confirmationUrl = magicData.properties.action_link
    const firstName = escapeHtml(fullName.split(' ')[0])

    const { data, error } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `Confirm your ${APP_NAME} account`,
      html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:#1d4ed8;padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">${APP_NAME}</h1>
<p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">Find your next home</p></td></tr>
<tr><td style="padding:40px 40px 32px;">
<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Hi ${firstName},</h2>
<p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">Thanks for signing up. Click the button below to confirm your email address and activate your account.</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${confirmationUrl}" style="display:inline-block;padding:14px 36px;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">Confirm my account</a>
</td></tr></table>
<p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">This link expires in 24 hours. If you didn't create a ${APP_NAME} account, you can safely ignore this email.</p>
</td></tr>
<tr><td style="padding:20px 40px 32px;border-top:1px solid #f3f4f6;"><p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">© ${new Date().getFullYear()} ${APP_NAME} · Nigeria</p></td></tr>
</table></td></tr></table></body></html>`,
    })

    if (error) {
      console.error('[send-confirmation] Resend error:', error)
      res.status(502).json({ error: 'Failed to send confirmation email' })
      return
    }

    res.json({ id: (data as any)?.id })
  } catch (err: any) {
    console.error('[send-confirmation] unexpected error:', err)
    res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
})

// ─── POST /api/send-password-reset ──────────────────────────────────────────
const sendPasswordResetSchema = z.object({ email: z.string().email() })

router.post('/send-password-reset', async (req, res) => {
  if (!applyRateLimit(req, res, 'send-password-reset', 5, 15 * 60 * 1000)) return

  const parsed = sendPasswordResetSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }

  const { email } = parsed.data

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ error: 'Supabase is not configured' })
    return
  }
  if (!process.env.RESEND_API_KEY) {
    res.status(503).json({ error: 'Email service is not configured' })
    return
  }
  const appUrl = process.env.APP_URL
  if (!appUrl) {
    res.status(503).json({ error: 'APP_URL is not configured' })
    return
  }

  try {
    const admin = getAdminClient()

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/reset-password` },
    })

    if (linkError || !linkData?.properties?.action_link) {
      // Return 200 regardless — don't reveal whether the email exists
      res.json({ ok: true })
      return
    }

    const resetUrl = linkData.properties.action_link

    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `Reset your ${APP_NAME} password`,
      html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:#1d4ed8;padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">${APP_NAME}</h1>
<p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">Find your next home</p></td></tr>
<tr><td style="padding:40px 40px 32px;">
<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Reset your password</h2>
<p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">We received a request to reset the password for your ${APP_NAME} account.</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${resetUrl}" style="display:inline-block;padding:14px 36px;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">Reset my password</a>
</td></tr></table>
<p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
</td></tr>
<tr><td style="padding:20px 40px 32px;border-top:1px solid #f3f4f6;"><p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">© ${new Date().getFullYear()} ${APP_NAME} · Nigeria</p></td></tr>
</table></td></tr></table></body></html>`,
    })

    res.json({ ok: true })
  } catch (err: any) {
    console.error('[send-password-reset] unexpected error:', err)
    // Always return 200 — don't leak email existence
    res.json({ ok: true })
  }
})

// ─── POST /api/landlord-register ────────────────────────────────────────────
const landlordRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  whatsapp: z.string().min(1),
  city: z.string().optional(),
  bio: z.string().optional(),
})

router.post('/landlord-register', async (req, res) => {
  if (!applyRateLimit(req, res, 'landlord-register', 5, 15 * 60 * 1000)) return

  const parsed = landlordRegisterSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }

  const { email, password, full_name, whatsapp, city, bio } = parsed.data

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ error: 'Server not configured' })
    return
  }

  try {
    const admin = getAdminClient()

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name,
        whatsapp,
        city: city ?? null,
        bio: bio ?? null,
        role: 'landlord',
      },
    })

    if (createError) {
      if (createError.message?.toLowerCase().includes('already')) {
        res.status(409).json({ error: 'An account with this email already exists.' })
        return
      }
      res.status(400).json({ error: createError.message })
      return
    }

    const userId = created.user.id

    const { error: insertError } = await admin.from('landlords').insert({
      user_id: userId,
      full_name,
      whatsapp,
      city: city ?? null,
      bio: bio ?? null,
      status: 'not_submitted',
      is_verified: false,
    })

    if (insertError && !insertError.message.includes('duplicate')) {
      console.error('[landlord-register] landlords insert failed:', insertError)
    }

    res.json({ ok: true })
  } catch (err: any) {
    console.error('[landlord-register] unexpected error:', err)
    res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
})

// ─── POST /api/delete-user ───────────────────────────────────────────────────
const deleteUserSchema = z.object({ user_id: z.string().uuid() })

router.post('/delete-user', async (req, res) => {
  const parsed = deleteUserSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }

  const { user_id } = parsed.data

  const supabaseUrl = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    res.status(503).json({ error: 'Server not configured' })
    return
  }

  const authToken = req.headers.authorization?.split(' ')[1]
  if (!authToken) {
    res.status(401).json({ error: 'Missing auth token' })
    return
  }

  try {
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) as any

    const { data: userData, error: userError } = await authClient.auth.getUser(authToken)
    if (userError || !userData?.user) {
      res.status(401).json({ error: 'Invalid auth token' })
      return
    }

    const admin = getAdminClient()

    const { data: adminRow, error: adminError } = await admin
      .from('admins')
      .select('id')
      .eq('id', userData.user.id)
      .single()

    if (adminError || !adminRow) {
      res.status(403).json({ error: 'Admin access required' })
      return
    }

    const { error } = await admin.auth.admin.deleteUser(user_id)
    if (error) {
      console.error('[delete-user] failed:', error)
      res.status(502).json({ error: error.message })
      return
    }

    res.json({ ok: true })
  } catch (err: any) {
    console.error('[delete-user] unexpected error:', err)
    res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
})

// ─── POST /api/send-otp ──────────────────────────────────────────────────────
const sendOtpSchema = z.object({
  email: z.string().email(),
  full_name: z.string().optional(),
})

router.post('/send-otp', async (req, res) => {
  if (!applyRateLimit(req, res, 'send-otp', 5, 15 * 60 * 1000)) return

  const parsed = sendOtpSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }

  const { email, full_name } = parsed.data

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ error: 'Server not configured' })
    return
  }
  if (!process.env.RESEND_API_KEY) {
    res.status(503).json({ error: 'Email service not configured' })
    return
  }

  try {
    const admin = getAdminClient()
    const otp = String(randomInt(100000, 999999))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: upsertError } = await admin.from('otp_verifications').upsert(
      { email, otp, expires_at: expiresAt, verified: false },
      { onConflict: 'email' }
    )

    if (upsertError) {
      console.error('[send-otp] upsert failed:', upsertError)
      res.status(502).json({ error: 'Failed to store OTP' })
      return
    }

    const firstName = escapeHtml((full_name ?? email).split(' ')[0])

    const { error: emailError } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `Your ${APP_NAME} verification code`,
      html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:#1d4ed8;padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">${APP_NAME}</h1>
<p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">Landlord Verification</p></td></tr>
<tr><td style="padding:40px 40px 32px;">
<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Hi ${firstName},</h2>
<p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">Use the code below to verify your landlord account. It expires in <strong>10 minutes</strong>.</p>
<div style="text-align:center;margin:0 0 28px;">
<div style="display:inline-block;padding:20px 40px;background:#f0f4ff;border:2px solid #dbeafe;border-radius:16px;">
<span style="font-size:40px;font-weight:900;letter-spacing:10px;color:#1d4ed8;">${otp}</span>
</div></div>
<p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">If you didn't request this code, you can safely ignore this email.</p>
</td></tr>
<tr><td style="padding:20px 40px 32px;border-top:1px solid #f3f4f6;"><p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">© ${new Date().getFullYear()} ${APP_NAME} · Nigeria</p></td></tr>
</table></td></tr></table></body></html>`,
    })

    if (emailError) {
      console.error('[send-otp] email send failed:', emailError)
      res.status(502).json({ error: 'Failed to send OTP email' })
      return
    }

    res.json({ ok: true })
  } catch (err: any) {
    console.error('[send-otp] unexpected error:', err)
    res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
})

// ─── POST /api/verify-otp ────────────────────────────────────────────────────
const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(6).max(6),
})

router.post('/verify-otp', async (req, res) => {
  if (!applyRateLimit(req, res, 'verify-otp', 10, 5 * 60 * 1000)) return

  const parsed = verifyOtpSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }

  const { email, otp } = parsed.data

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ error: 'Server not configured' })
    return
  }

  try {
    const admin = getAdminClient()

    const { data: updated, error } = await admin
      .from('otp_verifications')
      .update({ verified: true })
      .eq('email', email)
      .eq('otp', String(otp))
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .select()

    if (error || !updated || updated.length === 0) {
      res.status(400).json({ error: 'Invalid or expired verification code.' })
      return
    }

    res.json({ ok: true })
  } catch (err: any) {
    console.error('[verify-otp] unexpected error:', err)
    res.status(500).json({ error: err.message ?? 'Internal server error' })
  }
})

export default router
