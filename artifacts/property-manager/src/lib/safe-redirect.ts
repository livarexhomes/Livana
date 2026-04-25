/**
 * Allowed top-level path prefixes for post-auth redirects.
 * Keeping this list explicit prevents open-redirect attacks where an attacker
 * supplies a `next` value like `//evil.com` or `/evil` to hijack sessions.
 */
const ALLOWED_NEXT_PREFIXES = ['/admin', '/landlord', '/user'] as const

/**
 * Returns true only when `next` is a relative path that starts with one of
 * the allowed prefixes. Rejects null, external URLs, and protocol-relative
 * paths (e.g. `//evil.com`).
 */
export function isSafeNextPath(next: string | null | undefined): next is string {
  if (!next) return false
  // Must be a relative path — reject anything that isn't /something
  if (!next.startsWith('/') || next.startsWith('//')) return false
  return ALLOWED_NEXT_PREFIXES.some(
    (prefix) => next === prefix || next.startsWith(prefix + '/')
  )
}
