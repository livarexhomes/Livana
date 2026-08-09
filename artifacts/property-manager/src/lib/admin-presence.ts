// Admin presence heartbeat — client side.
//
// Presence ("is the admin actually connected?") lives on the `agents` roster.
// The server derives `presence` from the `last_seen_at` heartbeat timestamp:
//
//   - `public.compute_presence(last_seen_at)`   (SQL, single source of truth)
//   - `public.sync_agent_presence()`            DB trigger: every heartbeat
//     UPDATE re-derives presence, so a fresh heartbeat → 'online' immediately
//     and a stopped heartbeat decays to 'away' → 'offline'.
//   - `public.sweep_presence()`                 periodic server sweep.
//
// This module is the client half: while an admin has any admin page open, it
// writes a throttled heartbeat to its own `agents` row — `last_seen_at` AND
// `presence = 'online'` in the same UPDATE. It NEVER declares online/offline
// based on UI state.
//
// The single presence timeout is defined server-side (90s online / 15m away,
// see compute_presence). The heartbeat interval (~45s) is shorter than the
// online timeout so the agent stays online while the page is open.

import { useEffect, useRef } from 'react'
import { createClient } from './supabase'

/** How often the heartbeat fires. Must be < the server online timeout (90s). */
export const LAST_SEEN_HEARTBEAT_MS = 45 * 1000

// ── Temporary diagnostics (wired into the Support page debug panel) ───────────

export interface PresenceDiagnostics {
  userId?: string
  agentId?: string
  presence?: string
  available?: boolean
  lastHeartbeatAt?: string
  lastSeenAt?: string
  heartbeatStatus?: 'idle' | 'ok' | 'error' | 'no-agent-row'
  heartbeatError?: string
  heartbeatCount: number
  registeredAt?: string
  realtime?: string
  timeoutLabel?: string
  /** True when the deployed agents table is missing the presence column. */
  schemaMissingPresence?: boolean
  schemaMissingAvailable?: boolean
}

const listeners = new Set<(d: PresenceDiagnostics) => void>()

export function subscribePresenceDiagnostics(listener: (d: PresenceDiagnostics) => void): () => void {
  listeners.add(listener)
  listener(currentDiagnostics)
  return () => listeners.delete(listener)
}

let currentDiagnostics: PresenceDiagnostics = { heartbeatCount: 0, heartbeatStatus: 'idle' }

function publishDiagnostics(partial: Partial<PresenceDiagnostics>) {
  currentDiagnostics = { ...currentDiagnostics, ...partial }
  listeners.forEach((l) => {
    try {
      l(currentDiagnostics)
    } catch {
      /* ignore */
    }
  })
}

/**
 * Mount once per admin page (AdminSidebar does this for all admin pages).
 * Resolves the current user's agents row ONCE, then writes a heartbeat
 * (`last_seen_at` + `presence = 'online'`) immediately and on an interval.
 * The DB trigger re-derives presence from last_seen_at, so this row is
 * always consistent.
 */
export function useAdminPresence(): void {
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let disposed = false
    let agentRowId: string | null = null
    let registeredAt: string | undefined

    const beat = async () => {
      if (disposed) return
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
      if (!user || user.is_anonymous) {
        publishDiagnostics({ userId: user?.id, heartbeatStatus: 'error', heartbeatError: 'no authenticated (non-anonymous) user' })
        return
      }
      publishDiagnostics({ userId: user.id })

      // Resolve this user's agents row once (cache it so the heartbeat is a
      // single UPDATE and can't race the roster-registration effect).
      if (!agentRowId) {
        try {
          const { data: roster } = await supabase
            .from('agents')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()
          if (roster?.id) {
            agentRowId = roster.id
            registeredAt = new Date().toISOString()
            publishDiagnostics({ agentId: roster.id, registeredAt })
          } else {
            publishDiagnostics({ heartbeatStatus: 'no-agent-row', heartbeatError: 'no agents row for this user' })
            return
          }
        } catch (err) {
          publishDiagnostics({ heartbeatStatus: 'error', heartbeatError: `roster lookup failed: ${err}` })
          return
        }
      }

      try {
        const nowIso = new Date().toISOString()
        // Write the heartbeat. If the deployed agents table predates migration
        // 008 (no `presence` column), the UPDATE fails — surface that exactly
        // instead of silently swallowing it.
        const { error } = await supabase
          .from('agents')
          .update({ last_seen_at: nowIso, presence: 'online' })
          .eq('id', agentRowId)
        if (error) {
          const msg = String(error?.message ?? error)
          const missingPresence = /presence/.test(msg) && /column|does not exist/.test(msg)
          const missingAvailable = /available/.test(msg) && /column|does not exist/.test(msg)
          if (missingPresence) {
            // Column missing → the migration hasn't run. Keep last_seen_at
            // working (heartbeat still proves the agent is present) and flag it.
            const { error: lsErr } = await supabase
              .from('agents')
              .update({ last_seen_at: nowIso })
              .eq('id', agentRowId)
            if (lsErr) {
              publishDiagnostics({ heartbeatStatus: 'error', heartbeatError: `last_seen update failed: ${lsErr.message}` })
              return
            }
            publishDiagnostics({
              schemaMissingPresence: true,
              schemaMissingAvailable: missingAvailable || undefined,
              lastHeartbeatAt: nowIso,
              lastSeenAt: nowIso,
              heartbeatStatus: 'error',
              heartbeatError: 'agents table missing `presence` column — run migration 008_presence_and_availability.sql',
              heartbeatCount: currentDiagnostics.heartbeatCount + 1,
            })
            return
          }
          publishDiagnostics({ heartbeatStatus: 'error', heartbeatError: `update failed: ${msg}` })
          return
        }
        publishDiagnostics({
          presence: 'online',
          lastHeartbeatAt: nowIso,
          lastSeenAt: nowIso,
          heartbeatStatus: 'ok',
          heartbeatError: undefined,
          heartbeatCount: currentDiagnostics.heartbeatCount + 1,
        })
      } catch (err) {
        publishDiagnostics({
          heartbeatStatus: 'error',
          heartbeatError: `update failed: ${err}`,
        })
      }
    }

    // Heartbeat immediately on mount (covers "admin opens the dashboard").
    beat()
    heartbeatTimer.current = setInterval(beat, LAST_SEEN_HEARTBEAT_MS)

    // Tab regained focus → refresh the heartbeat so we come back online fast.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') beat()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      disposed = true
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}
