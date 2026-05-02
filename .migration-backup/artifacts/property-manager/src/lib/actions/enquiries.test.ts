/**
 * Tests for submitEnquiry (user.ts) and submitContactMessage (contact.ts).
 *
 * Strategy: mock @/lib/supabase/server so createClient returns a fake client
 * whose from() spy lets us assert DB calls without a real Supabase instance.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient, User } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Mocks — hoisted by vitest before imports
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { submitEnquiry } from './user'
import { submitContactMessage } from './contact'

const mockCreateClient = vi.mocked(createClient)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(id = 'user-1'): User {
  return { id } as unknown as User
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

/** Build a fake Supabase client with chainable query builder stubs. */
function makeClient({
  user,
  tenantRow,
  insertError,
}: {
  user: User | null
  tenantRow?: { id: string } | null
  insertError?: string
}) {
  // Chainable builder returned by .from()
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: tenantRow ?? null, error: null }),
    insert: vi.fn().mockResolvedValue({
      error: insertError ? { message: insertError } : null,
    }),
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn(() => builder),
  } as unknown as SupabaseClient
}

// ---------------------------------------------------------------------------
// submitEnquiry — unauthenticated
// ---------------------------------------------------------------------------

describe('submitEnquiry — unauthenticated', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(makeClient({ user: null }))
  })

  it('returns Not authenticated when no session', async () => {
    const fd = makeFormData({
      property_id: '00000000-0000-0000-0000-000000000001',
      message: 'I am interested in this property.',
    })
    const result = await submitEnquiry({}, fd)
    expect(result.error).toBe('Not authenticated')
  })
})

// ---------------------------------------------------------------------------
// submitEnquiry — authenticated but no tenant profile
// ---------------------------------------------------------------------------

describe('submitEnquiry — authenticated, missing tenant profile', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(makeClient({ user: makeUser(), tenantRow: null }))
  })

  it('returns Tenant profile not found', async () => {
    const fd = makeFormData({
      property_id: '00000000-0000-0000-0000-000000000001',
      message: 'I am interested in this property.',
    })
    const result = await submitEnquiry({}, fd)
    expect(result.error).toBe('Tenant profile not found')
  })
})

// ---------------------------------------------------------------------------
// submitEnquiry — validation errors
// ---------------------------------------------------------------------------

describe('submitEnquiry — validation', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(
      makeClient({ user: makeUser(), tenantRow: { id: 'tenant-1' } })
    )
  })

  it('rejects a missing property_id', async () => {
    const fd = makeFormData({ message: 'I am interested in this property.' })
    const result = await submitEnquiry({}, fd)
    expect(result.fieldErrors?.property_id).toBeDefined()
  })

  it('rejects a message shorter than 10 characters', async () => {
    const fd = makeFormData({
      property_id: '00000000-0000-0000-0000-000000000001',
      message: 'Short',
    })
    const result = await submitEnquiry({}, fd)
    expect(result.fieldErrors?.message).toBeDefined()
  })

  it('returns success for valid input', async () => {
    const fd = makeFormData({
      property_id: '00000000-0000-0000-0000-000000000001',
      message: 'I am very interested in this property, please contact me.',
    })
    const result = await submitEnquiry({}, fd)
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// submitContactMessage — validation errors
// ---------------------------------------------------------------------------

describe('submitContactMessage — validation', () => {
  beforeEach(() => {
    // contact action doesn't need auth — client is only used for the insert
    mockCreateClient.mockResolvedValue(makeClient({ user: null }))
  })

  it('rejects empty name', async () => {
    const fd = makeFormData({
      name: '',
      email: 'a@b.com',
      role: 'renter',
      subject: 'Help',
      message: 'I need some assistance please.',
    })
    const result = await submitContactMessage({}, fd)
    expect(result.fieldErrors?.name).toBeDefined()
  })

  it('rejects invalid email', async () => {
    const fd = makeFormData({
      name: 'Alice',
      email: 'not-an-email',
      role: 'renter',
      subject: 'Help',
      message: 'I need some assistance please.',
    })
    const result = await submitContactMessage({}, fd)
    expect(result.fieldErrors?.email).toBeDefined()
  })

  it('rejects message shorter than 10 characters', async () => {
    const fd = makeFormData({
      name: 'Alice',
      email: 'a@b.com',
      role: 'renter',
      subject: 'Help',
      message: 'Hi',
    })
    const result = await submitContactMessage({}, fd)
    expect(result.fieldErrors?.message).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// submitContactMessage — DB error propagation
// ---------------------------------------------------------------------------

describe('submitContactMessage — DB error', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(
      makeClient({ user: null, insertError: 'relation "contact_messages" does not exist' })
    )
  })

  it('surfaces the DB error message', async () => {
    const fd = makeFormData({
      name: 'Alice',
      email: 'a@b.com',
      role: 'renter',
      subject: 'Help',
      message: 'I need some assistance please.',
    })
    const result = await submitContactMessage({}, fd)
    expect(result.error).toMatch(/contact_messages/)
  })
})

// ---------------------------------------------------------------------------
// submitContactMessage — success
// ---------------------------------------------------------------------------

describe('submitContactMessage — success', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(makeClient({ user: null }))
  })

  it('returns success for valid input', async () => {
    const fd = makeFormData({
      name: 'Alice',
      email: 'a@b.com',
      role: 'landlord',
      subject: 'Account rejected',
      message: 'My landlord account was rejected, can you review it?',
    })
    const result = await submitContactMessage({}, fd)
    expect(result.success).toBe(true)
  })
})
