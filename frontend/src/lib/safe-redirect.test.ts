import { describe, it, expect } from 'vitest'
import { isSafeNextPath } from './safe-redirect'

describe('isSafeNextPath', () => {
  // --- Allowed paths ---
  it('accepts /admin exactly', () => {
    expect(isSafeNextPath('/admin')).toBe(true)
  })

  it('accepts /admin sub-paths', () => {
    expect(isSafeNextPath('/admin/properties')).toBe(true)
    expect(isSafeNextPath('/admin/landlords')).toBe(true)
    expect(isSafeNextPath('/admin/properties/123/edit')).toBe(true)
  })

  it('accepts /landlord exactly', () => {
    expect(isSafeNextPath('/landlord')).toBe(true)
  })

  it('accepts /landlord sub-paths', () => {
    expect(isSafeNextPath('/landlord/listings')).toBe(true)
    expect(isSafeNextPath('/landlord/listings/new')).toBe(true)
    expect(isSafeNextPath('/landlord/profile')).toBe(true)
  })

  // --- Open-redirect attack vectors ---
  it('rejects protocol-relative URLs (//evil.com)', () => {
    expect(isSafeNextPath('//evil.com')).toBe(false)
  })

  it('rejects protocol-relative URLs with path (//evil.com/steal)', () => {
    expect(isSafeNextPath('//evil.com/steal')).toBe(false)
  })

  it('rejects absolute http URLs', () => {
    expect(isSafeNextPath('http://evil.com')).toBe(false)
  })

  it('rejects absolute https URLs', () => {
    expect(isSafeNextPath('https://evil.com/phish')).toBe(false)
  })

  it('rejects paths not in the allowlist', () => {
    expect(isSafeNextPath('/evil')).toBe(false)
    expect(isSafeNextPath('/listings')).toBe(false)
    expect(isSafeNextPath('/about')).toBe(false)
  })

  it('rejects paths that merely contain an allowed prefix mid-string', () => {
    // e.g. /evil/admin should not match
    expect(isSafeNextPath('/evil/admin')).toBe(false)
  })

  // --- Null / empty / missing ---
  it('rejects null', () => {
    expect(isSafeNextPath(null)).toBe(false)
  })

  it('rejects undefined', () => {
    expect(isSafeNextPath(undefined)).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isSafeNextPath('')).toBe(false)
  })

  // --- Edge cases ---
  it('rejects a path that starts with /adminevil (no slash boundary)', () => {
    // /adminevil should NOT match the /admin prefix
    expect(isSafeNextPath('/adminevil')).toBe(false)
  })

  it('rejects a path that starts with /landlordevil', () => {
    expect(isSafeNextPath('/landlordevil')).toBe(false)
  })
})
