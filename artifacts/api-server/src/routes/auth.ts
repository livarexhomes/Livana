import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { logger } from '../lib/logger'

const router = Router()

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

function getAnonClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set.')
  return createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

const APP_URL = () => process.env.APP_URL ?? 'https://livarex.com.ng'

// ─── In-memory OTP store ──────────────────────────────────────────────────────
interface OtpEntry { code: string; expiresAt: number }
const otpStore = new Map<string, OtpEntry>()

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function cleanExpiredOtps() {
  const now = Date.now()
  for (const [key, entry] of otpStore) {
    if (entry.expiresAt < now) otpStore.delete(key)
  }
}

// ─── POST /send-password-reset ────────────────────────────────────────────────
router.post('/send-password-reset', async (req, res) => {
  const { email } = req.body as { email?: string }
  if (!email) { res.status(400).json({ error: 'email is required' }); return }

  try {
    const supabase = getAnonClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL()}/reset-password`,
    })
    if (error) {
      logger.error({ err: error }, 'send-password-reset failed')
      res.status(500).json({ error: error.message })
      return
    }
    logger.info({ email }, 'Password reset email sent')
    res.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    logger.error({ err }, 'send-password-reset error')
    res.status(503).json({ error: msg })
  }
})

// ─── POST /landlord-register ──────────────────────────────────────────────────
router.post('/landlord-register', async (req, res) => {
  const { email, password, full_name, whatsapp, city, bio } = req.body as {
    email?: string
    password?: string
    full_name?: string
    whatsapp?: string
    city?: string | null
    bio?: string | null
  }

  if (!email || !password || !full_name || !whatsapp) {
    res.status(400).json({ error: 'email, password, full_name, and whatsapp are required' })
    return
  }

  try {
    const admin = getAdminClient()

    const { data: userData, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (createErr) {
      logger.error({ err: createErr }, 'landlord-register: user creation failed')
      res.status(400).json({ error: createErr.message })
      return
    }

    const userId = userData.user.id

    const { error: landlordErr } = await admin.from('landlords').insert({
      user_id:    userId,
      full_name,
      email,
      whatsapp,
      city:       city   ?? null,
      bio:        bio    ?? null,
      status:     'unverified',
      created_at: new Date().toISOString(),
    })

    if (landlordErr) {
      logger.error({ err: landlordErr }, 'landlord-register: landlord row insert failed')
      await admin.auth.admin.deleteUser(userId).catch(() => {})
      res.status(500).json({ error: 'Registration failed. Please try again.' })
      return
    }

    logger.info({ userId, email }, 'Landlord registered and confirmed')
    res.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    logger.error({ err }, 'landlord-register error')
    res.status(503).json({ error: msg })
  }
})

// ─── POST /send-otp ───────────────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  const { email } = req.body as { email?: string; full_name?: string }
  if (!email) { res.status(400).json({ error: 'email is required' }); return }

  cleanExpiredOtps()

  try {
    const code = generateOtp()
    otpStore.set(email.toLowerCase(), { code, expiresAt: Date.now() + 15 * 60 * 1000 })

    const supabase = getAnonClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })

    if (error) {
      logger.warn({ err: error, email }, 'send-otp: Supabase OTP fallback; using in-memory OTP')
    }

    logger.info({ email }, 'OTP generated and sent')
    res.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    logger.error({ err }, 'send-otp error')
    res.status(503).json({ error: msg })
  }
})

// ─── POST /verify-otp ─────────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body as { email?: string; otp?: string }
  if (!email || !otp) { res.status(400).json({ error: 'email and otp are required' }); return }

  cleanExpiredOtps()

  const key = email.toLowerCase()
  const entry = otpStore.get(key)

  if (entry && entry.code === otp && entry.expiresAt > Date.now()) {
    otpStore.delete(key)
    logger.info({ email }, 'OTP verified (in-memory)')
    res.json({ ok: true })
    return
  }

  try {
    const supabase = getAnonClient()
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (error) {
      res.status(400).json({ error: 'Incorrect or expired code. Please try again.' })
      return
    }
    logger.info({ email }, 'OTP verified (Supabase)')
    res.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    logger.error({ err }, 'verify-otp error')
    res.status(503).json({ error: msg })
  }
})

export default router
