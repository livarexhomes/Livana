import { redirect } from 'next/navigation'

// Landlord login consolidated into the unified /login page.
export default function LandlordLoginRedirect() {
  redirect('/login')
}
