import { describe, it, expect } from 'vitest'

// Presence is derived server-side in SQL (`public.compute_presence`). This
// mirrors the SQL contract so the thresholds stay covered by a fast test.
function computePresence(lastSeenAt: string | null, now: number): 'online' | 'away' | 'offline' {
  if (!lastSeenAt) return 'offline'
  const ms = new Date(lastSeenAt).getTime()
  if (!Number.isFinite(ms)) return 'offline'
  if (now - ms < 90 * 1000) return 'online'
  if (now - ms < 15 * 60 * 1000) return 'away'
  return 'offline'
}

describe('computePresence (mirrors public.compute_presence)', () => {
  it('marks a fresh heartbeat as online', () => {
    const now = new Date('2026-08-06T12:00:00.000Z').getTime()
    expect(computePresence('2026-08-06T11:59:30.000Z', now)).toBe('online')
  })

  it('marks a stale heartbeat as away within 15 minutes', () => {
    const now = new Date('2026-08-06T12:00:00.000Z').getTime()
    // 10 minutes stale: > 90 s (online threshold) but < 15 min (away threshold)
    expect(computePresence('2026-08-06T11:50:00.000Z', now)).toBe('away')
  })

  it('marks an old heartbeat as offline', () => {
    const now = new Date('2026-08-06T12:00:00.000Z').getTime()
    expect(computePresence('2026-08-06T10:00:00.000Z', now)).toBe('offline')
  })

  it('is offline when never seen', () => {
    expect(computePresence(null, Date.now())).toBe('offline')
  })
})
