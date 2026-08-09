import { createClient } from '@supabase/supabase-js'

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

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server misconfiguration' })
  }

  const body = req.body ?? {}
  const inquiry_id = body.inquiry_id
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
