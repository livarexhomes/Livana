import { describe, it, expect } from 'vitest'
import { isAdminUser, requireAdmin } from './require-admin'
import type { User, SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(appMetadata: Record<string, unknown>): User {
  return { id: 'user-1', app_metadata: appMetadata } as unknown as User
}

function makeSupabase(user: User | null): Pick<SupabaseClient, 'auth'> {
  return {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    } as unknown as SupabaseClient['auth'],
  }
}

// ---------------------------------------------------------------------------
// isAdminUser
// ---------------------------------------------------------------------------

describe('isAdminUser', () => {
  it('returns false for null', () => {
    expect(isAdminUser(null)).toBe(false)
  })

  it('returns false when app_metadata is empty', () => {
    expect(isAdminUser(makeUser({}))).toBe(false)
  })

  it('returns false for a regular authenticated user', () => {
    expect(isAdminUser(makeUser({ role: 'authenticated' }))).toBe(false)
  })

  it('returns true when app_metadata.role === "admin"', () => {
    expect(isAdminUser(makeUser({ role: 'admin' }))).toBe(true)
  })

  it('returns true when app_metadata.roles array includes "admin"', () => {
    expect(isAdminUser(makeUser({ roles: ['editor', 'admin'] }))).toBe(true)
  })

  it('returns false when roles array does not include "admin"', () => {
    expect(isAdminUser(makeUser({ roles: ['editor', 'viewer'] }))).toBe(false)
  })

  it('returns false when roles is not an array', () => {
    expect(isAdminUser(makeUser({ roles: 'admin' }))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// requireAdmin
// ---------------------------------------------------------------------------

describe('requireAdmin', () => {
  it('returns error when no user is authenticated', async () => {
    const supabase = makeSupabase(null)
    const result = await requireAdmin(supabase as unknown as SupabaseClient)
    expect(result.error).toBe('Not authenticated')
    expect(result.user).toBeUndefined()
  })

  it('returns error when user is authenticated but not an admin', async () => {
    const user = makeUser({ role: 'authenticated' })
    const supabase = makeSupabase(user)
    const result = await requireAdmin(supabase as unknown as SupabaseClient)
    expect(result.error).toBe('Forbidden: admin access required')
    expect(result.user).toBeUndefined()
  })

  it('returns the user when app_metadata.role is "admin"', async () => {
    const user = makeUser({ role: 'admin' })
    const supabase = makeSupabase(user)
    const result = await requireAdmin(supabase as unknown as SupabaseClient)
    expect(result.error).toBeUndefined()
    expect(result.user).toBe(user)
  })

  it('returns the user when app_metadata.roles includes "admin"', async () => {
    const user = makeUser({ roles: ['admin'] })
    const supabase = makeSupabase(user)
    const result = await requireAdmin(supabase as unknown as SupabaseClient)
    expect(result.error).toBeUndefined()
    expect(result.user).toBe(user)
  })
})
