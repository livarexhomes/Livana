import { describe, it, expect } from 'vitest'
import {
  assignChatToAgent,
  firstAvailableAgent,
  shouldQueue,
} from './support-assignment'
import type { SupportAgentMeta } from './live-support'

const online = (agent_id: string, load = 0): SupportAgentMeta & { load?: number } => ({
  agent_id,
  role: 'agent',
  status: 'online',
  load,
})

const away = (agent_id: string): SupportAgentMeta => ({
  agent_id,
  role: 'agent',
  status: 'away',
})

describe('firstAvailableAgent', () => {
  it('returns null when nobody is online', () => {
    expect(firstAvailableAgent([])).toBeNull()
    expect(firstAvailableAgent([away('a1')])).toBeNull()
  })

  it('ignores entries without an agent_id', () => {
    const noId: SupportAgentMeta = { role: 'admin', status: 'online' }
    expect(firstAvailableAgent([noId])).toBeNull()
  })

  it('returns the least-loaded online agent', () => {
    const a = firstAvailableAgent([online('a1', 3), online('a2', 1), online('a3', 2)])
    expect(a?.agent_id).toBe('a2')
  })
})

describe('assignChatToAgent', () => {
  it('assigns to an online agent', () => {
    const r = assignChatToAgent([online('a1', 2), online('a2', 0)])
    expect(r).toEqual({ agentId: 'a2', agentStatus: 'assigned' })
  })

  it('queues when only away agents exist', () => {
    expect(assignChatToAgent([away('a1')])).toEqual({ agentId: null, agentStatus: 'queued' })
  })

  it('queues when nobody is present', () => {
    expect(assignChatToAgent([])).toEqual({ agentId: null, agentStatus: 'queued' })
  })
})

describe('shouldQueue', () => {
  it('is true when no agent is available', () => {
    expect(shouldQueue([])).toBe(true)
    expect(shouldQueue([away('a1')])).toBe(true)
  })

  it('is false when an online agent exists', () => {
    expect(shouldQueue([online('a1')])).toBe(false)
  })
})
