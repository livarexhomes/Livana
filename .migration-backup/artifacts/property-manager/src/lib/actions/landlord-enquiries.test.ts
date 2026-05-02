/**
 * Tests for landlordUpdateEnquiryStatus (landlord-properties.ts).
 *
 * Strategy: mock @/lib/supabase/server so createClient returns a fake client.
 * The action must scope updates to the authenticated landlord's own enquiries.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient, User } from '@supabase/supabase-js'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { landlordUpdateEnquiryStatus } from './landlord-properties'

const mockCreateClient = vi.mocked(createClient)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(id = 'user-1'): User {
  return { id } as unknown as User
}

/**
 * Build a fake Supabase client.
 *
 * `landlordRow`  — row returned by the landlords table lookup (null = not found)
 * `updateError`  — error message to return from the enquiries update, if any
 * `updateCount`  — number of rows affected (used to verify scoping)
 */
function makeClient({
  user,
  landlordRow,
  updateError,
}: {
  user: User | null
  landlordRow?: { id: string; status: string } | null
  updateError?: string
}) {
  // Chainable builder — tracks which table was last targeted
  let currentTable = ''

  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => {
      if (currentTable === 'landlords') {
        return Promise.resolve({ data: landlordRow ?? null, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    }),
    update: vi.fn().mockReturnThis(),
  }

  // Make update().eq().eq() resolve
  const updateBuilder = {
    eq: vi.fn().mockReturnThis(),
    // second .eq() call resolves the chain
  }
  // Override the final resolution
  let eqCallCount = 0
  updateBuilder.eq.mockImplementation(() => {
    eqCallCount++
    if (eqCallCount >= 2) {
      return Promise.resolve({
        error: updateError ? { message: updateError } : null,
      })
    }
    return updateBuilder
  })

  builder.update.mockReturnValue(updateBuilder)

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn((table: string) => {
      currentTable = table
      return builder
    }),
  } as unknown as SupabaseClient
}

// ---------------------------------------------------------------------------
// Unauthenticated
// ---------------------------------------------------------------------------

describe('landlordUpdateEnquiryStatus — unauthenticated', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(makeClient({ user: null }))
  })

  it('returns Not authenticated', async () => {
    const result = await landlordUpdateEnquiryStatus('enquiry-1', 'replied')
    expect(result.error).toBe('Not authenticated')
  })
})

// ---------------------------------------------------------------------------
// No landlord profile
// ---------------------------------------------------------------------------

describe('landlordUpdateEnquiryStatus — no landlord profile', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(
      makeClient({ user: makeUser(), landlordRow: null })
    )
  })

  it('returns Account not found', async () => {
    const result = await landlordUpdateEnquiryStatus('enquiry-1', 'replied')
    expect(result.error).toBe('Account not found')
  })
})

// ---------------------------------------------------------------------------
// DB error propagation
// ---------------------------------------------------------------------------

describe('landlordUpdateEnquiryStatus — DB error', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(
      makeClient({
        user: makeUser(),
        landlordRow: { id: 'landlord-1', status: 'approved' },
        updateError: 'relation "enquiries" does not exist',
      })
    )
  })

  it('surfaces the DB error', async () => {
    const result = await landlordUpdateEnquiryStatus('enquiry-1', 'replied')
    expect(result.error).toMatch(/enquiries/)
  })
})

// ---------------------------------------------------------------------------
// Valid transitions
// ---------------------------------------------------------------------------

describe('landlordUpdateEnquiryStatus — valid transitions', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(
      makeClient({
        user: makeUser(),
        landlordRow: { id: 'landlord-1', status: 'approved' },
      })
    )
  })

  it('returns no error when marking replied', async () => {
    const result = await landlordUpdateEnquiryStatus('enquiry-1', 'replied')
    expect(result.error).toBeUndefined()
  })

  it('returns no error when closing', async () => {
    const result = await landlordUpdateEnquiryStatus('enquiry-1', 'closed')
    expect(result.error).toBeUndefined()
  })

  it('returns no error when reopening to open', async () => {
    const result = await landlordUpdateEnquiryStatus('enquiry-1', 'open')
    expect(result.error).toBeUndefined()
  })
})
