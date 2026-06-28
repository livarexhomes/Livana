const { createClient } = require('@supabase/supabase-js')

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const authHeader = req.headers.authorization ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    res.status(401).json({ error: 'Authorization token required' })
    return
  }

  const body = req.body ?? {}
  const user_id = body.user_id

  if (!user_id) {
    res.status(400).json({ error: 'user_id is required' })
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    res.status(503).json({
      error: 'Server misconfigured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in Vercel environment variables',
    })
    return
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify the caller is an authenticated admin
  const { data: { user }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !user) {
    res.status(401).json({ error: 'Unauthorized: invalid or expired token' })
    return
  }

  const meta = user.app_metadata ?? {}
  const isAdmin =
    meta.role === 'admin' ||
    (Array.isArray(meta.roles) && meta.roles.includes('admin'))

  if (!isAdmin) {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  // Clean up database rows first (before deleting auth user)
  // These will silently no-op if the user isn't in those tables
  await admin.from('tenants').delete().eq('user_id', user_id)
  await admin.from('landlords').delete().eq('user_id', user_id)

  // Delete from auth.users (requires service role)
  const { error: deleteErr } = await admin.auth.admin.deleteUser(user_id)
  if (deleteErr) {
    res.status(500).json({ error: deleteErr.message })
    return
  }

  res.json({ ok: true })
}
