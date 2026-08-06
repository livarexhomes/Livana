import { describe, it, expect } from 'vitest'
import { getPresenceIndicatorState } from './admin-presence'

describe('getPresenceIndicatorState', () => {
  it('returns an online state for fresh heartbeats', () => {
    const now = new Date('2026-08-06T12:00:00.000Z').getTime()
    const state = getPresenceIndicatorState('2026-08-06T11:59:30.000Z', now)

    expect(state.isOnline).toBe(true)
    expect(state.label).toBe('Online')
    expect(state.subLabel).toBe('You’re available')
  })

  it('returns an offline state with relative last-seen text for stale heartbeats', () => {
    const now = new Date('2026-08-06T12:00:00.000Z').getTime()
    const state = getPresenceIndicatorState('2026-08-06T11:45:00.000Z', now)

    expect(state.isOnline).toBe(false)
    expect(state.label).toBe('Offline')
    expect(state.subLabel).toContain('last seen')
  })
})
