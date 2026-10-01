// POST /api/send-chat-message
//
// Inserts a visitor or authenticated admin message into chat_messages using
// the service-role key, bypassing RLS. Visitor messages mark the parent
// inquiry unread for admins.
//
// Body: { inquiry_id, body, attachment_url?, attachment_name? }
// Returns: the inserted chat_messages row

import { requireAdmin } from './lib/auth-guard.js'

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
    req.on('end', () => { try { resolve(JSON.parse(raw)) } catch { resolve(null) } })
    req.on('error', () => resolve(null))
  })
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.writeHead(200); res.end(); return
  }
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!SUPABASE_URL || !SERVICE_KEY) return sendJson(res, 500, { error: 'Supabase service role not configured' })

  const body = await parseJsonBody(req)
  if (!body) return sendJson(res, 400, { error: 'Invalid request body' })

  const { inquiry_id, body: msgBody, attachment_url, attachment_name } = body
  const sender = body.sender === 'admin' ? 'admin' : 'visitor'
  if (!inquiry_id) return sendJson(res, 400, { error: 'inquiry_id is required' })
  if (!msgBody && !attachment_url) return sendJson(res, 400, { error: 'body or attachment_url is required' })

  // Never let a visitor impersonate an admin merely by changing the request
  // body. Admin replies use this endpoint so they work even when direct
  // browser-to-Supabase RLS policies are unavailable or stale.
  if (sender === 'admin' && !(await requireAdmin(req))) {
    return sendJson(res, 403, { error: 'Admin authentication is required' })
  }

  const headers = {
    'Content-Type':  'application/json',
    'Prefer':        'return=representation',
    apikey:          SERVICE_KEY,
    Authorization:   `Bearer ${SERVICE_KEY}`,
  }

  // Insert the message
  const msgResp = await fetch(
    `${SUPABASE_URL}/rest/v1/chat_messages?select=*`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inquiry_id,
        sender,
        body: String(msgBody || '').slice(0, 10000),
        attachment_url: attachment_url || null,
        attachment_name: attachment_name || null,
      }),
    }
  )
  const msgJson = await msgResp.json().catch(() => null)
  if (!msgResp.ok) {
    console.error('[send-chat-message] insert error:', msgResp.status, msgJson)
    return sendJson(res, 502, { error: msgJson?.message || `Supabase ${msgResp.status}` })
  }

  const inserted = Array.isArray(msgJson) ? msgJson[0] : msgJson
  if (!inserted?.id) return sendJson(res, 502, { error: 'No row returned' })

  // A visitor message is new work for the team. An admin reply must not put
  // the same conversation back in the unread queue.
  if (sender === 'visitor') {
    fetch(`${SUPABASE_URL}/rest/v1/chat_inquiries?id=eq.${inquiry_id}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ read_by_admin: false }),
    }).catch(() => {})
  }

  return sendJson(res, 200, inserted)
}
