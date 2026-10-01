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

  if (!contactId && !inquiryId && !email) {
    return sendJson(res, 400, { error: 'contactId, inquiryId, or email required' })
  }

  const headers = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
  }

  async function getRows(filter) {
    const apiUrl =
      `${supabaseUrl}/rest/v1/email_thread_replies?` +
      `${filter}&order=created_at.asc&limit=${limit}`
    const response = await fetch(apiUrl, { headers })
    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(errText || `Failed to load thread (HTTP ${response.status})`)
    }
    const rows = await response.json()
    return Array.isArray(rows) ? rows : []
  }

  try {
    let rows = []

    if (contactId) {
      // Primary lookup: rows explicitly linked to the contact.
      const primary = await getRows(
        `contact_id=eq.${encodeURIComponent(contactId)}`,
      )
      rows.push(...primary)

      // Recovery lookup: an older/missed inbound webhook may have been
      // persisted without contact_id even though the sender email is known.
      // Resolve the contact's email, then merge inbound rows from that sender.
      const contactResponse = await fetch(
        `${supabaseUrl}/rest/v1/contact_messages?id=eq.${encodeURIComponent(contactId)}&select=email&limit=1`,
        { headers },
      )
      if (contactResponse.ok) {
        const contactRows = await contactResponse.json().catch(() => [])
        const contactEmail = String(contactRows?.[0]?.email || '').trim().toLowerCase()
        if (contactEmail) {
          const inboundRows = await getRows(
            `from_email=ilike.${encodeURIComponent(contactEmail)}`,
          )
          rows.push(...inboundRows)
        }
      }
    } else if (inquiryId) {
      rows = await getRows(`inquiry_id=eq.${encodeURIComponent(inquiryId)}`)
    } else {
      // Email fallback is used by legacy callers. Include both directions:
      // outbound messages addressed to the contact and inbound messages from it.
      const [outbound, inbound] = await Promise.all([
        getRows(`to_email=eq.${encodeURIComponent(email.toLowerCase())}`),
        getRows(`from_email=ilike.${encodeURIComponent(email.toLowerCase())}`),
      ])
      rows.push(...outbound, ...inbound)
    }

    // The two contact lookups can overlap, so deduplicate by row id and
    // always return the conversation chronologically.
    const unique = new Map()
    for (const row of rows) {
      if (row?.id) unique.set(row.id, row)
    }
    const replies = Array.from(unique.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )

    return sendJson(res, 200, { replies: replies.slice(-limit) })
  } catch (err) {
    console.error('[get-email-thread] failed to load thread', err)
    return sendJson(res, 500, { error: String(err?.message || err) })
  }
}
