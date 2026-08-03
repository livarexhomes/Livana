// Live-support availability: the website widget checks whether a support
// agent (currently the admin) is online via the shared Realtime presence
// channel that the Admin Dashboard joins while an admin is logged in.
//
// Presence entries are keyed by connection and carry per-agent metadata:
//   { role: 'admin', status: 'online' | 'away', online_at, agent_id, name, email }
// This makes the state naturally multi-agent — any member with role
// admin/agent/support counts toward availability, and the aggregate status is
// "online" when at least one member is online, "away" when members exist but
// all are away, and "offline" when no members are present.

import { createClient } from './supabase'

export type SupportStatus = 'online' | 'away' | 'offline'
export type AgentRole = 'admin' | 'agent' | 'support'

/** Per-agent metadata carried on a presence entry. */
export interface SupportAgentMeta {
  agent_id?: string
  user_id?: string
  name?: string
  email?: string
  role: AgentRole
  status: 'online' | 'away'
}

export interface SupportPresenceState {
  status: SupportStatus
  /** Convenience boolean: true when at least one agent is online. */
  online: boolean
  /** Number of online agents (admin counts as 1). */
  agentCount: number
}

/** Richer aggregate with the per-agent breakdown (used by the widget + inbox). */
export interface LiveSupportState {
  status: SupportStatus
  online: boolean
  onlineAgents: SupportAgentMeta[]
  awayAgents: SupportAgentMeta[]
  agentCount: number
}

const AGENT_ROLES: readonly AgentRole[] = ['admin', 'agent', 'support']

function isAgentEntry(meta: Record<string, unknown>): boolean {
  return AGENT_ROLES.includes(meta.role as AgentRole)
}

function toAgentMeta(meta: Record<string, unknown>): SupportAgentMeta {
  return {
    agent_id: typeof meta.agent_id === 'string' ? meta.agent_id : undefined,
    user_id: typeof meta.user_id === 'string' ? meta.user_id : undefined,
    name: typeof meta.name === 'string' ? meta.name : undefined,
    email: typeof meta.email === 'string' ? meta.email : undefined,
    role: (AGENT_ROLES.includes(meta.role as AgentRole) ? meta.role : 'admin') as AgentRole,
    status: meta.status === 'away' ? 'away' : 'online',
  }
}

export function isSupportOnline(presence: Record<string, unknown> | undefined): boolean {
  if (!presence) return false
  // Presence map: connectionId -> tracked metadata
  return Object.values(presence).some((meta) => {
    const m = (meta ?? {}) as Record<string, unknown>
    return isAgentEntry(m)
  })
}

/** Aggregate raw presence state into a 3-state summary. */
export function presenceToState(presence: Record<string, unknown> | undefined): SupportPresenceState {
  const members = Object.values(presence ?? {}) as Record<string, unknown>[]
  const agents = members.filter(isAgentEntry)
  if (agents.length === 0) {
    return { status: 'offline', online: false, agentCount: 0 }
  }
  const anyOnline = agents.some((m) => m.status !== 'away')
  return {
    status: anyOnline ? 'online' : 'away',
    online: anyOnline,
    agentCount: agents.length,
  }
}

/** Aggregate raw presence into the richer state with per-agent breakdown. */
export function presenceToLiveState(presence: Record<string, unknown> | undefined): LiveSupportState {
  const members = Object.values(presence ?? {}) as Record<string, unknown>[]
  const agentMetas = members.filter(isAgentEntry).map(toAgentMeta)
  const onlineAgents = agentMetas.filter((m) => m.status === 'online')
  const awayAgents = agentMetas.filter((m) => m.status === 'away')
  if (agentMetas.length === 0) {
    return { status: 'offline', online: false, onlineAgents: [], awayAgents: [], agentCount: 0 }
  }
  return {
    status: onlineAgents.length > 0 ? 'online' : 'away',
    online: onlineAgents.length > 0,
    onlineAgents,
    awayAgents,
    agentCount: agentMetas.length,
  }
}

/**
 * Subscribe to the admin-presence channel and call `onChange` with the full
 * 3-state summary whenever the online status changes. Returns an unsubscribe
 * function.
 */
export function subscribeSupportPresence(onChange: (state: SupportPresenceState) => void): () => void {
  let unsubscribed = false
  const supabase = createClient()
  const channel = supabase.channel('livarex-admin-presence')

  const emit = () => {
    if (unsubscribed) return
    onChange(presenceToState(channel.presenceState() as Record<string, unknown> | undefined))
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

/**
 * Subscribe to the presence channel with the richer per-agent state. Returns
 * an unsubscribe function.
 */
export function subscribeLiveSupportPresence(onChange: (state: LiveSupportState) => void): () => void {
  let unsubscribed = false
  const supabase = createClient()
  const channel = supabase.channel('livarex-admin-presence')

  const emit = () => {
    if (unsubscribed) return
    onChange(presenceToLiveState(channel.presenceState() as Record<string, unknown> | undefined))
  }

  channel
    .on('presence', { event: 'sync' }, emit)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') emit()
    })

  return () => {
    unsubscribed = true
    supabase.removeChannel(channel)
  }
}
