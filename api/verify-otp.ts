import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, otp } = req.body ?? {}
  if (!email || !otp) return res.status(400).json({ error: 'email and otp are required' })

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return res.status(503).json({ error: 'Server not configured' })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as SupabaseClient & { auth: { admin: any } }

  const { data: record, error } = await admin
    .from('otp_verifications')
    .select('otp, expires_at, verified')
    .eq('email', email)
    .single()

  if (error || !record) return res.status(400).json({ error: 'No OTP found for this email.' })
  if (record.verified)   return res.status(400).json({ error: 'OTP already used.' })
  if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'OTP has expired. Please request a new one.' })
  if (record.otp !== String(otp)) return res.status(400).json({ error: 'Incorrect code. Please try again.' })

  // Mark as verified
  await admin.from('otp_verifications').update({ verified: true }).eq('email', email)

  return res.status(200).json({ ok: true })
}
