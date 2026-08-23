// Launch date: defaults to Wednesday, August 26, 2026 (midnight UTC).
// Override at build time with VITE_LAUNCH_DATE=ISO-8601 env var.
export const LAUNCH_TIMESTAMP: number = new Date(
  import.meta.env.VITE_LAUNCH_DATE || '2026-08-26T00:00:00Z'
).getTime()

/** Synchronous check — safe to call during SSR / prerender. */
export function isLaunchLive(): boolean {
  return Date.now() >= LAUNCH_TIMESTAMP
}

export interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
}

/** Compute the living countdown to zero (or all-zeros once the launch date has passed). */
export function getTimeRemaining(now = Date.now()): TimeRemaining {
  const diff = Math.max(0, LAUNCH_TIMESTAMP - now)
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds }
}
