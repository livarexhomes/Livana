import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from './lib/auth-guard.js'

/**
 * DELETE /api/clear-all-chats
 *
 * Hard-deletes all live chat conversations and contact-form conversations.
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
    .not('id', 'is', null) // delete all rows

  if (inqErr) {
    console.error('[clear-all-chats] inquiries error:', inqErr)
    return res.status(500).json({ error: inqErr.message })
  }

  // email_thread_replies.contact_id references contact_messages with ON DELETE
  // CASCADE, so removing submissions also removes their email conversation.
  const { error: contactErr } = await supabase
    .from('contact_messages')
    .delete()
    .not('id', 'is', null)

  if (contactErr) {
    console.error('[clear-all-chats] contact messages error:', contactErr)
    return res.status(500).json({ error: contactErr.message })
  }

  return res.status(200).json({ ok: true })
}
