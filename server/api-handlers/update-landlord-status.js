/**
 * POST /api/update-landlord-status
 *
 * Updates a landlord's status (suspend, approve, etc.) in the landlords table.
 * Uses the service-role key to bypass RLS policies.
 *
 * Body: { landlordId: string, status: string, isVerified?: boolean }
 * Header: Authorization: Bearer <admin_access_token>
 */

function getEnv(key) {
  if (typeof process !== 'undefined' && process.env) return process.env[key]
  return undefined
}

function sendJson(res, status, body) {
  if (typeof res.status === 'function') { res.status(status).json(body); return }
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function getErrorMessage(data) {
  if (!data || typeof data !== 'object') return ''
  const e = data
  return String(e.error || e.message || e.msg || e.details || e.hint || '').trim()
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    if (typeof req.body === 'string') {
      try { return resolve(JSON.parse(req.body)) } catch { return resolve(null) }
    }
    if (req.body && typeof req.body === 'object') return resolve(req.body)
    if (typeof req.json === 'function') { req.json().then(resolve).catch(() => resolve(null)); return }
    let raw = ''
    req.on('data', (chunk) => {
      if (typeof chunk === 'string') raw += chunk
      else if (chunk instanceof Uint8Array) raw += new TextDecoder().decode(chunk)
      else raw += String(chunk)
    })
    req.on('end', () => { try { resolve(JSON.parse(raw)) } catch { resolve(null) } })
    req.on('error', () => resolve(null))
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const SUPABASE_URL     = (getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || '').replace(/\/$/, '')
  const SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return sendJson(res, 500, { error: 'Server not configured' })
  }

  // ── 1. Verify the caller is an admin ────────────────────────────────────────
  const authHeader  = (req.headers?.authorization ?? req.headers?.Authorization ?? '')
  const callerToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!callerToken) return sendJson(res, 401, { error: 'Missing authorization token' })

  const callerRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${callerToken}`, apikey: SERVICE_ROLE_KEY },
  })
  if (!callerRes.ok) return sendJson(res, 401, { error: 'Invalid token' })

  const callerUser = await callerRes.json().catch(() => null)
  const meta       = callerUser?.app_metadata ?? {}
  const isAdmin    = meta.role === 'admin' || (Array.isArray(meta.roles) && meta.roles.includes('admin'))
  if (!isAdmin) return sendJson(res, 403, { error: 'Admin access required' })

  // ── 2. Validate body ─────────────────────────────────────────────────────────
  const body      = await parseJsonBody(req)
  const landlordId = (body?.landlordId ?? '').trim()
  const status    = (body?.status ?? '').trim()
  const isVerified = body?.isVerified === true

  if (!landlordId) return sendJson(res, 400, { error: 'landlordId is required' })
  if (!status) return sendJson(res, 400, { error: 'status is required' })

  const validStatuses = ['pending', 'approved', 'rejected', 'suspended', 'not_submitted']
  if (!validStatuses.includes(status)) {
    return sendJson(res, 400, { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
  }

  // ── 3. Update landlord status in the landlords table ───────────────────────
  const updateData = { status }
  if (status === 'approved') {
    updateData.is_verified = true
  } else {
    updateData.is_verified = false
  }

  const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      updateAttributes: updateData
    })
  }).catch(err => ({ ok: false, status: 500, json: () => Promise.resolve({ error: err.message }) }))

  // If the admin users endpoint doesn't work for landlords, try direct DB update
  if (!updateRes.ok) {
    // Fallback: Use service role directly via the REST API
    const dbUpdateRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_landlord_status`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ p_landlord_id: landlordId, p_status: status, p_is_verified: status === 'approved' })
    })

    if (!dbUpdateRes.ok) {
      const errData = await dbUpdateRes.json().catch(() => null)
      console.error('[update-landlord-status] Update failed', dbUpdateRes.status, errData)
      return sendJson(res, dbUpdateRes.status, { error: getErrorMessage(errData) || 'Failed to update landlord status' })
    }
  }

  return sendJson(res, 200, { ok: true, landlordId, status })
}
