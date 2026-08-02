// Live-support availability: the website widget checks whether a support
// agent (currently the admin) is online via the shared Realtime presence
// channel that the Admin Dashboard joins while the admin is logged in.
//
// Future-proof: the presence state supports multiple agents — presence entries
// are keyed by connection, so as long as each agent tracks `{ role: 'admin' }`
// (or their own role), any online member makes live support available.

import { createClient } from './supabase'

export interface SupportPresenceState {
  online: boolean
  /** Number of online agents (admin counts as 1). */
  agentCount: number
}

export function isSupportOnline(presence: Record<string, unknown> | undefined): boolean {
  if (!presence) return false
  // Presence map: connectionId -> tracked metadata
  return Object.values(presence).some((meta) => {
    const m = (meta ?? {}) as Record<string, unknown>
    return m.role === 'admin' || m.role === 'agent' || m.role === 'support'
  })
}

/**
 * Subscribe to the admin-presence channel and call `onChange` whenever the
 * online status changes. Returns an unsubscribe function.
 */
export function subscribeSupportPresence(onChange: (state: SupportPresenceState) => void): () => void {
  let unsubscribed = false
  const supabase = createClient()
  const channel = supabase.channel('livarex-admin-presence')

  const emit = () => {
    if (unsubscribed) return
    const state = channel.presenceState()
    onChange({
      online: isSupportOnline(state as Record<string, unknown> | undefined),
      agentCount: Object.keys(state ?? {}).length,
    })
  }

  channel
    .on('presence', { event: 'sync' }, emit)
    .subscribe((status) => {
      // Once subscribed, the sync event fires with the current state.
      if (status === 'SUBSCRIBED') emit()
    })

  return () => {
    unsubscribed = true
    supabase.removeChannel(channel)
  }
}
