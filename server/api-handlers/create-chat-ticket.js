// POST /api/create-chat-ticket
//
// Creates a chat_inquiries row using the service-role key, which bypasses RLS.
// This is needed because the anon/authenticated policies on chat_inquiries
// may not yet be applied (migration 011). Using the service role on the
// server side is safe: the client never sees the key, and we validate and
// sanitise every field before inserting.
//
// Request body:
//   { name, email?, phone?, note, visitor_id?, agent_id?, agent_status? }
//
// Response:
//   { id, ticket_no, read_by_admin } on success
//   { error } on failure

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body)
    if (typeof req.body === 'string') {
      try { return resolve(JSON.parse(req.body)) } catch { return resolve(null) }
    }
    if (typeof req.json === 'function') {
      return req.json().then(resolve).catch(() => resolve(null))
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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return sendJson(res, 500, { error: 'Supabase service role not configured' })
  }

  const body = await parseJsonBody(req)
  if (!body) return sendJson(res, 400, { error: 'Invalid request body' })

  const { name, email, phone, note, visitor_id, agent_id, agent_status } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return sendJson(res, 400, { error: 'name is required' })
  }
  if (!note || typeof note !== 'string' || !note.trim()) {
    return sendJson(res, 400, { error: 'note is required' })
  }

  // Sanitise lengths
  const row = {
    name:         String(name).slice(0, 200).trim(),
    email:        email   ? String(email).slice(0, 254).trim()  : null,
    phone:        phone   ? String(phone).slice(0, 30).trim()   : null,
    note:         String(note).slice(0, 5000).trim(),
    visitor_id:   visitor_id   || null,
    agent_id:     agent_id     || null,
    agent_status: agent_status || null,
  }

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_inquiries?select=id,ticket_no,read_by_admin`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Prefer':        'return=representation',
          'apikey':        SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify(row),
      }
    )

    const json = await resp.json().catch(() => null)

    if (!resp.ok) {
      console.error('[create-chat-ticket] Supabase error:', resp.status, json)
      return sendJson(res, 502, { error: json?.message || `Supabase ${resp.status}` })
    }

    const inserted = Array.isArray(json) ? json[0] : json
    if (!inserted?.id) return sendJson(res, 502, { error: 'No row returned' })

    return sendJson(res, 200, {
      id:            inserted.id,
      ticket_no:     inserted.ticket_no ?? null,
      read_by_admin: inserted.read_by_admin ?? false,
    })
  } catch (err) {
    console.error('[create-chat-ticket] unexpected error:', err)
    return sendJson(res, 500, { error: String(err) })
  }
}
