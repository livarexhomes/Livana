import { redirect } from 'next/navigation'

// Landlord self-registration is disabled. Accounts are created by admin.
export default function LandlordRegisterRedirect() {
  redirect('/login')
}
