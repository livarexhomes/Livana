/// <reference lib="dom" />

declare const process: { env: Record<string, string | undefined> }

function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
}

function sendJson(res: any, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function parseJsonBody(req: any): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    if (typeof req.body === 'string') {
      try {
        return resolve(JSON.parse(req.body))
      } catch {
        return resolve(null)
      }
    }

    if (req.body && typeof req.body === 'object') {
      return resolve(req.body)
    }

    if (typeof req.json === 'function') {
      req.json().then(resolve).catch(() => resolve(null))
      return
    }

    let raw = ''
    req.on('data', (chunk: unknown) => {
      if (typeof chunk === 'string') raw += chunk
      else if (chunk instanceof Uint8Array) raw += new TextDecoder().decode(chunk)
      else raw += String(chunk)
    })
    req.on('end', () => {
      if (!raw) return resolve(null)
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve(null)
      }
    })
    req.on('error', () => resolve(null))
  })
}

export default async function handler(req: any, res: any) {
  const SUPABASE_URL = getEnv('SUPABASE_URL') || ''
  const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return sendJson(res, 500, {
      error: 'Missing Supabase environment variables',
      details: 'SUPABASE_URL and a service key (SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY) must be configured',
    })
  }

  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  const body = await parseJsonBody(req)
  if (!body || typeof body.email !== 'string' || typeof body.otp !== 'string') return sendJson(res, 400, { error: 'Invalid request body' })

  const email = String(body.email).trim()
  const otp = String(body.otp).trim()
  if (!email || !otp) return sendJson(res, 400, { error: 'Email and OTP are required' })

  try {
    const now = new Date().toISOString()
    const q = `${SUPABASE_URL}/rest/v1/verification_codes?email=eq.${encodeURIComponent(email)}&code=eq.${encodeURIComponent(otp)}&expires_at=gt.${encodeURIComponent(now)}&select=id,expires_at`
    const listResp = await fetch(q, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
      },
    })

    if (!listResp.ok) {
      const errBody = await listResp.json().catch(() => null)
      return sendJson(res, listResp.status || 500, { error: errBody?.message || 'Failed to query verification codes' })
    }

    const rows = await listResp.json().catch(() => []) as any[]
    if (!Array.isArray(rows) || rows.length === 0) {
      return sendJson(res, 400, { error: 'Invalid or expired code' })
    }

    const id = rows[0].id
    if (id) {
      // delete used code
      await fetch(`${SUPABASE_URL}/rest/v1/verification_codes?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
      }).catch(() => null)
    }

    return sendJson(res, 200, { success: true })
  } catch (error) {
    return sendJson(res, 500, { error: String(error) })
  }
}
