import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from './lib/auth-guard.js'

function parseJsonBody(req) {
  return new Promise((resolve) => {
    if (typeof req.body === 'string') {
      try { return resolve(JSON.parse(req.body)) } catch { return resolve(null) }
    }
    if (req.body && typeof req.body === 'object') return resolve(req.body)
    if (typeof req.json === 'function') {
      req.json().then(resolve).catch(() => resolve(null))
      return
    }
    let raw = ''
    req.on('data', (chunk) => {
      raw += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)
    })
    req.on('end', () => {
      try { resolve(JSON.parse(raw)) } catch { resolve(null) }
    })
    req.on('error', () => resolve(null))
  })
}

/**
 * DELETE /api/clear-chat-messages
 * Body: { inquiry_id: string }
 *
 * Hard-deletes all chat_messages for a given inquiry.
 * Uses the service-role key — admin-only action (this endpoint
 * is only reachable from the admin UI, behind AuthGuard).
 */
export default async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server misconfiguration' })
  }
  if (!(await requireAdmin(req))) {
    return res.status(403).json({ error: 'Admin authentication is required' })
  }

  const body = await parseJsonBody(req)
  const inquiry_id = body?.inquiry_id
  if (!inquiry_id) {
    return res.status(400).json({ error: 'inquiry_id is required' })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('inquiry_id', inquiry_id)

  if (error) {
    console.error('[clear-chat-messages] DB error:', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ ok: true })
}
