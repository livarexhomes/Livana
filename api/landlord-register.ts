/// <reference lib="dom" />

declare const process: { env: Record<string, string | undefined> }

function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
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
  const SUPABASE_URL = getEnv('SUPABASE_URL') || ''
  const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''
  const VITE_SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || ''
  const VITE_SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || ''

  const envStatus = {
    SUPABASE_URL: Boolean(SUPABASE_URL),
    SUPABASE_SERVICE_KEY: Boolean(getEnv('SUPABASE_SERVICE_KEY')),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(getEnv('SUPABASE_SERVICE_ROLE_KEY')),
    VITE_SUPABASE_URL: Boolean(VITE_SUPABASE_URL),
    VITE_SUPABASE_ANON_KEY: Boolean(VITE_SUPABASE_ANON_KEY),
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return sendJson(res, 500, {
      error: 'Missing Supabase environment variables',
      details: 'SUPABASE_URL and a service key (SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY) must be configured',
      env: envStatus,
    })
  }

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

    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/landlords?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal,resolution=merge-duplicates',
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
