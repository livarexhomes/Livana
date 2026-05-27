import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, _resetStore } from './rateLimiter'

const OPTS = { max: 3, windowMs: 60_000 }

beforeEach(() => _resetStore())

describe('checkRateLimit', () => {
  it('allows requests up to the limit', () => {
    expect(checkRateLimit('ip-a', OPTS).allowed).toBe(true)
    expect(checkRateLimit('ip-a', OPTS).allowed).toBe(true)
    expect(checkRateLimit('ip-a', OPTS).allowed).toBe(true)
  })

  it('blocks the request that exceeds the limit', () => {
    checkRateLimit('ip-b', OPTS)
    checkRateLimit('ip-b', OPTS)
    checkRateLimit('ip-b', OPTS)
    const result = checkRateLimit('ip-b', OPTS)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('tracks remaining count correctly', () => {
    const r1 = checkRateLimit('ip-c', OPTS)
    expect(r1.remaining).toBe(2)
    const r2 = checkRateLimit('ip-c', OPTS)
    expect(r2.remaining).toBe(1)
    const r3 = checkRateLimit('ip-c', OPTS)
    expect(r3.remaining).toBe(0)
  })

  it('isolates counters per key', () => {
    checkRateLimit('ip-d', OPTS)
    checkRateLimit('ip-d', OPTS)
    checkRateLimit('ip-d', OPTS)
    // Different key should still be allowed
    expect(checkRateLimit('ip-e', OPTS).allowed).toBe(true)
  })

  it('resets the window after windowMs elapses', async () => {
    const shortOpts = { max: 1, windowMs: 50 }
    checkRateLimit('ip-f', shortOpts)
    expect(checkRateLimit('ip-f', shortOpts).allowed).toBe(false)
    await new Promise(r => setTimeout(r, 60))
    expect(checkRateLimit('ip-f', shortOpts).allowed).toBe(true)
  })

  it('returns a resetAt timestamp in the future', () => {
    const before = Date.now()
    const result = checkRateLimit('ip-g', OPTS)
    expect(result.resetAt).toBeGreaterThan(before)
    expect(result.resetAt).toBeLessThanOrEqual(before + OPTS.windowMs + 5)
  })
})
