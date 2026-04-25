export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandlordPropertyForm from '@/components/ui/LandlordPropertyForm'
import { landlordUpdateProperty } from '@/lib/actions/landlord-properties'

export default async function EditLandlordListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/landlord/login')

  const { data: landlord } = await supabase
    .from('landlords')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!landlord) redirect('/landlord/register')

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('landlord_id', landlord.id) // ensure ownership
    .single()

  if (!property) notFound()

  const boundAction = landlordUpdateProperty.bind(null, id)

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Edit listing</h2>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{property.title}</p>
      </div>
      <LandlordPropertyForm
        action={boundAction}
        defaultValues={property}
        submitLabel="Save changes"
        showImageUpload={false}
      />
    </div>
  )
}
