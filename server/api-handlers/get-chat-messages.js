// GET /api/get-chat-messages?inquiry_id=...&after=<iso-timestamp>
//
// Fetches chat_messages for a given inquiry using the service-role key,
// bypassing RLS. The inquiry_id UUID acts as an unguessable access token.
// `after` is optional — when provided, only messages newer than that
// timestamp are returned (used for polling to receive admin replies).

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.writeHead(200); res.end(); return
  }
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' })

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!SUPABASE_URL || !SERVICE_KEY) return sendJson(res, 500, { error: 'Supabase service role not configured' })

  const url = new URL(req.url, 'http://localhost')
  const inquiry_id = url.searchParams.get('inquiry_id')
  const after      = url.searchParams.get('after') // ISO timestamp, optional

  if (!inquiry_id) return sendJson(res, 400, { error: 'inquiry_id is required' })

  // Build the PostgREST filter
  let filter = `inquiry_id=eq.${encodeURIComponent(inquiry_id)}`
  if (after) filter += `&created_at=gt.${encodeURIComponent(after)}`

  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/chat_messages?${filter}&order=created_at.asc&select=*`,
    {
      headers: {
        apikey:        SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept:        'application/json',
      },
    }
  )

  const json = await resp.json().catch(() => null)
  if (!resp.ok) {
    console.error('[get-chat-messages] error:', resp.status, json)
    return sendJson(res, 502, { error: json?.message || `Supabase ${resp.status}` })
  }

  return sendJson(res, 200, { messages: Array.isArray(json) ? json : [] })
}
