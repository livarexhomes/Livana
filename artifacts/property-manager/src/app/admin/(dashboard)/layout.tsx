export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/supabase/require-admin'
import Sidebar from '@/components/admin/Sidebar'
import Navbar from '@/components/admin/Navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Defence-in-depth: middleware already blocks non-admins, but the layout
  // verifies independently so a misconfigured matcher can't bypass it.
  if (!user || !isAdminUser(user)) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar title="Dashboard" />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
