import type { IncomingMessage, ServerResponse } from 'http'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the environment.')
}

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface Body {
  email: string
  password: string
  full_name: string
  whatsapp: string
  city?: string | null
  bio?: string | null
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { email, password, full_name, whatsapp, city = null, bio = null } = body

  if (!email || !password || !full_name || !whatsapp) {
    return new Response(JSON.stringify({ error: 'Missing required registration fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, whatsapp, city, bio },
  })

  if (signUpError || !signUpData.user) {
    return new Response(JSON.stringify({ error: signUpError?.message ?? 'Failed to create user' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const userId = signUpData.user.id

  const { error: insertError } = await supabase.from('landlords').insert({
    user_id: userId,
    full_name,
    whatsapp,
    city,
    bio,
    status: 'not_submitted',
    is_verified: false,
  })

  if (insertError) {
    await supabase.auth.admin.deleteUser(userId).catch(() => null)
    return new Response(JSON.stringify({ error: insertError.message || 'Failed to create landlord profile' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
