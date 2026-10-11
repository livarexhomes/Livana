import { createClient } from '@supabase/supabase-js'

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

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server misconfiguration' })
  }

  const body = req.body ?? {}
  const raw = body.inquiry_id
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
