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

    const beat = async () => {
      if (disposed) return
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
      if (!user || user.is_anonymous) return

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
          } else {
            return
          }
        } catch {
          return
        }
      }

      try {
        const nowIso = new Date().toISOString()
        // Write the heartbeat. If the deployed agents table predates migration
        // 008 (no `presence` column), the UPDATE fails — fall back to writing
        // just last_seen_at so the heartbeat still proves presence, and log
        // the schema issue instead of silently failing.
        const { error } = await supabase
          .from('agents')
          .update({ last_seen_at: nowIso, presence: 'online' })
          .eq('id', agentRowId)
        if (error) {
          const msg = String(error?.message ?? error)
          const missingPresence = /presence/.test(msg) && /column|does not exist/.test(msg)
          if (missingPresence) {
            console.warn('[admin-presence] agents.presence column missing — run migration 008_presence_and_availability.sql')
            await supabase
              .from('agents')
              .update({ last_seen_at: nowIso })
              .eq('id', agentRowId)
          } else {
            console.warn('[admin-presence] heartbeat update failed:', msg)
          }
        }
      } catch (err) {
        console.warn('[admin-presence] heartbeat update failed:', err)
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
