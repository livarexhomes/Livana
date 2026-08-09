// Multi-agent chat assignment logic (pure functions + thin Supabase helpers).
//
// A chat_inquiries row starts 'unassigned'. When a visitor connects while an
// agent is online, the widget assigns the least-loaded online agent. When no
// agent is available, the inquiry is 'queued' and an admin can later assign it
// from the inbox ("Assign to me" / reassign).

import { createClient } from './supabase'
import type { SupportAgent } from './live-support'

export type AgentAssignmentStatus = 'unassigned' | 'queued' | 'assigned'

export interface AssignableAgent {
  agent_id: string
  name?: string
  role?: string
  status: 'online' | 'away'
  /** Number of conversations currently assigned to this agent. */
  load?: number
}

export interface AssignmentResult {
  agentId: string | null
  agentStatus: AgentAssignmentStatus
}

/** Agents that can take a conversation right now: online, not away. */
export function firstAvailableAgent(onlineAgents: SupportAgent[] | AssignableAgent[]): AssignableAgent | null {
  const candidates = (onlineAgents ?? [])
    .map((a) => a as unknown as Record<string, unknown>)
    .filter((a) => {
      const status = a.status ?? a.presence
      const agentId = a.agent_id ?? a.id
      return status === 'online' && typeof agentId === 'string' && agentId.length > 0
    })
    .map((a) => ({
      agent_id: String(a.agent_id ?? a.id ?? ''),
      name: typeof a.name === 'string' ? a.name : undefined,
      role: typeof a.role === 'string' ? a.role : undefined,
      status: (a.status ?? a.presence) as 'online' | 'away',
      load: typeof a.load === 'number' ? a.load : undefined,
    }))
  if (candidates.length === 0) return null
  // Least-loaded assignment: fewest currently-assigned conversations wins.
  candidates.sort((a, b) => (a.load ?? 0) - (b.load ?? 0))
  return candidates[0]
}

/**
 * Decide the initial assignment for a new inquiry.
 * Returns `{ agentId, agentStatus }`:
 *  - an online agent id + 'assigned' when one is available,
 *  - `null` + 'queued' when nobody is available right now.
 */
export function assignChatToAgent(
  onlineAgents: SupportAgent[] | AssignableAgent[],
): AssignmentResult {
  const pick = firstAvailableAgent(onlineAgents)
  if (!pick) return { agentId: null, agentStatus: 'queued' }
  return { agentId: pick.agent_id, agentStatus: 'assigned' }
}

/** True when a new inquiry should be held in the queue (no agent available). */
export function shouldQueue(onlineAgents: SupportAgent[] | AssignableAgent[]): boolean {
  return firstAvailableAgent(onlineAgents) === null
}

// ── Supabase helpers ───────────────────────────────────────────────────────────

/** Assign an inquiry to a specific agent (claim / transfer). */
export async function claimInquiry(inquiryId: string, agentId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('chat_inquiries')
    .update({ agent_id: agentId, agent_status: 'assigned' })
    .eq('id', inquiryId)
  return !error
}

/** Clear an inquiry's assignment (back to the queue). */
export async function unassignInquiry(inquiryId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('chat_inquiries')
    .update({ agent_id: null, agent_status: 'queued' })
    .eq('id', inquiryId)
  return !error
}
