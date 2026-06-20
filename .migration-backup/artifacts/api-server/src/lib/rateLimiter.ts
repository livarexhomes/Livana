/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Suitable for a single-process server (Vercel serverless functions or a
 * single Node process). For multi-instance deployments, replace with a
 * Redis-backed solution (e.g. `rate-limiter-flexible`).
 */

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

export interface RateLimitOptions {
  /** Maximum requests allowed within `windowMs`. */
  max: number
  /** Window duration in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  let win = store.get(key)

  if (!win || now >= win.resetAt) {
    win = { count: 0, resetAt: now + opts.windowMs }
    store.set(key, win)
  }

  win.count += 1
  const allowed = win.count <= opts.max
  const remaining = Math.max(0, opts.max - win.count)

  return { allowed, remaining, resetAt: win.resetAt }
}

/** Exposed for tests — clears all windows. */
export function _resetStore() {
  store.clear()
}
