/// <reference lib="dom" />

declare const process: { env: Record<string, string | undefined> }

function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
}

interface Body {
  userId: string
  name?: string
  email?: string
}

function sendJson(res: any, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function getErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const err = data as Record<string, unknown>
  return (
    String(err.error || err.message || err.msg || err.details || err.hint || err.error_description || '')
  ).trim()
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

/**
 * POST /api/register-support-agent
 *
 * Upserts a row into `public.agents` for an existing non-anonymous Supabase
 * user. Called from the Admin dashboard on login (or from the Support →
 * Agents page when an admin adds a teammate) so the agent appears in the
 * live-support roster and can be assigned chats.
 *
 * Body: { userId: string, name?: string, email?: string }
 *
 * Auth: uses the Supabase service-role key (same as landlord-register) —
 * RLS on `agents` intentionally has no public INSERT policy.
 */
export default async function handler(req: any, res: any) {
  const SUPABASE_URL = getEnv('SUPABASE_URL') || ''
  const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || ''

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return sendJson(res, 500, {
      error: 'Missing Supabase environment variables',
      details: 'SUPABASE_URL and a service key (SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY) must be configured',
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

    const { userId, name, email } = body
    if (!userId || typeof userId !== 'string') {
      return sendJson(res, 400, { error: 'Missing required field: userId' })
    }

    // Confirm the user exists and is not anonymous before creating an agent.
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
      },
    })
    if (!userResponse.ok) {
      return sendJson(res, 400, { error: 'Supabase user not found' })
    }
    const userData = await userResponse.json().catch(() => null)
    const isAnonymous = userData?.is_anonymous === true
      || (userData?.app_metadata && userData.app_metadata.is_anonymous === true)
    if (isAnonymous) {
      return sendJson(res, 400, { error: 'Anonymous users cannot be support agents' })
    }

    const agentName = (name && String(name).trim()) || String(userData?.user_metadata?.full_name || '')
      || String(userData?.email || '').split('@')[0] || 'Support Agent'
    const agentEmail = (email && String(email).trim()) || String(userData?.email || '')

    // Upsert — first login registers the admin; subsequent logins refresh the
    // name/email. Unique on user_id.
    const upsertResponse = await fetch(`${SUPABASE_URL}/rest/v1/agents?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation,resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: userId,
        name: agentName,
        email: agentEmail,
      }),
    })

    if (!upsertResponse.ok) {
      const upsertError = await upsertResponse.json().catch(() => null)
      return sendJson(res, upsertResponse.status || 500, {
        error: getErrorMessage(upsertError) || 'Failed to register support agent',
      })
    }

    const rows = await upsertResponse.json().catch(() => null)
    const agent = Array.isArray(rows) ? rows[0] : rows

    return sendJson(res, 200, {
      success: true,
      agent: agent
        ? { id: agent.id, user_id: agent.user_id, name: agent.name, email: agent.email, role: agent.role, active: agent.active }
        : null,
    })
  } catch (error) {
    return sendJson(res, 500, { error: String(error) })
  }
}
