'use client'

// /landlord/kyc is superseded by /landlord/onboarding (full 3-step flow).
// Redirect any direct visits so nothing is broken.
import { useEffect } from 'react'
import { useRouter } from '@/lib/navigation'

export default function LandlordKYCPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/landlord/onboarding') }, [router])
  return null
}
