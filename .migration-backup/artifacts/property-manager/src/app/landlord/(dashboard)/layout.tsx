export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandlordSidebar from '@/components/landlord/Sidebar'
import LandlordNavbar from '@/components/landlord/Navbar'

export default async function LandlordDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: landlord } = await supabase
    .from('landlords')
    .select('status, full_name, is_verified')
    .eq('user_id', user.id)
    .single()

  if (!landlord) redirect('/login')
  if (landlord.status === 'pending') redirect('/landlord/pending')
  if (landlord.status === 'rejected') redirect('/landlord/rejected')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar
        userName={landlord.full_name}
        userEmail={user.email}
        isVerified={landlord.is_verified}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <LandlordNavbar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
