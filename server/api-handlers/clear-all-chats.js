import { createClient } from '@supabase/supabase-js'

/**
 * DELETE /api/clear-all-chats
 *
 * Hard-deletes ALL chat_messages and ALL chat_inquiries.
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

  const supabase = createClient(supabaseUrl, serviceKey)

  // Delete messages first (FK references inquiries)
  const { error: msgErr } = await supabase
    .from('chat_messages')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // delete all rows

  if (msgErr) {
    console.error('[clear-all-chats] messages error:', msgErr)
    return res.status(500).json({ error: msgErr.message })
  }

  const { error: inqErr } = await supabase
    .from('chat_inquiries')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // delete all rows

  if (inqErr) {
    console.error('[clear-all-chats] inquiries error:', inqErr)
    return res.status(500).json({ error: inqErr.message })
  }

  return res.status(200).json({ ok: true })
}
