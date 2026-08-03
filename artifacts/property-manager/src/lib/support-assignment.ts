// Multi-agent chat assignment logic (pure functions + thin Supabase helpers).
//
// A chat_inquiries row starts 'unassigned'. When a visitor connects while an
// agent is online, the widget assigns the least-loaded online agent. When no
// agent is available, the inquiry is 'queued' and an admin can later assign it
// from the inbox ("Assign to me" / reassign).

import { createClient } from './supabase'
import type { SupportAgentMeta } from './live-support'

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
export function firstAvailableAgent(onlineAgents: SupportAgentMeta[] | AssignableAgent[]): AssignableAgent | null {
  const candidates = (onlineAgents ?? []).filter(
    (a) => a.status === 'online' && typeof a.agent_id === 'string' && a.agent_id.length > 0,
  ) as AssignableAgent[]
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
  onlineAgents: SupportAgentMeta[] | AssignableAgent[],
): AssignmentResult {
  const pick = firstAvailableAgent(onlineAgents)
  if (!pick) return { agentId: null, agentStatus: 'queued' }
  return { agentId: pick.agent_id, agentStatus: 'assigned' }
}

/** True when a new inquiry should be held in the queue (no agent available). */
export function shouldQueue(onlineAgents: SupportAgentMeta[] | AssignableAgent[]): boolean {
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
