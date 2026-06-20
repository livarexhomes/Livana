import { describe, it, expect } from 'vitest'
import { getRedirectForLandlord } from './AuthCallbackPage'

describe('AuthCallback landlord redirect logic', () => {
  it('returns null (skip) when requested role is tenant even if landlord exists', () => {
    const existingLandlord = { status: 'not_submitted' }
    const redirect = getRedirectForLandlord(existingLandlord, 'tenant')
    expect(redirect).toBeNull()
  })

  it('returns landlord onboarding path when no role requested and landlord not_submitted', () => {
    const existingLandlord = { status: 'not_submitted' }
    const redirect = getRedirectForLandlord(existingLandlord, null)
    expect(redirect).toBe('/landlord/onboarding')
  })

  it('returns main landlord dashboard for active landlord', () => {
    const existingLandlord = { status: 'active' }
    const redirect = getRedirectForLandlord(existingLandlord, '')
    expect(redirect).toBe('/landlord')
  })

  it('returns null when there is no landlord record', () => {
    const redirect = getRedirectForLandlord(null, 'tenant')
    expect(redirect).toBeNull()
  })
})
