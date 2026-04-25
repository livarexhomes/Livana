export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UserSidebar from '@/components/user/Sidebar'
import UserNavbar from '@/components/user/Navbar'

export default async function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/user/login')

  // Ensure a tenant profile exists
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!tenant) redirect('/user/register')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <UserSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <UserNavbar title="Dashboard" />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
