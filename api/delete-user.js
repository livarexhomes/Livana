const { createClient } = require('@supabase/supabase-js')

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const authHeader = req.headers.authorization ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const { user_id } = req.body ?? {}

  if (!user_id) {
    res.status(400).json({ error: 'user_id is required' })
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    res.status(503).json({ error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
    return
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  if (token) {
    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !user) {
      res.status(401).json({ error: 'Unauthorized' })
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
  }

  const { error: deleteErr } = await admin.auth.admin.deleteUser(user_id)
  if (deleteErr) {
    res.status(500).json({ error: deleteErr.message })
    return
  }

  res.json({ ok: true })
}
