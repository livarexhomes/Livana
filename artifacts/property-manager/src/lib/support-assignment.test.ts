import { describe, it, expect } from 'vitest'
import {
  assignChatToAgent,
  firstAvailableAgent,
  shouldQueue,
} from './support-assignment'
import type { SupportAgent } from './live-support'

const online = (id: string, load = 0): SupportAgent & { load?: number } => ({
  id,
  user_id: id,
  name: 'Agent',
  email: 'agent@livarex.com',
  role: 'agent',
  active: true,
  presence: 'online',
  available: true,
  load,
})

const away = (id: string): SupportAgent => ({
  id,
  user_id: id,
  name: 'Agent',
  email: 'agent@livarex.com',
  role: 'agent',
  active: true,
  presence: 'away',
  available: true,
})

describe('firstAvailableAgent', () => {
  it('returns null when nobody is online', () => {
    expect(firstAvailableAgent([])).toBeNull()
    expect(firstAvailableAgent([away('a1')])).toBeNull()
  })

  it('ignores entries without an agent id', () => {
    const noId: SupportAgent = { ...away('x'), id: '', presence: 'online' }
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
