// Admin presence: while an admin is logged into any admin page, this module
// joins the shared `livarex-admin-presence` Realtime channel and tracks the
// admin's availability as 'online' or 'away' based on client activity.
//
// Rules (per the redesign):
//   - Admin logged into the dashboard           → 'online'
//   - No mousemove/keydown/click/touchstart for 10 min → 'away'
//   - Activity resumes                            → back to 'online'
//   - Logout / disconnect                         → presence entry drops (offline)
//
// The Support page status pill reads this via the module store, so the status
// stays consistent even though presence is mounted in the AdminSidebar.

import { useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from './supabase'
import type { AgentRole, SupportStatus } from './live-support'

const AWAY_AFTER_MS = 12 * 60 * 1000 // 12 minutes idle → away (tunable, 10–15 min range)
const ACTIVITY_THROTTLE_MS = 1000
// How often the durable last_seen_at heartbeat fires (and how often the
// offline fallback in the UI treats a stale timestamp as "offline").
export const LAST_SEEN_HEARTBEAT_MS = 60 * 1000

/** The agent identity + status carried on this client's presence entry. */
export type PresenceMeta = {
  role: AgentRole
  status: SupportStatus
  online_at?: string
  agent_id?: string
  user_id?: string
  name?: string
  email?: string
}

// ── Module-level status store (mirrors settings-store.ts) ────────────────────

let myStatus: SupportStatus = 'offline'
const listeners = new Set<(status: SupportStatus) => void>()

export function getMySupportStatus(): SupportStatus {
  return myStatus
}

export function subscribeMySupportStatus(listener: (status: SupportStatus) => void): () => void {
  listeners.add(listener)
  listener(myStatus)
  return () => listeners.delete(listener)
}

function setMySupportStatus(status: SupportStatus) {
  if (status === myStatus) return
  myStatus = status
  listeners.forEach((l) => {
    try {
      l(status)
    } catch (err) {
      console.error('[admin-presence] listener error:', err)
    }
  })
}

// ── Presence hook ─────────────────────────────────────────────────────────────

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart'] as const

/**
 * Join the admin presence channel and track online/away from client activity.
 * Mount once per admin page (AdminSidebar does this for all admin pages).
 *
 * `agent` (optional) is the current agent's roster identity — when present,
 * it's included in the presence track so the visitor widget can name the
 * online agent and the inbox can show who is available.
 */
export type PresenceIndicatorState = {
  isOnline: boolean
  label: 'Online' | 'Offline'
  subLabel: string
}

export function getPresenceIndicatorState(lastSeenAt: string | null | undefined, now = Date.now()): PresenceIndicatorState {
  if (!lastSeenAt) {
    return {
      isOnline: false,
      label: 'Offline',
      subLabel: 'Never seen online',
    }
  }

  const lastSeenMs = new Date(lastSeenAt).getTime()
  const isOnline = Number.isFinite(lastSeenMs) && now - lastSeenMs < 90 * 1000

  if (isOnline) {
    return {
      isOnline: true,
      label: 'Online',
      subLabel: 'You’re available',
    }
  }

  return {
    isOnline: false,
    label: 'Offline',
    subLabel: `Last seen ${formatDistanceToNow(lastSeenMs, { addSuffix: true })}`,
  }
}

export function useAdminPresence(agent?: { id: string; name: string; email: string; role: AgentRole }) {
  const statusRef = useRef<SupportStatus>('offline')
  const awayTimer = useRef<number | null>(null)
  const lastActivity = useRef(0)
  const heartbeatTimer = useRef<number | null>(null)
  // Resolved roster identity (looked up from the current user when `agent`
  // isn't passed) so presence entries always carry agent_id/name/email.
  const identityRef = useRef(agent)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('livarex-admin-presence')

    // If the caller didn't supply a roster identity, resolve it from the
    // signed-in user's agents row so the widget can name the online agent.
    const resolveIdentity = () => {
      if (identityRef.current) return Promise.resolve(identityRef.current)
      return supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user || user.is_anonymous) return undefined
        const { data } = await supabase
          .from('agents')
          .select('id, name, email, role')
          .eq('user_id', user.id)
          .maybeSingle()
        if (data) identityRef.current = data as { id: string; name: string; email: string; role: AgentRole }
        return identityRef.current
      }).catch(() => undefined)
    }

    const track = (status: SupportStatus) => {
      statusRef.current = status
      setMySupportStatus(status)
      const id = identityRef.current
      channel
        .track({
          role: id?.role ?? agent?.role ?? 'admin',
          status,
          online_at: new Date().toISOString(),
          agent_id: id?.id ?? agent?.id,
          name: id?.name ?? agent?.name,
          email: id?.email ?? agent?.email,
        })
        .catch((err) => console.warn('[admin-presence] track failed:', err))
    }

    // Durable last-seen: update the agents roster row so "Offline · last seen
    // X ago" survives the presence channel (which drops on disconnect).
    const beatLastSeen = () => {
      if (!identityRef.current?.id) return
      supabase
        .from('agents')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', identityRef.current.id)
        .then(({ error }) => {
          if (error) console.warn('[admin-presence] last_seen heartbeat failed:', error?.message)
        })
    }

    const goAway = () => {
      if (statusRef.current !== 'away') track('away')
    }

    const onActivity = () => {
      const now = Date.now()
      if (now - lastActivity.current < ACTIVITY_THROTTLE_MS) return
      lastActivity.current = now

      // Reschedule the away timer on any activity.
      if (awayTimer.current) window.clearTimeout(awayTimer.current)
      awayTimer.current = window.setTimeout(goAway, AWAY_AFTER_MS)

      // If we were away, activity brings us straight back online.
      if (statusRef.current === 'away') track('online')
    }

    // Log the subscribe lifecycle so we can diagnose why the presence channel
    // isn't completing in deployments.
    channel.subscribe(async (status, err) => {
      console.log('[admin-presence] channel subscribe status:', status)
      if (status === 'SUBSCRIBED') {
        await resolveIdentity()
        track('online')
        beatLastSeen()
        lastActivity.current = Date.now()
        awayTimer.current = window.setTimeout(goAway, AWAY_AFTER_MS)
        heartbeatTimer.current = window.setInterval(beatLastSeen, LAST_SEEN_HEARTBEAT_MS)
        ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
      } else {
        console.warn('[admin-presence] presence channel failed to subscribe:', status, err)
      }
    })

    return () => {
      if (heartbeatTimer.current) window.clearInterval(heartbeatTimer.current)
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
      setMySupportStatus('offline')
      channel.untrack().catch(() => {})
      supabase.removeChannel(channel)
    }
  }, [])
}
