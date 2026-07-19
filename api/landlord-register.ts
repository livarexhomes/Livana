/// <reference lib="dom" />

declare const process: { env: Record<string, string | undefined> }

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the environment.')
}

interface Body {
  email: string
  password: string
  full_name: string
  whatsapp: string
  city?: string | null
  bio?: string | null
}

function sendJson(res: any, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function parseJsonBody(req: any): Promise<Body | null> {
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
  try {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' })
    }

    const body = await parseJsonBody(req)
    if (!body) {
      return sendJson(res, 400, { error: 'Invalid JSON body' })
    }

    const { email, password, full_name, whatsapp, city = null, bio = null } = body

    if (!email || !password || !full_name || !whatsapp) {
      return sendJson(res, 400, { error: 'Missing required registration fields' })
    }

    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, whatsapp, city, bio },
      }),
    })

    const userData = await userResponse.json().catch(() => null)
    const userId = userData?.id
    if (!userResponse.ok || typeof userId !== 'string') {
      return sendJson(res, userResponse.status || 400, {
        error: userData?.message || 'Failed to create user',
      })
    }

    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/landlords`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        full_name,
        whatsapp,
        city,
        bio,
        status: 'not_submitted',
        is_verified: false,
      }),
    })

    if (!profileResponse.ok) {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
      }).catch(() => null)

      const profileError = await profileResponse.json().catch(() => null)
      return sendJson(res, profileResponse.status || 500, {
        error: profileError?.message || 'Failed to create landlord profile',
      })
    }

    return sendJson(res, 200, { success: true })
  } catch (error) {
    return sendJson(res, 500, { error: String(error) })
  }
}
