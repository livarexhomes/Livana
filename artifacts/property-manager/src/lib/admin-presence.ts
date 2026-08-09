// Admin presence heartbeat — client side.
//
// Presence ("is the admin actually connected?") lives on the `agents` roster
// and is derived SERVER-SIDE from the `last_seen_at` heartbeat timestamps
// (`public.compute_presence` / `public.sweep_presence`). This module is the
// client half: while an admin has any admin page open, it writes a throttled
// `last_seen_at` heartbeat on its own `agents` row and refreshes it when the
// page regains focus. It NEVER declares an online/offline status — the client
// cannot fake being online.
//
// Who reads the truth:
//   - Admin Support page (header status, agent list) via the roster realtime
//     feed + `fetchSupportPresence()`.
//   - Customer chatbot via `subscribeSupportPresence` — counts agents where
//     presence = 'online' AND availability = true.
//
// Availability ("is this agent accepting new conversations?") is the separate
// `agents.available` toggle, also stored on the roster and read by the same
// feed.

import { useEffect, useRef } from 'react'
import { createClient } from './supabase'

/** How often the durable last_seen_at heartbeat fires (~60s). */
export const LAST_SEEN_HEARTBEAT_MS = 60 * 1000

/**
 * Mount once per admin page (AdminSidebar does this for all admin pages).
 * Resolves the current user's agents row and starts the heartbeat loop.
 * The server-side sweep turns a stale heartbeat into away/offline, so on
 * disconnect the agent automatically drops offline; when they reconnect
 * (or the tab regains focus) the next heartbeat immediately marks them
 * online again.
 */
export function useAdminPresence(): void {
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let disposed = false

    const beat = async () => {
      if (disposed) return
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
      if (!user || user.is_anonymous) return

      try {
        const { data: roster } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (!roster?.id) return
        await supabase
          .from('agents')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', roster.id)
      } catch {
        /* best-effort heartbeat */
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
