import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user_id } = req.body ?? {}
  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return res.status(503).json({ error: 'Server not configured' })
  }

  const authToken = req.headers.authorization?.split(' ')[1]
  if (!authToken) {
    return res.status(401).json({ error: 'Missing auth token' })
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as any

  const { data: userData, error: userError } = await authClient.auth.getUser(authToken)
  if (userError || !userData?.user) {
    console.error('[delete-user] invalid auth token:', userError)
    return res.status(401).json({ error: 'Invalid auth token' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as any

  const { data: adminRow, error: adminError } = await admin
    .from('admins')
    .select('id')
    .eq('id', userData.user.id)
    .single()

  if (adminError || !adminRow) {
    console.error('[delete-user] unauthorized:', adminError)
    return res.status(403).json({ error: 'Admin access required' })
  }

  const { error } = await admin.auth.admin.deleteUser(user_id)
  if (error) {
    console.error('[delete-user] failed to delete auth user:', error)
    return res.status(502).json({ error: error.message })
  }

  return res.status(200).json({ ok: true })
}
