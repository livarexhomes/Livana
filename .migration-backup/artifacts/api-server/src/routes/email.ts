import { Router, type IRouter } from 'express'
import { sendConfirmationEmail } from '../lib/email'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { validateConfirmationInput } from '../lib/validateConfirmationInput'
import { checkRateLimit } from '../lib/rateLimiter'

const router: IRouter = Router()

// 5 confirmation emails per IP per 15 minutes.
const RATE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 }

/**
 * POST /api/email/send-confirmation
 *
 * Body: { email: string, fullName: string, redirectTo?: string }
 *
 * Generates a signup confirmation link via the Supabase service-role API
 * and delivers it through Resend. Called by the frontend after
 * supabase.auth.signUp() when Supabase's built-in email delivery is off.
 */
router.post('/email/send-confirmation', async (req, res) => {
  // ── Rate limit by IP ───────────────────────────────────────────────────────
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ??
    req.socket.remoteAddress ??
    'unknown'

  const rl = checkRateLimit(`send-confirmation:${ip}`, RATE_LIMIT)
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT.max)
  res.setHeader('X-RateLimit-Remaining', rl.remaining)
  res.setHeader('X-RateLimit-Reset', Math.ceil(rl.resetAt / 1000))

  if (!rl.allowed) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' })
    return
  }

  // ── Input validation ───────────────────────────────────────────────────────
  const validation = validateConfirmationInput(req.body, process.env.APP_URL)
  if (!validation.ok) {
    res.status(400).json({ error: 'Invalid request', details: validation.errors })
    return
  }

  const { email, fullName, redirectTo } = validation

  if (!process.env.RESEND_API_KEY) {
    res.status(503).json({ error: 'Email service is not configured' })
    return
  }

  // ── Generate confirmation link ─────────────────────────────────────────────
  // We use 'magiclink' because 'signup' requires a password parameter.
  // Both types produce a one-time link that confirms the user's email and
  // establishes a session on click.
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: redirectTo
        ? `${process.env.APP_URL ?? ''}${redirectTo}`
        : `${process.env.APP_URL ?? ''}/auth/callback`,
    },
  })

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[email] generateLink failed:', linkError)
    res.status(502).json({ error: 'Failed to generate confirmation link' })
    return
  }

  // ── Send email ─────────────────────────────────────────────────────────────
  const { data, error } = await sendConfirmationEmail({
    to: email,
    fullName,
    confirmationUrl: linkData.properties.action_link,
  })

  if (error) {
    console.error('[email] send-confirmation failed:', error)
    res.status(502).json({ error: 'Failed to send confirmation email' })
    return
  }

  res.json({ id: data?.id })
})

export default router
