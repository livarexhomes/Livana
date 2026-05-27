import { describe, it, expect } from 'vitest'
import { validateConfirmationInput } from './validateConfirmationInput'

const ORIGIN = 'https://app.livana.ng'

// ── helpers ───────────────────────────────────────────────────────────────────

function valid(overrides: Record<string, unknown> = {}) {
  return { email: 'user@example.com', fullName: 'Ada Okafor', ...overrides }
}

// ── happy path ────────────────────────────────────────────────────────────────

describe('valid input', () => {
  it('accepts a well-formed body', () => {
    const result = validateConfirmationInput(valid(), ORIGIN)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.email).toBe('user@example.com')
    expect(result.fullName).toBe('Ada Okafor')
    expect(result.redirectTo).toBeUndefined()
  })

  it('normalises email to lowercase and trims whitespace', () => {
    const result = validateConfirmationInput(valid({ email: '  USER@Example.COM  ' }), ORIGIN)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.email).toBe('user@example.com')
  })

  it('trims fullName whitespace', () => {
    const result = validateConfirmationInput(valid({ fullName: '  Ada Okafor  ' }), ORIGIN)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fullName).toBe('Ada Okafor')
  })

  it('accepts a same-origin redirectTo path', () => {
    const result = validateConfirmationInput(
      valid({ redirectTo: '/auth/callback?ref=email' }),
      ORIGIN,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.redirectTo).toBe('/auth/callback?ref=email')
  })

  it('accepts a full same-origin URL in redirectTo', () => {
    const result = validateConfirmationInput(
      valid({ redirectTo: `${ORIGIN}/auth/callback` }),
      ORIGIN,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.redirectTo).toBe('/auth/callback')
  })

  it('ignores redirectTo when APP_URL is not configured', () => {
    const result = validateConfirmationInput(
      valid({ redirectTo: '/auth/callback' }),
      undefined,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.redirectTo).toBeUndefined()
  })

  it('treats absent redirectTo as undefined', () => {
    const result = validateConfirmationInput(valid(), ORIGIN)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.redirectTo).toBeUndefined()
  })
})

// ── email validation ──────────────────────────────────────────────────────────

describe('email validation', () => {
  it('rejects a missing email', () => {
    const result = validateConfirmationInput({ fullName: 'Ada' }, ORIGIN)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some(e => e.field === 'email')).toBe(true)
  })

  it('rejects an empty email string', () => {
    const result = validateConfirmationInput(valid({ email: '' }), ORIGIN)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some(e => e.field === 'email')).toBe(true)
  })

  it('rejects a non-string email', () => {
    const result = validateConfirmationInput(valid({ email: 42 }), ORIGIN)
    expect(result.ok).toBe(false)
  })

  it('rejects an email without @', () => {
    const result = validateConfirmationInput(valid({ email: 'notanemail' }), ORIGIN)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some(e => e.field === 'email')).toBe(true)
  })

  it('rejects an email exceeding 254 characters', () => {
    // local-part@domain — total length 255, one over the RFC 5321 limit
    const long = 'a'.repeat(249) + '@b.com' // 255 chars
    expect(long.length).toBe(255)
    const result = validateConfirmationInput(valid({ email: long }), ORIGIN)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some(e => e.field === 'email')).toBe(true)
  })
})

// ── fullName validation ───────────────────────────────────────────────────────

describe('fullName validation', () => {
  it('rejects a missing fullName', () => {
    const result = validateConfirmationInput({ email: 'a@b.com' }, ORIGIN)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some(e => e.field === 'fullName')).toBe(true)
  })

  it('rejects an empty fullName string', () => {
    const result = validateConfirmationInput(valid({ fullName: '   ' }), ORIGIN)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some(e => e.field === 'fullName')).toBe(true)
  })

  it('rejects a fullName exceeding 200 characters', () => {
    const result = validateConfirmationInput(valid({ fullName: 'A'.repeat(201) }), ORIGIN)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some(e => e.field === 'fullName')).toBe(true)
  })
})

// ── redirectTo validation (open-redirect prevention) ─────────────────────────

describe('redirectTo validation', () => {
  it('rejects a cross-origin redirectTo', () => {
    const result = validateConfirmationInput(
      valid({ redirectTo: 'https://evil.com/steal' }),
      ORIGIN,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some(e => e.field === 'redirectTo')).toBe(true)
  })

  it('rejects a protocol-relative URL', () => {
    const result = validateConfirmationInput(
      valid({ redirectTo: '//evil.com/steal' }),
      ORIGIN,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some(e => e.field === 'redirectTo')).toBe(true)
  })

  it('rejects a non-string redirectTo', () => {
    const result = validateConfirmationInput(valid({ redirectTo: 123 }), ORIGIN)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some(e => e.field === 'redirectTo')).toBe(true)
  })

  it('accepts null redirectTo (treated as absent)', () => {
    const result = validateConfirmationInput(valid({ redirectTo: null }), ORIGIN)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.redirectTo).toBeUndefined()
  })
})

// ── body shape ────────────────────────────────────────────────────────────────

describe('body shape', () => {
  it('rejects a non-object body', () => {
    const result = validateConfirmationInput('not an object', ORIGIN)
    expect(result.ok).toBe(false)
  })

  it('rejects null body', () => {
    const result = validateConfirmationInput(null, ORIGIN)
    expect(result.ok).toBe(false)
  })

  it('collects multiple field errors in one response', () => {
    const result = validateConfirmationInput({}, ORIGIN)
    expect(result.ok).toBe(false)
    if (result.ok) return
    const fields = result.errors.map(e => e.field)
    expect(fields).toContain('email')
    expect(fields).toContain('fullName')
  })
})
