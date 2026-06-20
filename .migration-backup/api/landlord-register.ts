import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { rateLimit } from './lib/rate-limit'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  whatsapp: z.string().min(1),
  city: z.string().optional(),
  bio: z.string().optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!rateLimit(req, res, { windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: 'register' })) return

  const parsed = schema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
  }

  const { email, password, full_name, whatsapp, city, bio } = parsed.data

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({ error: 'Server not configured' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as SupabaseClient & { auth: { admin: any } }

  // Create the user but require email verification (removed email_confirm: true)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      full_name,
      whatsapp,
      city:  city  ?? null,
      bio:   bio   ?? null,
      role:  'landlord',
    },
  })

  if (createError) {
    // If the user already exists return a clear message
    if (createError.message?.toLowerCase().includes('already')) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }
    return res.status(400).json({ error: createError.message })
  }

  const userId = created.user.id

  // Create the landlords row immediately so the onboarding page can load it.
  const { error: insertError } = await admin.from('landlords').insert({
    user_id:     userId,
    full_name,
    whatsapp,
    city:        city  ?? null,
    bio:         bio   ?? null,
    status:      'not_submitted',
    is_verified: false,
  })

  if (insertError && !insertError.message.includes('duplicate')) {
    console.error('[landlord-register] landlords insert failed:', insertError)
    // Non-fatal — onboarding will still work, just log it
  }

  return res.status(200).json({ ok: true })
}
