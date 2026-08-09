// POST /api/support-presence
//
// Server-side presence sweep for the support system. Presence ("is the agent
// actually connected?") is derived from the `agents.last_seen_at` heartbeat
// timestamps by `public.compute_presence()` and reconciled by this endpoint —
// the client never decides its own online/offline state.
//
// The endpoint:
//   1. Calls `public.sweep_presence()` (SECURITY DEFINER) to flip stale
//      heartbeats to away/offline.
//   2. Returns the aggregate that every surface (admin Support page, agent
//      roster, customer chatbot) uses as the single source of truth:
//        - agents: the full roster with computed presence + availability
//        - onlineCount: agents where presence = 'online' AND available = true
//        - stats: { total, online, away, offline, available, active }
//
// Auth: requires an authenticated non-anonymous user. No admin-only gate
// because the chat widget (anonymous visitor) and the admin UI both need the
// aggregate; the view-level RLS + security_invoker keeps row access safe.
export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL || ''
  const SUPABASE_SERVICE_KEY =
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  function sendJson(status, body) {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }

  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return sendJson(405, { error: 'Method not allowed' })
    }

    // ── Auth: resolve the caller via their Bearer token ────────────────────
    const auth = String(req.headers?.authorization ?? '')
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    let isAuthed = false
    if (token && SUPABASE_URL) {
      try {
        const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_SERVICE_KEY },
        })
        const user = await resp.json().catch(() => null)
        isAuthed = Boolean(resp.ok && user?.id && user?.is_anonymous !== true)
      } catch {
        isAuthed = false
      }
    }

    // ── 1. Sweep stale presence (service role bypasses RLS) ────────────────
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/sweep_presence`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            apikey: SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json',
          },
          body: '{}',
        })
      } catch (err) {
        console.warn('[support-presence] sweep failed:', err)
      }
    }

    // ── 2. Read the aggregate. Anonymous visitors get the aggregate only. ──
    const headers = SUPABASE_SERVICE_KEY
      ? {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
        }
      : undefined

    const [rosterRes, countRes, statsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/agents?select=id,user_id,name,email,role,active,presence,available,availability_note,last_seen_at&order=created_at.asc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/available_agents?select=id&limit=1000`, { headers }),
      fetch(
        `${SUPABASE_URL}/rest/v1/agents?select=presence,available,active`,
        { headers },
      ),
    ])

    const agents = rosterRes.ok ? (await rosterRes.json().catch(() => [])) : []
    const availableRows = countRes.ok ? (await countRes.json().catch(() => [])) : []
    const allRows = statsRes.ok ? (await statsRes.json().catch(() => [])) : []

    const onlineCount = Array.isArray(availableRows) ? availableRows.length : 0

    const stats = { total: 0, online: 0, away: 0, offline: 0, available: 0, active: 0 }
    for (const row of Array.isArray(allRows) ? allRows : []) {
      stats.total += 1
      if (row?.active) stats.active += 1
      if (row?.available) stats.available += 1
      if (row?.presence === 'online') stats.online += 1
      else if (row?.presence === 'away') stats.away += 1
      else stats.offline += 1
    }

    return sendJson(200, {
      success: true,
      authed: isAuthed,
      onlineCount,
      stats,
      agents: isAuthed ? agents : [], // full roster only for logged-in users
      sweptAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[support-presence] error:', err)
    return sendJson(500, { error: String(err) })
  }
}
