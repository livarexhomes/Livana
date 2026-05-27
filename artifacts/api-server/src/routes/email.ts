import { Router, type IRouter } from 'express'
import { sendConfirmationEmail } from '../lib/email'
import { supabaseAdmin } from '../lib/supabaseAdmin'

const router: IRouter = Router()

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
  const { email, fullName, redirectTo } = req.body ?? {}

  if (!email || !fullName) {
    res.status(400).json({ error: 'email and fullName are required' })
    return
  }

  if (!process.env.RESEND_API_KEY) {
    res.status(503).json({ error: 'Email service is not configured' })
    return
  }

  // Generate a confirmation link using the service-role key.
  // We use 'magiclink' because 'signup' requires a password parameter.
  // Both types produce a one-time link that confirms the user's email and
  // establishes a session on click.
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: redirectTo ?? `${process.env.APP_URL ?? ''}/auth/callback`,
    },
  })

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[email] generateLink failed:', linkError)
    res.status(502).json({ error: 'Failed to generate confirmation link' })
    return
  }

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
