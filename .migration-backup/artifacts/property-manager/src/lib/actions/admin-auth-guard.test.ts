/**
 * Verifies that every admin server action rejects unauthenticated and
 * non-admin callers before touching the database.
 *
 * Strategy: mock `@/lib/supabase/server` so createClient returns a fake
 * Supabase client whose `from()` spy lets us assert it was never called.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { User, SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Shared mock factory
// ---------------------------------------------------------------------------

function makeClient(user: User | null) {
  const fromSpy = vi.fn(() => {
    throw new Error('DB should not be reached when auth fails')
  })
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: null })),
    },
    from: fromSpy,
    storage: { from: vi.fn() },
  } as unknown as SupabaseClient
}

// We need to mock the server module before importing the actions.
// vitest hoists vi.mock() calls, so this is safe.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Also mock next/cache so revalidatePath doesn't blow up outside Next.js
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import {
  createProperty,
  updateProperty,
  deleteProperty,
  updatePropertyStatus,
} from './properties'
import {
  approveLandlord,
  rejectLandlord,
  toggleVerifiedBadge,
} from './landlords'

const mockCreateClient = vi.mocked(createClient)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(appMetadata: Record<string, unknown>): User {
  return { id: 'u1', app_metadata: appMetadata } as unknown as User
}

function emptyFormData(): FormData {
  return new FormData()
}

// ---------------------------------------------------------------------------
// properties.ts — unauthenticated
// ---------------------------------------------------------------------------

describe('admin property actions — unauthenticated caller', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(makeClient(null))
  })

  it('createProperty returns Not authenticated', async () => {
    const result = await createProperty({}, emptyFormData())
    expect(result.error).toBe('Not authenticated')
  })

  it('updateProperty returns Not authenticated', async () => {
    const result = await updateProperty('id-1', {}, emptyFormData())
    expect(result.error).toBe('Not authenticated')
  })

  it('deleteProperty returns Not authenticated', async () => {
    const result = await deleteProperty('id-1')
    expect(result.error).toBe('Not authenticated')
  })

  it('updatePropertyStatus returns Not authenticated', async () => {
    const result = await updatePropertyStatus('id-1', 'available')
    expect(result.error).toBe('Not authenticated')
  })
})

// ---------------------------------------------------------------------------
// properties.ts — authenticated but not admin
// ---------------------------------------------------------------------------

describe('admin property actions — non-admin caller', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(makeClient(makeUser({ role: 'authenticated' })))
  })

  it('createProperty returns Forbidden', async () => {
    const result = await createProperty({}, emptyFormData())
    expect(result.error).toMatch(/Forbidden/)
  })

  it('updateProperty returns Forbidden', async () => {
    const result = await updateProperty('id-1', {}, emptyFormData())
    expect(result.error).toMatch(/Forbidden/)
  })

  it('deleteProperty returns Forbidden', async () => {
    const result = await deleteProperty('id-1')
    expect(result.error).toMatch(/Forbidden/)
  })

  it('updatePropertyStatus returns Forbidden', async () => {
    const result = await updatePropertyStatus('id-1', 'available')
    expect(result.error).toMatch(/Forbidden/)
  })
})

// ---------------------------------------------------------------------------
// landlords.ts — unauthenticated
// ---------------------------------------------------------------------------

describe('admin landlord actions — unauthenticated caller', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(makeClient(null))
  })

  it('approveLandlord returns Not authenticated', async () => {
    const result = await approveLandlord('id-1')
    expect(result.error).toBe('Not authenticated')
  })

  it('rejectLandlord returns Not authenticated', async () => {
    const result = await rejectLandlord('id-1')
    expect(result.error).toBe('Not authenticated')
  })

  it('toggleVerifiedBadge returns Not authenticated', async () => {
    const result = await toggleVerifiedBadge('id-1', true)
    expect(result.error).toBe('Not authenticated')
  })
})

// ---------------------------------------------------------------------------
// landlords.ts — authenticated but not admin
// ---------------------------------------------------------------------------

describe('admin landlord actions — non-admin caller', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(makeClient(makeUser({ role: 'authenticated' })))
  })

  it('approveLandlord returns Forbidden', async () => {
    const result = await approveLandlord('id-1')
    expect(result.error).toMatch(/Forbidden/)
  })

  it('rejectLandlord returns Forbidden', async () => {
    const result = await rejectLandlord('id-1')
    expect(result.error).toMatch(/Forbidden/)
  })

  it('toggleVerifiedBadge returns Forbidden', async () => {
    const result = await toggleVerifiedBadge('id-1', true)
    expect(result.error).toMatch(/Forbidden/)
  })
})
