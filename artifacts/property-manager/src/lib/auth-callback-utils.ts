/**
 * Pure utility for auth callback redirect logic.
 * Extracted here so it can be unit-tested without importing the React page
 * (which carries Replit cartographer JSX metadata that breaks test runners).
 */

export function getRedirectForLandlord(
  existingLandlord: { status: string } | null,
  requestedRole: string | null,
): string | null {
  if (!existingLandlord) return null
  if ((requestedRole ?? '').toLowerCase() === 'tenant') return null

  const status = existingLandlord.status
  if (status === 'not_submitted') return '/landlord/onboarding'
  if (status === 'pending')       return '/landlord/pending'
  if (status === 'rejected')      return '/landlord/rejected'
  if (status === 'suspended')     return '/landlord/suspended'
  return '/landlord'
}
