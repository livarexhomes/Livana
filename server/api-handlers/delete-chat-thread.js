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
 * DELETE /api/delete-chat-thread
 * Body: { inquiry_id: string | string[] }
 *
 * Hard-deletes chat_messages AND the chat_inquiry row(s) themselves.
 * Admin-only — only reachable from behind the admin AuthGuard.
 * Uses service-role key to bypass RLS.
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
  const raw = body?.inquiry_id
  if (!raw) {
    return res.status(400).json({ error: 'inquiry_id is required' })
  }

  const ids = Array.isArray(raw) ? raw.filter(Boolean) : [raw]
  if (!ids.length) {
    return res.status(400).json({ error: 'inquiry_id is required' })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // Delete messages first (FK references inquiries)
  const { error: msgErr } = await supabase
    .from('chat_messages')
    .delete()
    .in('inquiry_id', ids)

  if (msgErr) {
    console.error('[delete-chat-thread] messages error:', msgErr)
    return res.status(500).json({ error: msgErr.message })
  }

  const { error: inqErr } = await supabase
    .from('chat_inquiries')
    .delete()
    .in('id', ids)

  if (inqErr) {
    console.error('[delete-chat-thread] inquiries error:', inqErr)
    return res.status(500).json({ error: inqErr.message })
  }

  return res.status(200).json({ ok: true, deleted: ids.length })
}
