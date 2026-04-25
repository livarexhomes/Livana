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

  if (!user) redirect('/landlord/login')

  // Check landlord profile exists and is approved
  const { data: landlord } = await supabase
    .from('landlords')
    .select('status')
    .eq('user_id', user.id)
    .single()

  if (!landlord) redirect('/landlord/register')
  if (landlord.status === 'pending') redirect('/landlord/pending')
  if (landlord.status === 'rejected') redirect('/landlord/rejected')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <LandlordNavbar title="Dashboard" />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
