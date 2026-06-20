import type { VercelRequest, VercelResponse } from '@vercel/node'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

function cleanup() {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}

// Run cleanup every 60 seconds
setInterval(cleanup, 60_000).unref()

export function rateLimit(
  req: VercelRequest,
  res: VercelResponse,
  options: {
    windowMs: number
    maxRequests: number
    keyPrefix?: string
  }
): boolean {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown'
  const key = `${options.keyPrefix ?? 'rl'}:${ip}`

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    })
    return true
  }

  if (entry.count >= options.maxRequests) {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    })
    return false
  }

  entry.count += 1
  return true
}
