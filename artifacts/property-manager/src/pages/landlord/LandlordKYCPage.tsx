'use client'

// /landlord/kyc is superseded by /landlord/onboarding (full 3-step flow).
// Redirect any direct visits so nothing is broken.
import { useEffect } from 'react'
import { useLocation } from '@/lib/navigation'

export default function LandlordKYCPage() {
  const [, navigate] = useLocation()
  useEffect(() => { navigate('/landlord/onboarding', { replace: true }) }, [])
  return null
}
