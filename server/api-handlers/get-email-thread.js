/**
 * get-email-thread.js
 *
 * Returns the email reply history for a contact or inquiry, used by the
 * in-app email thread UI in AdminSupport.
 *
 * GET /api/get-email-thread?contactId=...
 * GET /api/get-email-thread?inquiryId=...
 * GET /api/get-email-thread?email=...&limit=20   (fallback)
 */

function getEnv(key) {
  if (typeof process !== 'undefined' && process.env) return process.env[key]
  return undefined
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return sendJson(res, 500, { error: 'Supabase env not configured' })
  }

  // Parse query string (works in Vercel and Vite dev).
  let url = ''
  if (typeof req.url === 'string') url = req.url
  const qs = url.includes('?') ? url.split('?')[1] : ''
  const params = new URLSearchParams(qs)
  const contactId = params.get('contactId')
  const inquiryId = params.get('inquiryId')
  const email     = params.get('email')
  const limit     = Math.min(Number(params.get('limit') || 50), 200)

  let filter = ''
  if (contactId) filter = `contact_id=eq.${encodeURIComponent(contactId)}`
  else if (inquiryId) filter = `inquiry_id=eq.${encodeURIComponent(inquiryId)}`
  else if (email) filter = `to_email=eq.${encodeURIComponent(email.toLowerCase())}`
  else return sendJson(res, 400, { error: 'contactId, inquiryId, or email required' })

  const apiUrl =
    `${supabaseUrl}/rest/v1/email_thread_replies?` +
    `${filter}&order=created_at.desc&limit=${limit}`

  try {
    const r = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    })
    if (!r.ok) {
      const errText = await r.text().catch(() => '')
      return sendJson(res, r.status, { error: errText || 'Failed to load thread' })
    }
    const rows = await r.json()
    return sendJson(res, 200, { replies: rows ?? [] })
  } catch (err) {
    return sendJson(res, 500, { error: String(err?.message || err) })
  }
}
