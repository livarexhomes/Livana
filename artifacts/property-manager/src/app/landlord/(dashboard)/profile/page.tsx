export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from './ProfileForm'

export default async function LandlordProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/landlord/login')

  const { data: landlord } = await supabase
    .from('landlords')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!landlord) redirect('/landlord/register')

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Your profile</h2>
        <p className="text-xs text-gray-500 mt-0.5">Update your contact details and bio.</p>
      </div>
      <ProfileForm landlord={landlord} />
    </div>
  )
}
