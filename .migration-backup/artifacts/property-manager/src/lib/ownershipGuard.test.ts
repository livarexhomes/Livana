import { describe, it, expect } from 'vitest'
import {
  isPropertyOwner,
  isLandlordOwner,
  propertyOwnershipFilter,
  isImageOwnedByProperty,
  type PropertyRow,
  type LandlordRow,
} from './ownershipGuard'

// ── isPropertyOwner ───────────────────────────────────────────────────────────

describe('isPropertyOwner', () => {
  const property: PropertyRow = {
    id: 'prop-abc',
    landlord_id: 'landlord-123',
  }

  it('returns true when landlord_id matches', () => {
    expect(isPropertyOwner(property, 'landlord-123')).toBe(true)
  })

  it('returns false when landlord_id belongs to a different landlord', () => {
    // Core IDOR scenario: attacker supplies their own landlord id against
    // a property they do not own.
    expect(isPropertyOwner(property, 'landlord-999')).toBe(false)
  })

  it('returns false for an empty landlord id', () => {
    expect(isPropertyOwner(property, '')).toBe(false)
  })

  it('is case-sensitive (UUIDs are lowercase)', () => {
    expect(isPropertyOwner(property, 'LANDLORD-123')).toBe(false)
  })
})

// ── isLandlordOwner ───────────────────────────────────────────────────────────

describe('isLandlordOwner', () => {
  const landlord: LandlordRow = {
    id: 'landlord-123',
    user_id: 'user-abc',
  }

  it('returns true when user_id matches the authenticated user', () => {
    expect(isLandlordOwner(landlord, 'user-abc')).toBe(true)
  })

  it('returns false when user_id belongs to a different user', () => {
    expect(isLandlordOwner(landlord, 'user-xyz')).toBe(false)
  })

  it('returns false for an empty user id', () => {
    expect(isLandlordOwner(landlord, '')).toBe(false)
  })
})

// ── propertyOwnershipFilter ───────────────────────────────────────────────────

describe('propertyOwnershipFilter', () => {
  it('returns the correct column name', () => {
    const filter = propertyOwnershipFilter('landlord-123')
    expect(filter.column).toBe('landlord_id')
  })

  it('returns the supplied landlord id as the filter value', () => {
    const filter = propertyOwnershipFilter('landlord-123')
    expect(filter.value).toBe('landlord-123')
  })

  it('preserves an empty string (caller must validate before use)', () => {
    const filter = propertyOwnershipFilter('')
    expect(filter.value).toBe('')
  })
})

// ── isImageOwnedByProperty ────────────────────────────────────────────────────

describe('isImageOwnedByProperty', () => {
  it('returns true when the image belongs to the expected property', () => {
    expect(isImageOwnedByProperty('prop-abc', 'prop-abc')).toBe(true)
  })

  it('returns false when the image belongs to a different property', () => {
    // IDOR scenario: attacker tries to delete an image from another property
    // by supplying a mismatched property_id.
    expect(isImageOwnedByProperty('prop-xyz', 'prop-abc')).toBe(false)
  })

  it('returns false when either id is empty', () => {
    expect(isImageOwnedByProperty('', 'prop-abc')).toBe(false)
    expect(isImageOwnedByProperty('prop-abc', '')).toBe(false)
  })
})

// ── Integration-style: combined ownership check ───────────────────────────────

describe('combined ownership check (load + submit path)', () => {
  it('allows edit when both landlord and property ownership are confirmed', () => {
    const userId = 'user-abc'
    const landlord: LandlordRow = { id: 'landlord-123', user_id: userId }
    const property: PropertyRow = { id: 'prop-abc', landlord_id: 'landlord-123' }

    expect(isLandlordOwner(landlord, userId)).toBe(true)
    expect(isPropertyOwner(property, landlord.id)).toBe(true)
  })

  it('blocks edit when the landlord row belongs to a different user', () => {
    const userId = 'user-attacker'
    const landlord: LandlordRow = { id: 'landlord-victim', user_id: 'user-victim' }
    const property: PropertyRow = { id: 'prop-abc', landlord_id: 'landlord-victim' }

    // Even though the property matches the landlord, the landlord does not
    // belong to the requesting user — the chain must fail.
    expect(isLandlordOwner(landlord, userId)).toBe(false)
    // The property check would pass if the landlord check were skipped,
    // demonstrating why both checks are required.
    expect(isPropertyOwner(property, landlord.id)).toBe(true)
  })

  it('blocks edit when the property belongs to a different landlord', () => {
    const userId = 'user-abc'
    const landlord: LandlordRow = { id: 'landlord-123', user_id: userId }
    const property: PropertyRow = { id: 'prop-abc', landlord_id: 'landlord-victim' }

    expect(isLandlordOwner(landlord, userId)).toBe(true)
    expect(isPropertyOwner(property, landlord.id)).toBe(false)
  })
})
