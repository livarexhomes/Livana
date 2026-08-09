// Live-support presence + availability — single source of truth.
//
// Presence ("is this agent actually connected?") and availability ("is this
// agent accepting new conversations?") both live on the `agents` roster, which
// is the one source every surface reads:
//
//   - `agents.presence`      'online' | 'away' | 'offline' — derived server-side
//                            from the `last_seen_at` heartbeat by
//                            `public.compute_presence()` / `public.sweep_presence()`.
//                            Clients only ever write heartbeats; they never
//                            declare their own status.
//   - `agents.available`     bool — the agent's explicit availability toggle.
//   - `agents.last_seen_at`  heartbeat timestamp written by the admin-presence
//                            module on a throttle while the admin page is open.
//
// The customer-facing chatbot counts agents where presence = 'online' AND
// availability = true (via the `available_agents` view) and NEVER derives
// availability from frontend UI state or a manually-displayed status.
//
// `subscribeSupportPresence` is the one realtime feed: it watches the roster
// and re-emits whenever any agent's presence/availability changes.

import { createClient, isSupabaseConfigured } from './supabase'

export type SupportStatus = 'online' | 'away' | 'offline'
export type AgentRole = 'admin' | 'agent' | 'support'

/** Roster row as surfaced by the unified presence system. */
export interface SupportAgent {
  id: string
  user_id: string
  name: string
  email: string
  role: AgentRole
  active: boolean
  presence: SupportStatus
  available: boolean
  availability_note?: string | null
  last_seen_at?: string | null
  created_at?: string
}

/**
 * How a client read the roster. When the deployed agents table predates
 * migration 008 (no `presence`/`available` columns), `schemaMissingPresence`
 * is set and the UI should show "run the migration" instead of a fabricated
 * offline state.
 */
export interface PresenceFeedStatus {
  ok: boolean
  error?: string
  schemaMissingPresence?: boolean
  schemaMissingAvailable?: boolean
}

/** Aggregate over the roster: per-agent breakdown + availability counts. */
export interface LiveSupportState {
  status: SupportStatus
  online: boolean
  onlineAgents: SupportAgent[]
  awayAgents: SupportAgent[]
  offlineAgents: SupportAgent[]
  agents: SupportAgent[]
  /** Agents where presence = 'online' AND availability = true. */
  availableCount: number
  agentCount: number
}

const EMPTY_STATE: LiveSupportState = {
  status: 'offline',
  online: false,
  onlineAgents: [],
  awayAgents: [],
  offlineAgents: [],
  agents: [],
  availableCount: 0,
  agentCount: 0,
}

export function isAgentEntry(meta: Record<string, unknown>): boolean {
  return typeof meta?.role === 'string'
    && ['admin', 'agent', 'support'].includes(meta.role)
}

export function isSupportOnline(presence: Record<string, unknown> | undefined): boolean {
  if (!presence) return false
  // Presence map: connectionId -> tracked metadata
  return Object.values(presence).some((meta) => {
    const m = (meta ?? {}) as Record<string, unknown>
    return isAgentEntry(m)
  })
}

function normalizeRow(row: Record<string, unknown>): SupportAgent {
  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    name: String(row.name ?? ''),
    email: String(row.email ?? ''),
    role: (['admin', 'agent', 'support'].includes(row.role as string) ? row.role : 'agent') as AgentRole,
    active: row.active !== false,
    presence: (['online', 'away', 'offline'].includes(row.presence as string) ? row.presence : 'offline') as SupportStatus,
    available: row.available !== false,
    availability_note: typeof row.availability_note === 'string' ? row.availability_note : undefined,
    last_seen_at: typeof row.last_seen_at === 'string' ? row.last_seen_at : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
  }
}

function aggregate(rows: SupportAgent[]): LiveSupportState {
  const active = rows.filter((a) => a.active)
  const onlineAgents = active.filter((a) => a.presence === 'online')
  const awayAgents = active.filter((a) => a.presence === 'away')
  const offlineAgents = active.filter((a) => a.presence === 'offline')
  const availableCount = onlineAgents.filter((a) => a.available).length
  return {
    status: onlineAgents.length > 0 ? 'online' : awayAgents.length > 0 ? 'away' : 'offline',
    online: onlineAgents.length > 0,
    onlineAgents,
    awayAgents,
    offlineAgents,
    agents: active,
    availableCount,
    agentCount: active.length,
  }
}

function detectMissingColumns(msg: string): { schemaMissingPresence?: boolean; schemaMissingAvailable?: boolean } {
  const out: { schemaMissingPresence?: boolean; schemaMissingAvailable?: boolean } = {}
  if (/presence/.test(msg) && /column|does not exist/.test(msg)) out.schemaMissingPresence = true
  if (/available/.test(msg) && /column|does not exist/.test(msg)) out.schemaMissingAvailable = true
  return out
}

/**
 * Fetch the current roster + availability aggregate. Falls back to the
 * server-side `/api/support-presence` aggregate when this client can't read
 * the roster directly (e.g. anonymous widget on a locked-down project), and
 * degrades to an empty state on total failure.
 *
 * `onStatus` (optional) receives read failures — including when the deployed
 * `agents` table is missing the `presence`/`available` columns (migration 008
 * not applied), which is the single most common cause of "everything offline".
 */
export async function fetchSupportPresence(
  onStatus?: (status: PresenceFeedStatus) => void,
): Promise<LiveSupportState> {
  if (!isSupabaseConfigured()) {
    onStatus?.({ ok: false, error: 'Supabase not configured' })
    return { ...EMPTY_STATE }
  }
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('agents')
      .select('id, user_id, name, email, role, active, presence, available, availability_note, last_seen_at, created_at')
      .order('created_at', { ascending: true })
    if (!error && Array.isArray(data)) {
      onStatus?.({ ok: true })
      return aggregate((data as Record<string, unknown>[]).map(normalizeRow))
    }
    if (error) {
      const schema = detectMissingColumns(String(error?.message ?? ''))
      onStatus?.({ ok: false, error: error.message, ...schema })
    }
  } catch {
    /* fall through to the API aggregate */
  }
  try {
    const res = await fetch('/api/support-presence', { method: 'POST' })
    if (res.ok) {
      const json = (await res.json()) as { onlineCount?: number; agents?: Record<string, unknown>[]; error?: string }
      if (Array.isArray(json.agents)) {
        onStatus?.({ ok: true })
        return aggregate(json.agents.map(normalizeRow))
      }
      // Anonymous viewer: only the count is exposed.
      onStatus?.({ ok: true })
      return { ...EMPTY_STATE, availableCount: json.onlineCount ?? 0 }
    }
    onStatus?.({ ok: false, error: `presence API ${res.status}` })
  } catch (err) {
    onStatus?.({ ok: false, error: String(err) })
  }
  return { ...EMPTY_STATE }
}

/**
 * Trigger the server-side presence sweep (`sweep_presence`), which flips
 * stale heartbeats to away/offline. Runs through the API endpoint so it works
 * for anonymous visitors too. Returns the swept aggregate when available.
 */
async function runPresenceSweep(): Promise<LiveSupportState | null> {
  try {
    const res = await fetch('/api/support-presence', { method: 'POST' })
    if (res.ok) {
      const json = (await res.json()) as { onlineCount?: number; agents?: Record<string, unknown>[] }
      if (Array.isArray(json.agents)) return aggregate(json.agents.map(normalizeRow))
      return { ...EMPTY_STATE, availableCount: json.onlineCount ?? 0 }
    }
  } catch {
    /* the periodic direct roster fetch below still self-heals */
  }
  return null
}

/**
 * Subscribe to the live roster (the single presence source). Re-emits whenever
 * any agent's presence or availability changes, runs a server-side presence
 * sweep periodically so stale heartbeats flip to offline, and refetches the
 * aggregate every 30s to self-heal missed realtime events. Returns an
 * unsubscribe fn.
 */
export function subscribeSupportPresence(
  onChange: (state: LiveSupportState) => void,
  onError?: (err: unknown) => void,
): () => void {
  let unsubscribed = false
  let interval: ReturnType<typeof setInterval> | null = null
  let disposed = false

  const emit = (rows: SupportAgent[]) => {
    if (unsubscribed) return
    onChange(aggregate(rows))
  }

  // Initial + periodic snapshot (self-healing; the widget also uses this).
  const refresh = () => {
    fetchSupportPresence((status) => {
      // Surface read failures (incl. missing presence column) to callers.
      if (!status.ok) onError?.(status)
    }).then((state) => {
      if (!unsubscribed) onChange(state)
    }).catch((err) => onError?.(err))
  }
  refresh()
  interval = setInterval(refresh, 30_000)

  // Server-side presence sweep: flips stale heartbeats to away/offline so the
  // roster's stored `presence` never disagrees with last_seen_at.
  const sweep = () => {
    runPresenceSweep().then((state) => {
      if (!unsubscribed && state) onChange(state)
    }).catch((err) => onError?.(err))
  }
  sweep()
  const sweepInterval = setInterval(sweep, 15_000)

  // Live feed: roster changes drive the aggregate in realtime.
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const channel = supabase
        .channel('livarex-support-roster')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'agents' },
          () => refresh(),
        )
        .subscribe((status, err) => {
          console.log('[live-support] roster subscribe status:', status)
          if (status !== 'SUBSCRIBED' && status !== 'CHANNEL_ERROR') {
            console.warn('[live-support] roster subscribe failed:', status, err)
          }
        })
      disposed = false
      return () => {
        unsubscribed = true
        disposed = true
        if (interval) clearInterval(interval)
        if (sweepInterval) clearInterval(sweepInterval)
        supabase.removeChannel(channel)
      }
    } catch (err) {
      onError?.(err)
    }
  }

  return () => {
    unsubscribed = true
    disposed = true
    if (interval) clearInterval(interval)
    if (sweepInterval) clearInterval(sweepInterval)
  }
}
